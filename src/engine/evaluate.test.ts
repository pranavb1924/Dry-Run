import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { evaluate, NO_RULE } from './evaluate.ts';
import { explain } from './explain.ts';
import { ACTIONS, levelOf } from './policy.ts';
import type { Condition, Policy } from './policy.ts';
import { prepare } from './prepare.ts';
import { CATEGORIES, dataset, DEPARTMENTS, MERCHANTS, rule } from './testing.ts';
import type { Row } from './testing.ts';

function levels(rows: readonly Row[], policy: Policy): number[] {
  return [...evaluate(prepare(dataset(rows)), policy).level];
}

describe('evaluate', () => {
  test('applies a rule only when every condition matches', () => {
    const policy = [rule('approval', [{ kind: 'over', cents: 10_000 }, { kind: 'category', names: ['Airfare'] }])];
    const rows = [
      { cents: 20_000, category: 0 }, // both match
      { cents: 5_000, category: 0 }, // too small
      { cents: 20_000, category: 1 }, // wrong category
    ];
    expect(levels(rows, policy)).toEqual([2, 0, 0]);
  });

  test('treats "over" and "under" as strictly greater and strictly less', () => {
    const rows = [{ cents: 9_999 }, { cents: 10_000 }, { cents: 10_001 }];
    expect(levels(rows, [rule('flag', [{ kind: 'over', cents: 10_000 }])])).toEqual([0, 0, 1]);
    expect(levels(rows, [rule('flag', [{ kind: 'under', cents: 10_000 }])])).toEqual([1, 0, 0]);
  });

  test('matches any of the names in a category, merchant or department condition', () => {
    const rows = [
      { cents: 100, category: 0, merchant: 0, department: 0 },
      { cents: 100, category: 1, merchant: 1, department: 1 },
      { cents: 100, category: 2, merchant: 2, department: 0 },
    ];
    expect(levels(rows, [rule('flag', [{ kind: 'category', names: ['Airfare', 'Lodging'] }])])).toEqual([1, 1, 0]);
    expect(levels(rows, [rule('flag', [{ kind: 'merchant', names: ['Hilton'] }])])).toEqual([0, 0, 1]);
    expect(levels(rows, [rule('flag', [{ kind: 'department', names: ['Health'] }])])).toEqual([0, 1, 0]);
  });

  test('matches weekend purchases on Saturday and Sunday only', () => {
    const rows = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ cents: 100, weekday }));
    expect(levels(rows, [rule('flag', [{ kind: 'weekend' }])])).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });

  test('matches purchases without a description', () => {
    const rows = [{ cents: 100, described: true }, { cents: 100, described: false }];
    expect(levels(rows, [rule('flag', [{ kind: 'noDescription' }])])).toEqual([0, 1]);
  });

  test('never matches refunds', () => {
    const rows = [{ cents: -5_000 }, { cents: 0 }, { cents: 1 }];
    expect(levels(rows, [rule('block', [])])).toEqual([0, 0, 4]);
  });

  test('gives the strictest action, and names the earlier rule when two tie', () => {
    const data = prepare(dataset([{ cents: 50_000 }]));
    const policy = [
      rule('flag', []),
      rule('finance', [{ kind: 'over', cents: 10_000 }]),
      rule('finance', []),
      rule('approval', []),
    ];
    const result = evaluate(data, policy);
    expect(result.level[0]).toBe(3);
    expect(result.rule[0]).toBe(1);
  });

  test('ignores disabled rules', () => {
    expect(levels([{ cents: 100 }], [rule('block', [], { enabled: false })])).toEqual([0]);
  });

  test('treats names that are not in the data as matching nothing', () => {
    expect(levels([{ cents: 100 }], [rule('block', [{ kind: 'merchant', names: ['Nowhere Inc'] }])])).toEqual([0]);
  });

  test('requires two conditions of the same kind to both hold', () => {
    const policy = [
      rule('flag', [
        { kind: 'category', names: ['Airfare', 'Lodging'] },
        { kind: 'category', names: ['Lodging', 'Online & retail'] },
      ]),
    ];
    expect(levels([{ cents: 100, category: 0 }, { cents: 100, category: 1 }], policy)).toEqual([0, 1]);
  });

  test('marks transactions no rule applies to', () => {
    expect(evaluate(prepare(dataset([{ cents: 100 }])), []).rule[0]).toBe(NO_RULE);
  });
});

// Property tests: fast-check generates thousands of random datasets and
// policies and checks rules that must always hold.

