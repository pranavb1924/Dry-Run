import { describe, expect, test } from 'vitest';
import { evaluate } from './evaluate.ts';
import { prepare } from './prepare.ts';
import { compare, summarize } from './stats.ts';
import { dataset, rule } from './testing.ts';

const rows = [
  { cents: 30_000, day: 0, category: 0, department: 0 }, // department approval, week 0
  { cents: 40_000, day: 1, category: 0, department: 0 }, // department approval, week 0
  { cents: 50_000, day: 8, category: 1, department: 1 }, // department approval, week 1
  { cents: 900_000, day: 8, category: 1, department: 1 }, // blocked
  { cents: 2_000, day: 20, category: 2, described: false }, // flagged
  { cents: 1_000, day: 30, category: 2 }, // allowed
  { cents: -3_000, day: 31, category: 2 }, // refund, allowed
];
const policy = [
  rule('approval', [{ kind: 'over', cents: 25_000 }]),
  rule('block', [{ kind: 'over', cents: 500_000 }]),
  rule('flag', [{ kind: 'noDescription' }]),
];

describe('summarize', () => {
  const data = prepare(dataset(rows));
  const stats = summarize(data, evaluate(data, policy));

  test('counts transactions and spend at each level, leaving refunds out of spend', () => {
    expect([...stats.count]).toEqual([2, 1, 3, 0, 1]);
    expect([...stats.spend]).toEqual([1_000, 2_000, 120_000, 0, 900_000]);
  });

  test('counts approvals per week and per department', () => {
    expect(stats.weeklyApprovals.slice(0, 3)).toEqual(Float64Array.of(2, 1, 0));
    expect([...stats.departmentApprovals]).toEqual([2, 1]);
    expect([...stats.departmentPeak]).toEqual([2, 1]);
  });

  test('adds up controlled spend by category', () => {
    expect([...stats.categorySpend]).toEqual([70_000, 950_000, 2_000]);
  });

  test('counts cardholders held for approval or blocked, not those only flagged', () => {
    expect(stats.cardholdersAffected).toBe(2);
  });
});

describe('compare', () => {
  test('counts what got stricter and what got less strict', () => {
    const data = prepare(dataset(rows));
    const before = evaluate(data, policy);
    const after = evaluate(data, [rule('flag', [{ kind: 'over', cents: 35_000 }])]);
    // The approvals and the block become flags or nothing, and the undescribed purchase is no longer flagged.
    expect(compare(data, before, after)).toEqual({ stricter: 0, stricterSpend: 0, looser: 5, looserSpend: 1_022_000 });
    expect(compare(data, after, before)).toEqual({ stricter: 5, stricterSpend: 1_022_000, looser: 0, looserSpend: 0 });
  });
});
