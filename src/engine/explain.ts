// Explains one transaction's outcome: for every rule, which conditions it
// met and whether the rule applies. The "why" panel shows this.

import type { Condition, Policy, Rule } from './policy.ts';
import type { EngineData } from './prepare.ts';

export interface RuleCheck {
  readonly position: number;
  readonly rule: Rule;
  readonly applies: boolean;
  readonly checks: readonly { readonly condition: Condition; readonly met: boolean }[];
}

export function explain(data: EngineData, policy: Policy, i: number): RuleCheck[] {
  const { dataset } = data;
  const t = dataset.transactions;
  const amount = t.amountCents[i]!;

  const meets = (condition: Condition): boolean => {
    switch (condition.kind) {
      case 'over':
        return amount > condition.cents;
      case 'under':
        return amount < condition.cents;
      case 'category':
        return condition.names.includes(dataset.categories[t.category[i]!]!);
      case 'merchant':
        return condition.names.includes(dataset.merchants[t.merchant[i]!]!);
      case 'department':
        return condition.names.includes(dataset.agencies[data.agency[i]!]!);
      case 'weekend':
        return t.weekday[i] === 0 || t.weekday[i] === 6;
      case 'noDescription':
        return t.described[i] === 0;
    }
  };

  return policy.map((rule, position) => {
    const checks = rule.conditions.map((condition) => ({ condition, met: meets(condition) }));
    const applies = rule.enabled && amount > 0 && checks.every((check) => check.met);
    return { position, rule, applies, checks };
  });
}
