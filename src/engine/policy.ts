// A card policy is a list of rules. Every condition in a rule must match a
// purchase for the rule to apply; to say "or", add another rule. When several
// rules apply, the strictest action wins, so the order of rules never changes
// an outcome. Refunds never match any rule.

/** Actions from least to most strict. */
export const ACTIONS = ['flag', 'approval', 'finance', 'block'] as const;
export type Action = (typeof ACTIONS)[number];

/** How strict an outcome is: 0 = allowed, 1 = flagged, … 4 = blocked. */
export type Level = 0 | 1 | 2 | 3 | 4;

export const ACTION_LABELS: Readonly<Record<Action, string>> = {
  flag: 'Flag for review',
  approval: 'Department approval',
  finance: 'Finance approval',
  block: 'Block',
};

export const LEVEL_LABELS = ['Allowed', 'Flagged', 'Department approval', 'Finance approval', 'Blocked'] as const;

export function levelOf(action: Action): Level {
  return (ACTIONS.indexOf(action) + 1) as Level;
}

/**
 * One test a purchase must pass. Categories, merchants and departments are
 * named rather than numbered, so a shared link keeps working even if the
 * data file is rebuilt.
 */
export type Condition =
  | { readonly kind: 'over'; readonly cents: number }
  | { readonly kind: 'under'; readonly cents: number }
  | { readonly kind: 'category'; readonly names: readonly string[] }
  | { readonly kind: 'merchant'; readonly names: readonly string[] }
  | { readonly kind: 'department'; readonly names: readonly string[] }
  | { readonly kind: 'weekend' }
  | { readonly kind: 'noDescription' };

export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly conditions: readonly Condition[];
  readonly action: Action;
}

export type Policy = readonly Rule[];

/** The most rules a policy can have; a rule's position must fit in a byte. */
export const MAX_RULES = 64;
