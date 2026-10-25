import { describe, expect, test } from 'vitest';
import { CURRENT_POLICY, DEFAULT_POLICIES, SCENARIOS } from './defaults.ts';
import { conditionLabel, describeRule, listNames } from './describe.ts';
import { duplicateRule, removedRules, ruleStatus, updateRule } from './edit.ts';
import { compactCount, compactMoney, money, perWeek, shortDay, signed, threshold, weekRange } from './format.ts';
import { historyReducer, startHistory } from './history.ts';
import { decodePolicies, encodePolicies } from './share.ts';

describe('format', () => {
  test('writes money', () => {
    expect(money(123_456)).toBe('$1,234.56');
    expect(money(-1_200)).toBe('−$12.00');
    expect(threshold(250_000)).toBe('$2,500');
    expect(compactMoney(1_700_000_000)).toBe('$17.0M');
    expect(compactMoney(81_234_500)).toBe('$812K');
    expect(compactMoney(456_000)).toBe('$4,560');
  });

  test('writes counts, rates and differences', () => {
    expect(compactCount(12_940)).toBe('12.9K');
    expect(compactCount(1_234)).toBe('1,234');
    expect(perWeek(365 / 7)).toBe('1.0');
    expect(perWeek(13_675)).toBe('262');
    expect(signed(17, String)).toBe('+17');
    expect(signed(-3, String)).toBe('−3');
    expect(signed(0, String)).toBe('No change');
  });

  test('writes dates from the day number', () => {
    expect(shortDay(0)).toBe('Jul 1');
    expect(shortDay(364)).toBe('Jun 30');
    expect(weekRange(0)).toBe('Jul 1 – Jul 7');
    expect(weekRange(51)).toBe('Jun 23 – Jun 30');
  });
});

describe('describe', () => {
  test('lists names the way people write them', () => {
    expect(listNames(['Airfare'])).toBe('Airfare');
    expect(listNames(['Airfare', 'Lodging'])).toBe('Airfare or Lodging');
    expect(listNames(['A', 'B', 'C'])).toBe('A, B or C');
    expect(listNames(['A', 'B', 'C', 'D', 'E'])).toBe('A, B and 3 more');
  });

  test('turns a rule into a sentence', () => {
    expect(describeRule(CURRENT_POLICY[1]!)).toBe('Department approval for purchases in Airfare or Lodging, over $1,500');
    expect(describeRule({ ...CURRENT_POLICY[0]!, conditions: [] })).toBe('Finance approval for every purchase');
    expect(conditionLabel({ kind: 'noDescription' })).toBe('No description');
  });
});

describe('edit', () => {
  test('tells new, changed and unchanged rules apart', () => {
    const proposed = updateRule(DEFAULT_POLICIES.proposed, 'travel', (rule) => ({ ...rule, action: 'block' }));
    expect(proposed.map((rule) => ruleStatus(rule, CURRENT_POLICY))).toEqual(['same', 'changed', 'same', 'same', 'new']);
  });

  test('duplicates a rule right after the original', () => {
    const policy = duplicateRule(CURRENT_POLICY, 'large');
    expect(policy.map((rule) => rule.name)).toEqual(['Large purchases', 'Large purchases (copy)', 'Travel', 'Missing description', 'Weekend purchases']);
    expect(policy[1]!.id).not.toBe('large');
  });

  test('finds the rules a proposal drops', () => {
    const proposed = SCENARIOS.find((s) => s.id === 'no-weekend')!.apply(CURRENT_POLICY);
    expect(removedRules(CURRENT_POLICY, proposed).map((rule) => rule.id)).toEqual(['weekend']);
  });
});

describe('history', () => {
  test('undoes and redoes edits', () => {
    let state = startHistory(1);
    state = historyReducer(state, { type: 'edit', value: 2, time: 0 });
    state = historyReducer(state, { type: 'edit', value: 3, time: 10_000 });
    state = historyReducer(state, { type: 'undo' });
    expect(state.present).toBe(2);
    state = historyReducer(state, { type: 'redo' });
    expect(state.present).toBe(3);
  });

  test('groups quick edits to the same field into one undo', () => {
    let state = startHistory('');
    for (const [time, value] of [[0, '2'], [100, '25'], [200, '250'], [300, '2500']] as const) {
      state = historyReducer(state, { type: 'edit', value, group: 'amount', time });
    }
    expect(historyReducer(state, { type: 'undo' }).present).toBe('');
  });

  test('a new edit clears what could be redone', () => {
    let state = historyReducer(startHistory(1), { type: 'edit', value: 2, time: 0 });
    state = historyReducer(state, { type: 'undo' });
    state = historyReducer(state, { type: 'edit', value: 5, time: 10_000 });
    expect(historyReducer(state, { type: 'redo' }).present).toBe(5);
  });
});

describe('share', () => {
  test('a link opens the same policies', () => {
    const hash = encodePolicies(DEFAULT_POLICIES);
    expect(hash).toMatch(/^v1\.[\w-]+$/);
    expect(decodePolicies(`#${hash}`)).toEqual(DEFAULT_POLICIES);
  });

  test('rejects links that are broken or tampered with', () => {
    const tampered = (value: unknown) => `v1.${btoa(JSON.stringify(value))}`;
    expect(decodePolicies('')).toBeNull();
    expect(decodePolicies('v1.not-base64!')).toBeNull();
    expect(decodePolicies(tampered({ c: [], p: 'nope' }))).toBeNull();
    expect(decodePolicies(tampered({ c: [], p: [{ ...CURRENT_POLICY[0], action: 'explode' }] }))).toBeNull();
    expect(decodePolicies(tampered({ c: [], p: [{ ...CURRENT_POLICY[0], conditions: [{ kind: 'over', cents: -5 }] }] }))).toBeNull();
    expect(decodePolicies(tampered({ c: [], p: Array.from({ length: 65 }, () => CURRENT_POLICY[0]) }))).toBeNull();
  });
});
