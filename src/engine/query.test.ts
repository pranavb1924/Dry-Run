import { describe, expect, test } from 'vitest';
import { evaluate } from './evaluate.ts';
import { prepare } from './prepare.ts';
import { createFinder } from './query.ts';
import type { Query } from './query.ts';
import { dataset, rule } from './testing.ts';

const rows = [
  { cents: 50_000, merchant: 1, category: 0, department: 0 }, // 0: approval in both
  { cents: 2_000, merchant: 0, category: 2, department: 1 }, // 1: allowed, then flagged
  { cents: 900_000, merchant: 2, category: 1, department: 1 }, // 2: blocked in both
  { cents: -4_000, merchant: 0, category: 2, department: 0 }, // 3: refund
  { cents: 2_000, merchant: 0, category: 2, department: 0 }, // 4: allowed, then flagged
];
const data = prepare(dataset(rows));
const find = createFinder(data);
const current = evaluate(data, [rule('approval', [{ kind: 'over', cents: 25_000 }]), rule('block', [{ kind: 'over', cents: 500_000 }])]);
const proposed = evaluate(data, [
  rule('approval', [{ kind: 'over', cents: 25_000 }]),
  rule('block', [{ kind: 'over', cents: 500_000 }]),
  rule('flag', [{ kind: 'merchant', names: ['Amazon'] }]),
]);

const run = (query: Partial<Query>): number[] => [...find({ view: 'all', search: '', sort: 'oldest', ...query }, current, proposed)];

describe('createFinder', () => {
  test('filters by view', () => {
    expect(run({ view: 'all' })).toEqual([0, 1, 2, 3, 4]);
    expect(run({ view: 'changed' })).toEqual([1, 4]);
    expect(run({ view: 'flagged' })).toEqual([1, 4]);
    expect(run({ view: 'approval' })).toEqual([0]);
    expect(run({ view: 'blocked' })).toEqual([2]);
  });

  test('searches merchant, cardholder, department and category names, ignoring case', () => {
    expect(run({ search: 'HILTON' })).toEqual([2]);
    expect(run({ search: 'cardholder 1' })).toEqual([1, 2]);
    expect(run({ search: 'correct' })).toEqual([0, 3, 4]);
    expect(run({ search: 'airfare' })).toEqual([0]);
    expect(run({ search: '  ' })).toEqual([0, 1, 2, 3, 4]);
  });

  test('sorts by date or amount, either way', () => {
    expect(run({ sort: 'newest' })).toEqual([4, 3, 2, 1, 0]);
    expect(run({ sort: 'largest' })).toEqual([2, 0, 4, 1, 3]);
    expect(run({ sort: 'smallest' })).toEqual([3, 1, 4, 0, 2]);
  });

  test('combines view, search and sort', () => {
    expect(run({ view: 'flagged', search: 'amazon', sort: 'newest' })).toEqual([4, 1]);
  });
});
