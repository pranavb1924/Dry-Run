// Saves both policies in the page's address, so a link opens the exact same
// comparison. The policies are JSON, encoded as base64url to survive in a URL.
//
// A link can be edited by anyone, so reading one checks every field and
// rejects anything that isn't a well-formed policy.

import { ACTIONS, MAX_RULES } from '../engine/policy.ts';
import type { Action, Condition, Policy, Rule } from '../engine/policy.ts';
import type { Policies } from './defaults.ts';

const VERSION = 'v1.';

export function encodePolicies(policies: Policies): string {
  return VERSION + toBase64Url(JSON.stringify({ c: policies.current, p: policies.proposed }));
}

export function decodePolicies(hash: string): Policies | null {
  const text = hash.replace(/^#/, '');
  if (!text.startsWith(VERSION)) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(fromBase64Url(text.slice(VERSION.length)));
  } catch {
    return null;
  }
  if (!isObject(value)) {
    return null;
  }
  const current = parsePolicy(value.c);
  const proposed = parsePolicy(value.p);
  return current !== null && proposed !== null ? { current, proposed } : null;
}

function parsePolicy(value: unknown): Policy | null {
  if (!Array.isArray(value) || value.length > MAX_RULES) {
    return null;
  }
  const rules = value.map(parseRule);
  return rules.every((rule) => rule !== null) ? (rules as Rule[]) : null;
}

function parseRule(value: unknown): Rule | null {
  if (
    !isObject(value) ||
    !isText(value.id, 40) ||
    !isText(value.name, 80) ||
    typeof value.enabled !== 'boolean' ||
    !ACTIONS.includes(value.action as Action) ||
    !Array.isArray(value.conditions) ||
    value.conditions.length > 10
  ) {
    return null;
  }
  const conditions = value.conditions.map(parseCondition);
  if (!conditions.every((condition) => condition !== null)) {
    return null;
  }
  return { id: value.id, name: value.name, enabled: value.enabled, action: value.action as Action, conditions: conditions as Condition[] };
}

function parseCondition(value: unknown): Condition | null {
  if (!isObject(value)) {
    return null;
  }
  switch (value.kind) {
    case 'over':
    case 'under':
      return Number.isSafeInteger(value.cents) && (value.cents as number) >= 0 ? { kind: value.kind, cents: value.cents as number } : null;
    case 'category':
    case 'merchant':
    case 'department':
      return Array.isArray(value.names) && value.names.length <= 200 && value.names.every((name) => isText(name, 120))
        ? { kind: value.kind, names: value.names as string[] }
        : null;
    case 'weekend':
    case 'noDescription':
      return { kind: value.kind };
    default:
      return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function toBase64Url(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
