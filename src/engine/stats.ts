// Turns an evaluation into the numbers the impact panel shows: how much spend
// a policy controls, and how much work it creates for approvers, per week and
// per department.

import { NO_RULE } from './evaluate.ts';
import type { Evaluation } from './evaluate.ts';
import { MAX_RULES } from './policy.ts';
import { WEEKS } from './prepare.ts';
import type { EngineData } from './prepare.ts';

export interface Stats {
  /** Transactions at each level: 0 = allowed, 1 = flagged, 2 = department approval, 3 = finance approval, 4 = blocked. */
  readonly count: Float64Array;
  /** Spend at each level, in cents. Refunds are left out. */
  readonly spend: Float64Array;
  /** Department and finance approvals in each week of the year. */
  readonly weeklyApprovals: Float64Array;
  /** Department approvals each department gets over the year. */
  readonly departmentApprovals: Float64Array;
  /** Department approvals each department gets in its busiest week. */
  readonly departmentPeak: Float64Array;
  /** Spend flagged, held for approval or blocked, by category, in cents. */
  readonly categorySpend: Float64Array;
  /** Cardholders with at least one purchase held for approval or blocked. */
  readonly cardholdersAffected: number;
  /** For each rule position, the transactions it decided and their spend in cents. */
  readonly ruleCount: Float64Array;
  readonly ruleSpend: Float64Array;
}

export function summarize(data: EngineData, evaluation: Evaluation): Stats {
  const { dataset, week, agency } = data;
  const t = dataset.transactions;
  const departments = dataset.agencies.length;
  const count = new Float64Array(5);
  const spend = new Float64Array(5);
  const weeklyApprovals = new Float64Array(WEEKS);
  const departmentWeekly = new Float64Array(departments * WEEKS);
  const categorySpend = new Float64Array(dataset.categories.length);
  const affected = new Uint8Array(dataset.cardholders.length);
  const ruleCount = new Float64Array(MAX_RULES);
  const ruleSpend = new Float64Array(MAX_RULES);
  const { level, rule } = evaluation;

  for (let i = 0; i < t.count; i++) {
    const l = level[i]!;
    const amount = t.amountCents[i]!;
    count[l]!++;
    if (amount > 0) {
      spend[l]! += amount;
    }
    if (l === 0) {
      continue;
    }
    const r = rule[i]!;
    if (r !== NO_RULE) {
      ruleCount[r]!++;
      ruleSpend[r]! += amount;
    }
    categorySpend[t.category[i]!]! += amount;
    if (l >= 2) {
      affected[t.cardholder[i]!] = 1;
    }
    if (l === 2 || l === 3) {
      weeklyApprovals[week[i]!]!++;
    }
    if (l === 2) {
      departmentWeekly[agency[i]! * WEEKS + week[i]!]!++;
    }
  }

  const departmentApprovals = new Float64Array(departments);
  const departmentPeak = new Float64Array(departments);
  for (let d = 0; d < departments; d++) {
    for (let w = 0; w < WEEKS; w++) {
      const n = departmentWeekly[d * WEEKS + w]!;
      departmentApprovals[d]! += n;
      departmentPeak[d] = Math.max(departmentPeak[d]!, n);
    }
  }

  let cardholdersAffected = 0;
  for (const a of affected) {
    cardholdersAffected += a;
  }

  return {
    count,
    spend,
    weeklyApprovals,
    departmentApprovals,
    departmentPeak,
    categorySpend,
    cardholdersAffected,
    ruleCount,
    ruleSpend,
  };
}

export interface Change {
  /** Transactions whose outcome got stricter, and their spend in cents. */
  readonly stricter: number;
  readonly stricterSpend: number;
  /** Transactions whose outcome got less strict, and their spend in cents. */
  readonly looser: number;
  readonly looserSpend: number;
}

export function compare(data: EngineData, before: Evaluation, after: Evaluation): Change {
  const amounts = data.dataset.transactions.amountCents;
  const { purchases } = data;
  let stricter = 0;
  let stricterSpend = 0;
  let looser = 0;
  let looserSpend = 0;
  for (let k = 0; k < purchases.length; k++) {
    const i = purchases[k]!;
    const a = before.level[i]!;
    const b = after.level[i]!;
    if (b > a) {
      stricter++;
      stricterSpend += amounts[i]!;
    } else if (b < a) {
      looser++;
      looserSpend += amounts[i]!;
    }
  }
  return { stricter, stricterSpend, looser, looserSpend };
}