const rowArb = fc.record({
  cents: fc.integer({ min: -50_000, max: 500_000 }),
  day: fc.integer({ min: 0, max: 364 }),
  weekday: fc.integer({ min: 0, max: 6 }),
  category: fc.integer({ min: 0, max: CATEGORIES.length - 1 }),
  merchant: fc.integer({ min: 0, max: MERCHANTS.length - 1 }),
  department: fc.integer({ min: 0, max: DEPARTMENTS.length - 1 }),
  described: fc.boolean(),
});

const namesArb = (names: readonly string[]) =>
  fc.uniqueArray(fc.oneof(fc.constantFrom(...names), fc.constant('Not in the data')), { maxLength: 3 });

const conditionArb: fc.Arbitrary<Condition> = fc.oneof(
  fc.record({ kind: fc.constant('over' as const), cents: fc.integer({ min: 0, max: 400_000 }) }),
  fc.record({ kind: fc.constant('under' as const), cents: fc.integer({ min: 0, max: 400_000 }) }),
  fc.record({ kind: fc.constant('category' as const), names: namesArb(CATEGORIES) }),
  fc.record({ kind: fc.constant('merchant' as const), names: namesArb(MERCHANTS) }),
  fc.record({ kind: fc.constant('department' as const), names: namesArb(DEPARTMENTS) }),
  fc.constant({ kind: 'weekend' as const }),
  fc.constant({ kind: 'noDescription' as const }),
);

const ruleArb = fc
  .record({
    action: fc.constantFrom(...ACTIONS),
    conditions: fc.array(conditionArb, { maxLength: 3 }),
    enabled: fc.boolean(),
  })
  .map(({ action, conditions, enabled }) => rule(action, conditions, { enabled }));

const policyArb = fc.array(ruleArb, { maxLength: 6 });
const rowsArb = fc.array(rowArb, { minLength: 1, maxLength: 40 });

/** The obvious, slow way: check every rule against every transaction. */
function oracle(rows: readonly Row[], policy: Policy): { level: number; rule: number }[] {
  return rows.map((row) => {
    let best = { level: 0, rule: NO_RULE };
    policy.forEach((r, position) => {
      const applies =
        r.enabled &&
        row.cents > 0 &&
        r.conditions.every((c) => {
          switch (c.kind) {
            case 'over':
              return row.cents > c.cents;
            case 'under':
              return row.cents < c.cents;
            case 'category':
              return c.names.includes(CATEGORIES[row.category ?? 0]!);
            case 'merchant':
              return c.names.includes(MERCHANTS[row.merchant ?? 0]!);
            case 'department':
              return c.names.includes(DEPARTMENTS[row.department ?? 0]!);
            case 'weekend':
              return row.weekday === 0 || row.weekday === 6;
            case 'noDescription':
              return row.described === false;
          }
        });
      if (applies && levelOf(r.action) > best.level) {
        best = { level: levelOf(r.action), rule: position };
      }
    });
    return best;
  });
}

describe('evaluate, on random data and policies', () => {
  test('agrees with checking every rule against every transaction', () => {
    fc.assert(
      fc.property(rowsArb, policyArb, (rows, policy) => {
        const result = evaluate(prepare(dataset(rows)), policy);
        const expected = oracle(rows, policy);
        expect([...result.level]).toEqual(expected.map((e) => e.level));
        expect([...result.rule]).toEqual(expected.map((e) => e.rule));
      }),
      { numRuns: 2_000 },
    );
  });

  test('gives the same outcomes whatever order the rules are in', () => {
    fc.assert(
      fc.property(
        rowsArb,
        policyArb.chain((policy) =>
          fc.tuple(fc.constant(policy), fc.shuffledSubarray(policy, { minLength: policy.length, maxLength: policy.length })),
        ),
        (rows, [policy, shuffled]) => {
          expect(levels(rows, shuffled)).toEqual(levels(rows, policy));
        },
      ),
    );
  });

  test('never makes anything less strict when a rule is added', () => {
    fc.assert(
      fc.property(rowsArb, policyArb, ruleArb, (rows, policy, extra) => {
        const before = levels(rows, policy);
        const after = levels(rows, [...policy, extra]);
        after.forEach((level, i) => expect(level).toBeGreaterThanOrEqual(before[i]!));
      }),
    );
  });

  test('agrees with the explanation shown for each transaction', () => {
    fc.assert(
      fc.property(rowsArb, policyArb, (rows, policy) => {
        const data = prepare(dataset(rows));
        const result = evaluate(data, policy);
        rows.forEach((_, i) => {
          const applying = explain(data, policy, i).filter((check) => check.applies);
          const strictest = Math.max(0, ...applying.map((check) => levelOf(check.rule.action)));
          expect(result.level[i]).toBe(strictest);
        });
      }),
    );
  });
});
