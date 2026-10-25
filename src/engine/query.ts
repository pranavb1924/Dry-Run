// Finds the transactions the table shows: one view (all, changed, flagged,
// …), an optional search, and a sort order, returned as a list of
// transaction indexes. The table then only reads the rows on screen.
//
// Sorting 416,939 rows on every keystroke would be slow, so each order is
// computed once and filtering walks it, keeping the matches in order.

import type { Evaluation } from './evaluate.ts';
import type { EngineData } from './prepare.ts';

export const VIEWS = ['all', 'changed', 'flagged', 'approval', 'blocked'] as const;
export type View = (typeof VIEWS)[number];

export const SORTS = ['newest', 'oldest', 'largest', 'smallest'] as const;
export type Sort = (typeof SORTS)[number];

export interface Query {
  readonly view: View;
  readonly search: string;
  readonly sort: Sort;
}

export type Finder = (query: Query, current: Evaluation, proposed: Evaluation) => Uint32Array;

export function createFinder(data: EngineData): Finder {
  const { dataset } = data;
  const t = dataset.transactions;
  const lower = {
    merchants: dataset.merchants.map((name) => name.toLowerCase()),
    cardholders: dataset.cardholders.map((c) => c.name.toLowerCase()),
    agencies: dataset.agencies.map((name) => name.toLowerCase()),
    categories: dataset.categories.map((name) => name.toLowerCase()),
  };
  const result = new Uint32Array(t.count);
  let byAmount: Uint32Array | null = null;

  return (query, current, proposed) => {
    const keep = viewTest(query.view, current, proposed);
    const search = searchTest(query.search, data, lower);
    const order = query.sort === 'largest' || query.sort === 'smallest' ? (byAmount ??= sortByAmount(data)) : null;
    const backwards = query.sort === 'newest' || query.sort === 'largest';

    let n = 0;
    for (let k = 0; k < t.count; k++) {
      const position = backwards ? t.count - 1 - k : k;
      const i = order === null ? position : order[position]!;
      if (keep(i) && search(i)) {
        result[n++] = i;
      }
    }
    return result.slice(0, n);
  };
}

function viewTest(view: View, current: Evaluation, proposed: Evaluation): (i: number) => boolean {
  const before = current.level;
  const after = proposed.level;
  switch (view) {
    case 'all':
      return () => true;
    case 'changed':
      return (i) => before[i] !== after[i];
    case 'flagged':
      return (i) => after[i] === 1;
    case 'approval':
      return (i) => after[i] === 2 || after[i] === 3;
    case 'blocked':
      return (i) => after[i] === 4;
  }
}

/** Matches a merchant, cardholder, department or category name containing the text. */
function searchTest(
  text: string,
  data: EngineData,
  lower: Readonly<Record<'merchants' | 'cardholders' | 'agencies' | 'categories', readonly string[]>>,
): (i: number) => boolean {
  const needle = text.trim().toLowerCase();
  if (needle === '') {
    return () => true;
  }
  // Test each distinct name once, then each row is four table reads.
  const table = (names: readonly string[]): Uint8Array => Uint8Array.from(names, (name) => (name.includes(needle) ? 1 : 0));
  const merchants = table(lower.merchants);
  const cardholders = table(lower.cardholders);
  const agencies = table(lower.agencies);
  const categories = table(lower.categories);
  const t = data.dataset.transactions;
  return (i) =>
    merchants[t.merchant[i]!] === 1 ||
    cardholders[t.cardholder[i]!] === 1 ||
    agencies[data.agency[i]!] === 1 ||
    categories[t.category[i]!] === 1;
}

/**
 * Transaction indexes from the smallest amount to the largest, equal amounts
 * oldest first. Each pair is packed into one number (amount, then index) so
 * the built-in numeric sort does all the work, which is far faster than
 * sorting with a comparison function.
 */
function sortByAmount(data: EngineData): Uint32Array {
  const amounts = data.dataset.transactions.amountCents;
  const SHIFT = 2 ** 20; // more than the number of transactions
  let min = 0;
  for (const a of amounts) {
    min = Math.min(min, a);
  }
  const keys = Float64Array.from(amounts, (a, i) => (a - min) * SHIFT + i);
  keys.sort();
  return Uint32Array.from(keys, (key) => key % SHIFT);
}
