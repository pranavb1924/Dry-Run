// Builds small datasets and rules for tests. Each department has exactly one
// cardholder, whose index matches the department's.

import type { Action, Condition, Rule } from './policy.ts';
import type { Dataset } from './types.ts';

export const CATEGORIES = ['Airfare', 'Lodging', 'Online & retail'];
export const MERCHANTS = ['Amazon', 'Delta Air Lines', 'Hilton'];
export const DEPARTMENTS = ['Corrections', 'Health'];

export interface Row {
  readonly cents: number;
  readonly day?: number;
  /** 0 = Sunday … 6 = Saturday. Tuesday unless given. */
  readonly weekday?: number;
  readonly category?: number;
  readonly merchant?: number;
  readonly department?: number;
  readonly described?: boolean;
}

export function dataset(rows: readonly Row[]): Dataset {
  return {
    transactions: {
      count: rows.length,
      day: Uint16Array.from(rows, (r) => r.day ?? 0),
      weekday: Uint8Array.from(rows, (r) => r.weekday ?? 2),
      cardholder: Uint16Array.from(rows, (r) => r.department ?? 0),
      merchant: Uint16Array.from(rows, (r) => r.merchant ?? 0),
      category: Uint8Array.from(rows, (r) => r.category ?? 0),
      mcc: new Uint16Array(rows.length),
      amountCents: Int32Array.from(rows, (r) => r.cents),
      described: Uint8Array.from(rows, (r) => ((r.described ?? true) ? 1 : 0)),
    },
    cardholders: DEPARTMENTS.map((_, agency) => ({ name: `Cardholder ${agency}`, agency })),
    agencies: DEPARTMENTS,
    merchants: MERCHANTS,
    categories: CATEGORIES,
    mccs: ['TEST'],
  };
}

let nextId = 0;

export function rule(action: Action, conditions: readonly Condition[], options: Partial<Rule> = {}): Rule {
  nextId++;
  return { id: `r${nextId}`, name: `Rule ${nextId}`, enabled: true, conditions, action, ...options };
}
