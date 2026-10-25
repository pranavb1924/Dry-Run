// Builds the app's data file from the raw files in data/raw/: the year's
// transactions, with merchant names cleaned, spend categories assigned and
// cardholders given made-up names, written to public/data/.
//
//   npm run data:download   (once)
//   npm run data:import

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { encodeDataset } from '../src/data/format.ts';
import type { Dataset } from '../src/engine/types.ts';
import { agencyName } from './agencies.ts';
import { CATEGORIES, categorize } from './categories.ts';
import { cleanMerchant } from './merchants.ts';
import { fakeNames } from './names.ts';
import { parseFile } from './parse.ts';
import type { SourceRow } from './parse.ts';
import { SOURCES } from './sources.ts';

// The year is defined by purchase date: Oklahoma's fiscal year 2026.
const FIRST_DAY = '2025-07-01';
const LAST_DAY = '2026-06-30';
const GENERIC_DESCRIPTION = 'GENERAL PURCHASE';
const ROOT = join(import.meta.dirname, '..');
const OUTPUT = join(ROOT, 'public', 'data', 'transactions.bin');

// 1. Read every file and keep the year's transactions, oldest first.
const rows: SourceRow[] = [];
for (const source of SOURCES) {
  const text = readFileSync(join(ROOT, 'data', 'raw', `${source.month}.csv`), 'utf8');
  let parsed: SourceRow[];
  try {
    parsed = parseFile(text);
  } catch (error) {
    throw new Error(`${source.month}.csv, ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  for (const row of parsed) {
    if (row.purchaseDate >= FIRST_DAY && row.purchaseDate <= LAST_DAY) {
      rows.push(row);
    }
  }
}
// Array.prototype.sort is stable, so same-day rows keep the state's order.
rows.sort((a, b) => (a.purchaseDate < b.purchaseDate ? -1 : a.purchaseDate > b.purchaseDate ? 1 : 0));

// 2. Turn text into small numbers, keeping each distinct value once.
const agencies = lookup();
const merchants = lookup();
const mccs = lookup();
const cardholderIds = new Map<string, number>();
const people: { lastName: string; firstInitial: string; agency: number }[] = [];
const cleaned = new Map<string, string>();

const count = rows.length;
const t = {
  count,
  day: new Uint16Array(count),
  weekday: new Uint8Array(count),
  cardholder: new Uint16Array(count),
  merchant: new Uint16Array(count),
  category: new Uint8Array(count),
  mcc: new Uint16Array(count),
  amountCents: new Int32Array(count),
  described: new Uint8Array(count),
};
const firstDay = Date.parse(FIRST_DAY);

rows.forEach((row, i) => {
  const date = Date.parse(row.purchaseDate);
  t.day[i] = (date - firstDay) / 86_400_000;
  t.weekday[i] = new Date(date).getUTCDay();

  const agency = agencies.id(`${row.agencyNumber}|${row.agencyName}`);
  const key = `${row.agencyNumber}|${row.lastName}|${row.firstInitial}`;
  let cardholder = cardholderIds.get(key);
  if (cardholder === undefined) {
    cardholder = people.length;
    cardholderIds.set(key, cardholder);
    people.push({ lastName: row.lastName, firstInitial: row.firstInitial, agency });
  }
  t.cardholder[i] = cardholder;

  let merchant = cleaned.get(row.merchant);
  if (merchant === undefined) {
    merchant = cleanMerchant(row.merchant);
    cleaned.set(row.merchant, merchant);
  }
  t.merchant[i] = merchants.id(merchant);

  t.mcc[i] = mccs.id(row.mcc);
  t.category[i] = CATEGORIES.indexOf(categorize(row.mcc));
  t.amountCents[i] = row.amountCents;
  t.described[i] = row.description.toUpperCase() === GENERIC_DESCRIPTION ? 0 : 1;
});

// 3. Check everything fits the column types before writing.
const limits: [string, number, number][] = [
  ['cardholders', people.length, 0xffff],
  ['merchants', merchants.values.length, 0xffff],
  ['merchant categories', mccs.values.length, 0xffff],
  ['agencies', agencies.values.length, 0xff],
];
for (const [name, size, max] of limits) {
  if (size > max) {
    throw new Error(`${size} ${name} don't fit in the data file (at most ${max})`);
  }
}

const names = fakeNames(people);
const dataset: Dataset = {
  transactions: t,
  cardholders: people.map((person, i) => ({ name: names[i] ?? '', agency: person.agency })),
  agencies: agencies.values.map((value) => agencyName(value.split('|')[1] ?? '')),
  merchants: merchants.values,
  categories: [...CATEGORIES],
  mccs: mccs.values,
};

// 4. Write the file, compressed: the columns repeat a lot, so gzip shrinks them well.
const bytes = encodeDataset(dataset);
const compressed = gzipSync(bytes, { level: 9 });
mkdirSync(join(ROOT, 'public', 'data'), { recursive: true });
writeFileSync(OUTPUT, compressed);

// 5. Print a summary to check against the profile.
let spent = 0;
let refunded = 0;
for (const cents of t.amountCents) {
  if (cents > 0) spent += cents;
  else refunded += cents;
}
const dollars = (cents: number): string => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
console.log(`${count.toLocaleString()} transactions from ${FIRST_DAY} to ${LAST_DAY}`);
console.log(`  spent ${dollars(spent)}, refunded ${dollars(-refunded)}`);
console.log(`  ${agencies.values.length} agencies, ${people.length.toLocaleString()} cardholders`);
console.log(`  ${merchants.values.length.toLocaleString()} merchants, cleaned from ${cleaned.size.toLocaleString()} raw names`);
console.log(`  ${mccs.values.length} merchant categories in ${CATEGORIES.length} spend groups`);
console.log(`wrote ${OUTPUT}: ${(compressed.length / 1e6).toFixed(1)} MB (${(bytes.length / 1e6).toFixed(1)} MB uncompressed)`);

/** Assigns each distinct string a number, in order of first appearance. */
function lookup(): { id: (value: string) => number; values: string[] } {
  const ids = new Map<string, number>();
  const values: string[] = [];
  return {
    id(value) {
      let id = ids.get(value);
      if (id === undefined) {
        id = values.length;
        ids.set(value, id);
        values.push(value);
      }
      return id;
    },
    values,
  };
}
