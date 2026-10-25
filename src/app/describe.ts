// Puts rules into words: short labels for condition chips, and a sentence
// for the whole rule ("Department approval for purchases over $2,500 in
// Airfare or Lodging").

import { ACTION_LABELS } from '../engine/policy.ts';
import type { Condition, Rule } from '../engine/policy.ts';
import { threshold } from './format.ts';

/** "Airfare", "Airfare or Lodging", "Airfare, Lodging or Meals", "Airfare, Lodging and 3 more". */
export function listNames(names: readonly string[], join = 'or'): string {
  if (names.length === 0) {
    return 'nothing';
  }
  if (names.length <= 3) {
    return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} ${join} ${names.at(-1)}`;
  }
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

/** The label on a condition's chip. */
export function conditionLabel(condition: Condition): string {
  switch (condition.kind) {
    case 'over':
      return `Over ${threshold(condition.cents)}`;
    case 'under':
      return `Under ${threshold(condition.cents)}`;
    case 'category':
    case 'merchant':
    case 'department':
      return listNames(condition.names);
    case 'weekend':
      return 'On weekends';
    case 'noDescription':
      return 'No description';
  }
}

/** The condition as part of a sentence: "over $2,500", "at Amazon". */
export function conditionPhrase(condition: Condition): string {
  switch (condition.kind) {
    case 'over':
      return `over ${threshold(condition.cents)}`;
    case 'under':
      return `under ${threshold(condition.cents)}`;
    case 'category':
      return `in ${listNames(condition.names)}`;
    case 'merchant':
      return `at ${listNames(condition.names)}`;
    case 'department':
      return `by ${listNames(condition.names)}`;
    case 'weekend':
      return 'on weekends';
    case 'noDescription':
      return 'without a description';
  }
}

export function describeRule(rule: Rule): string {
  const phrases = rule.conditions.map(conditionPhrase);
  const what = phrases.length === 0 ? 'every purchase' : `purchases ${phrases.join(', ')}`;
  return `${ACTION_LABELS[rule.action]} for ${what}`;
}
