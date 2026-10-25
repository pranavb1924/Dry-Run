// Small, pure helpers for editing a policy. Each returns a new policy and
// leaves the old one untouched, which is what makes undo possible.

import type { Condition, Policy, Rule } from '../engine/policy.ts';

export function newId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function newRule(): Rule {
  return { id: newId(), name: 'New rule', enabled: true, action: 'flag', conditions: [{ kind: 'over', cents: 100_000 }] };
}

export function updateRule(policy: Policy, id: string, update: (rule: Rule) => Rule): Policy {
  return policy.map((rule) => (rule.id === id ? update(rule) : rule));
}

export function removeRule(policy: Policy, id: string): Policy {
  return policy.filter((rule) => rule.id !== id);
}

export function duplicateRule(policy: Policy, id: string): Policy {
  const index = policy.findIndex((rule) => rule.id === id);
  const original = policy[index];
  if (original === undefined) {
    return policy;
  }
  const copy = { ...original, id: newId(), name: `${original.name} (copy)` };
  return [...policy.slice(0, index + 1), copy, ...policy.slice(index + 1)];
}

export function replaceCondition(rule: Rule, index: number, condition: Condition): Rule {
  return { ...rule, conditions: rule.conditions.map((c, i) => (i === index ? condition : c)) };
}

export function removeCondition(rule: Rule, index: number): Rule {
  return { ...rule, conditions: rule.conditions.filter((_, i) => i !== index) };
}

/** Whether a proposed rule is new, changed or the same as in the current policy. */
export function ruleStatus(rule: Rule, current: Policy): 'new' | 'changed' | 'same' {
  const match = current.find((r) => r.id === rule.id);
  if (match === undefined) {
    return 'new';
  }
  return JSON.stringify(match) === JSON.stringify(rule) ? 'same' : 'changed';
}

/** The current rules the proposed policy drops. */
export function removedRules(current: Policy, proposed: Policy): Rule[] {
  return current.filter((rule) => !proposed.some((r) => r.id === rule.id));
}
