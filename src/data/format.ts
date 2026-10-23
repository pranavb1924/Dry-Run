// The data file the app loads: one year of transactions, stored column by
// column so the browser can use the bytes directly as typed arrays, with no
// parsing step.
//
//   "DRY1"          4 bytes that identify the file
//   header length   4 bytes, little-endian
//   header          JSON: the row count, the lookup tables, and where each
//                   column starts
//   columns         each starting at a multiple of 4 bytes, as typed arrays need
//
// Typed arrays read numbers in the computer's own byte order. Every browser
// and Node runs on little-endian hardware, which is the order the file uses.

import type { Dataset, Transactions } from '../engine/types.ts';

const MAGIC = 'DRY1';

type Column = Exclude<keyof Transactions, 'count'>;

interface Header {
  readonly count: number;
  /** Byte offset of each column, counted from the start of the columns. */
  readonly columns: Readonly<Record<Column, number>>;
  readonly cardholders: readonly (readonly [name: string, agency: number])[];
  readonly agencies: readonly string[];
  readonly merchants: readonly string[];
  readonly categories: readonly string[];
  readonly mccs: readonly string[];
}

const COLUMNS: readonly Column[] = ['day', 'weekday', 'cardholder', 'merchant', 'category', 'mcc', 'amountCents', 'described'];

export function encodeDataset(data: Dataset): Uint8Array {
  const t = data.transactions;
  const offsets = {} as Record<Column, number>;
  let size = 0;
  for (const column of COLUMNS) {
    offsets[column] = size;
    size = align(size + t[column].byteLength);
  }

  const header: Header = {
    count: t.count,
    columns: offsets,
    cardholders: data.cardholders.map((c) => [c.name, c.agency] as const),
    agencies: data.agencies,
    merchants: data.merchants,
    categories: data.categories,
    mccs: data.mccs,
  };
  const json = new TextEncoder().encode(JSON.stringify(header));
  const base = align(8 + json.length);

  const bytes = new Uint8Array(base + size);
  bytes.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(bytes.buffer).setUint32(4, json.length, true);
  bytes.set(json, 8);
  for (const column of COLUMNS) {
    const array = t[column];
    bytes.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), base + offsets[column]);
  }
  return bytes;
}

/** Reads a data file. The typed arrays share the buffer; nothing is copied. */
export function decodeDataset(buffer: ArrayBuffer): Dataset {
  const bytes = new Uint8Array(buffer);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) {
    throw new Error('Not a Dry Run data file');
  }
  const length = new DataView(buffer).getUint32(4, true);
  // Our own file, written by encodeDataset, so the header is trusted.
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as Header;
  const base = align(8 + length);
  const { count, columns } = header;

  return {
    transactions: {
      count,
      day: new Uint16Array(buffer, base + columns.day, count),
      weekday: new Uint8Array(buffer, base + columns.weekday, count),
      cardholder: new Uint16Array(buffer, base + columns.cardholder, count),
      merchant: new Uint16Array(buffer, base + columns.merchant, count),
      category: new Uint8Array(buffer, base + columns.category, count),
      mcc: new Uint16Array(buffer, base + columns.mcc, count),
      amountCents: new Int32Array(buffer, base + columns.amountCents, count),
      described: new Uint8Array(buffer, base + columns.described, count),
    },
    cardholders: header.cardholders.map(([name, agency]) => ({ name, agency })),
    agencies: header.agencies,
    merchants: header.merchants,
    categories: header.categories,
    mccs: header.mccs,
  };
}

function align(n: number): number {
  return Math.ceil(n / 4) * 4;
}
