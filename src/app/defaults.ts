// The policies the page opens with, and the scenarios it suggests.
//
// The state doesn't publish its card rules in a form the engine can run, so
// "current" is an example policy, typical of a public-sector card program.
// "Proposed" adds one rule, so the first screen already shows a trade-off.

import type { Action, Condition, Policy, Rule } from '../engine/policy.ts';

export interface Policies {
  readonly current: Policy;
  readonly proposed: Policy;
}

function rule(id: string, name: string, action: Action, conditions: readonly Condition[]): Rule {
  return { id, name, enabled: true, action, conditions };
}

const TRAVEL_CATEGORIES = ['Airfare', 'Lodging'];

export const CURRENT_POLICY: Policy = [
  rule('large', 'Large purchases', 'finance', [{ kind: 'over', cents: 500_000 }]),
  rule('travel', 'Travel', 'approval', [
    { kind: 'category', names: TRAVEL_CATEGORIES },
    { kind: 'over', cents: 150_000 },
  ]),
  rule('undescribed', 'Missing description', 'flag', [{ kind: 'noDescription' }, { kind: 'over', cents: 100_000 }]),
  rule('weekend', 'Weekend purchases', 'flag', [{ kind: 'weekend' }, { kind: 'over', cents: 50_000 }]),
];

export interface Scenario {
  readonly id: string;
  readonly label: string;
  readonly apply: (current: Policy) => Policy;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'approve-2500',
    label: 'Approve everything over $2,500',
    apply: (current) => [...current, rule('over-2500', 'Purchases over $2,500', 'approval', [{ kind: 'over', cents: 250_000 }])],
  },
  {
    id: 'travel-500',
    label: 'Lower the travel limit to $500',
    apply: (current) =>
      current.map((r) =>
        r.id === 'travel'
          ? { ...r, conditions: [{ kind: 'category', names: TRAVEL_CATEGORIES }, { kind: 'over', cents: 50_000 }] }
          : r,
      ),
  },
  {
    id: 'describe-250',
    label: 'Approve undescribed purchases over $250',
    apply: (current) => [
      ...current,
      rule('undescribed-250', 'Undescribed over $250', 'approval', [{ kind: 'noDescription' }, { kind: 'over', cents: 25_000 }]),
    ],
  },
  {
    id: 'amazon-1000',
    label: 'Approve Amazon orders over $1,000',
    apply: (current) => [
      ...current,
      rule('amazon', 'Large Amazon orders', 'approval', [
        { kind: 'merchant', names: ['Amazon'] },
        { kind: 'over', cents: 100_000 },
      ]),
    ],
  },
  {
    id: 'food-block',
    label: 'Block food & dining over $500',
    apply: (current) => [
      ...current,
      rule('food', 'Food & dining cap', 'block', [
        { kind: 'category', names: ['Food & dining'] },
        { kind: 'over', cents: 50_000 },
      ]),
    ],
  },
  {
    id: 'no-weekend',
    label: 'Stop flagging weekend purchases',
    apply: (current) => current.filter((r) => r.id !== 'weekend'),
  },
];

export const DEFAULT_POLICIES: Policies = {
  current: CURRENT_POLICY,
  proposed: SCENARIOS[0]!.apply(CURRENT_POLICY),
};
