// Runs a policy over every transaction in one pass per rule.
//
// Rules are compiled first: every condition becomes a number range or a
// lookup table indexed by id, so testing a transaction is a handful of array
// reads with no string comparisons. Rules then run from strictest to least
// strict, and each one only looks at the purchases no stricter rule has
// claimed, so the work shrinks as it goes.

import { levelOf } from './policy.ts';
import type { Condition, Level, Policy } from './policy.ts';
import type { EngineData } from './prepare.ts';

/** Marks a transaction no rule applies to. */
export const NO_RULE = 255;

export interface Evaluation {
  /** For each transaction, how strict its outcome is: 0 = allowed … 4 = blocked. */
  readonly level: Uint8Array;
  /** For each transaction, the position of the rule that decided it, or NO_RULE. */
  readonly rule: Uint8Array;
}

interface CompiledRule {
  readonly position: number;
  readonly level: Level;
  /** The amount must be above `over` and below `under`, in cents. */
  readonly over: number;
  readonly under: number;
  /** Lookup tables by id, 1 where the value is allowed, or null for "any". */
  readonly categories: Uint8Array | null;
  readonly merchants: Uint8Array | null;
  readonly departments: Uint8Array | null;
  readonly weekendOnly: boolean;
  readonly undescribedOnly: boolean;
}

export function evaluate(data: EngineData, policy: Policy): Evaluation {
  const t = data.dataset.transactions;
  const level = new Uint8Array(t.count);
  const rule = new Uint8Array(t.count).fill(NO_RULE);

  // Strictest first; between equally strict rules, the earlier one names the outcome.
  const rules = compile(data, policy).sort((a, b) => b.level - a.level || a.position - b.position);

  // The purchases no rule has claimed yet, compacted after every rule.
  const pending = data.purchases.slice();
  let pendingCount = pending.length;

  const { amountCents, category, merchant, weekday, described } = t;
  const agency = data.agency;

  for (const r of rules) {
    const { over, under, categories, merchants, departments, weekendOnly, undescribedOnly } = r;
    let kept = 0;
    for (let k = 0; k < pendingCount; k++) {
      const i = pending[k]!;
      const amount = amountCents[i]!;
      const matches =
        amount > over &&
        amount < under &&
        (categories === null || categories[category[i]!] === 1) &&
        (departments === null || departments[agency[i]!] === 1) &&
        (merchants === null || merchants[merchant[i]!] === 1) &&
        (!weekendOnly || weekday[i] === 0 || weekday[i] === 6) &&
        (!undescribedOnly || described[i] === 0);
      if (matches) {
        level[i] = r.level;
        rule[i] = r.position;
      } else {
        pending[kept++] = i;
      }
    }
    pendingCount = kept;
  }

  return { level, rule };
}

function compile(data: EngineData, policy: Policy): CompiledRule[] {
  const compiled: CompiledRule[] = [];
  policy.forEach((r, position) => {
    if (!r.enabled) {
      return;
    }
    let over = 0; // refunds and zero amounts never match
    let under = Infinity;
    let categories: Uint8Array | null = null;
    let merchants: Uint8Array | null = null;
    let departments: Uint8Array | null = null;
    let weekendOnly = false;
    let undescribedOnly = false;

    for (const condition of r.conditions) {
      switch (condition.kind) {
        case 'over':
          over = Math.max(over, condition.cents);
          break;
        case 'under':
          under = Math.min(under, condition.cents);
          break;
        case 'category':
          categories = intersect(categories, lookup(condition, data.categoryIds, data.dataset.categories.length));
          break;
        case 'merchant':
          merchants = intersect(merchants, lookup(condition, data.merchantIds, data.dataset.merchants.length));
          break;
        case 'department':
          departments = intersect(departments, lookup(condition, data.agencyIds, data.dataset.agencies.length));
          break;
        case 'weekend':
          weekendOnly = true;
          break;
        case 'noDescription':
          undescribedOnly = true;
          break;
      }
    }
    compiled.push({ position, level: levelOf(r.action), over, under, categories, merchants, departments, weekendOnly, undescribedOnly });
  });
  return compiled;
}

/** A table with a 1 for every named value. Names not in the data match nothing. */
function lookup(condition: Extract<Condition, { names: readonly string[] }>, ids: ReadonlyMap<string, number>, size: number): Uint8Array {
  const table = new Uint8Array(size);
  for (const name of condition.names) {
    const id = ids.get(name);
    if (id !== undefined) {
      table[id] = 1;
    }
  }
  return table;
}

/** Two conditions of the same kind in one rule must both hold. */
function intersect(a: Uint8Array | null, b: Uint8Array): Uint8Array {
  if (a === null) {
    return b;
  }
  return a.map((value, i) => value & b[i]!);
}
