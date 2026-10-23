// Everything the engine derives from the dataset once, when it loads, so that
// evaluating a policy only does the work that depends on the policy.

import type { Dataset } from './types.ts';

/** The year is 365 days: 52 weeks and a day. Day 364 is counted in week 51. */
export const WEEKS = 52;
export const WEEKS_IN_YEAR = 365 / 7;

export interface EngineData {
  readonly dataset: Dataset;
  /** The cardholder's department, for each transaction. */
  readonly agency: Uint8Array;
  /** The week of the year, 0 to 51, for each transaction. */
  readonly week: Uint8Array;
  /** Every transaction with a positive amount. Refunds never match a rule. */
  readonly purchases: Uint32Array;
  readonly categoryIds: ReadonlyMap<string, number>;
  readonly merchantIds: ReadonlyMap<string, number>;
  readonly agencyIds: ReadonlyMap<string, number>;
}

export function prepare(dataset: Dataset): EngineData {
  const t = dataset.transactions;
  const agency = new Uint8Array(t.count);
  const week = new Uint8Array(t.count);
  const purchases = new Uint32Array(t.count);
  let purchaseCount = 0;

  for (let i = 0; i < t.count; i++) {
    // Indexes in these loops are always in range; `!` tells TypeScript so, at no cost.
    agency[i] = dataset.cardholders[t.cardholder[i]!]!.agency;
    week[i] = Math.min(WEEKS - 1, Math.floor(t.day[i]! / 7));
    if (t.amountCents[i]! > 0) {
      purchases[purchaseCount++] = i;
    }
  }

  return {
    dataset,
    agency,
    week,
    purchases: purchases.slice(0, purchaseCount),
    categoryIds: indexOf(dataset.categories),
    merchantIds: indexOf(dataset.merchants),
    agencyIds: indexOf(dataset.agencies),
  };
}

function indexOf(names: readonly string[]): Map<string, number> {
  return new Map(names.map((name, i) => [name, i]));
}
