// The headline numbers, computed the same way everywhere they appear.

import type { EngineData } from '../engine/prepare.ts';
import type { Stats } from '../engine/stats.ts';

/** Spend flagged, held for approval or blocked, in cents. */
export function controlledSpend(stats: Stats): number {
  return stats.spend[1]! + stats.spend[2]! + stats.spend[3]! + stats.spend[4]!;
}

/** All spend, refunds left out, in cents. */
export function totalSpend(stats: Stats): number {
  return stats.spend.reduce((sum, value) => sum + value, 0);
}

/** Department and finance approvals over the year. */
export function approvals(stats: Stats): number {
  return stats.count[2]! + stats.count[3]!;
}

/** The department with the most department approvals, if any. */
export function busiestDepartment(stats: Stats): { readonly index: number; readonly total: number; readonly peak: number } | null {
  let index = -1;
  let total = 0;
  stats.departmentApprovals.forEach((value, i) => {
    if (value > total) {
      total = value;
      index = i;
    }
  });
  return index === -1 ? null : { index, total, peak: stats.departmentPeak[index]! };
}

export interface Totals {
  /** Yearly spend in cents, refunds left out, by id. */
  readonly categories: Float64Array;
  readonly merchants: Float64Array;
  readonly agencies: Float64Array;
}

export function computeTotals(data: EngineData): Totals {
  const { dataset, agency } = data;
  const t = dataset.transactions;
  const categories = new Float64Array(dataset.categories.length);
  const merchants = new Float64Array(dataset.merchants.length);
  const agencies = new Float64Array(dataset.agencies.length);
  for (let i = 0; i < t.count; i++) {
    const amount = t.amountCents[i]!;
    if (amount > 0) {
      categories[t.category[i]!]! += amount;
      merchants[t.merchant[i]!]! += amount;
      agencies[agency[i]!]! += amount;
    }
  }
  return { categories, merchants, agencies };
}
