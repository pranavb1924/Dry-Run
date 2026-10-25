// How an outcome looks everywhere: a dot on the strictness scale plus its
// name, so color is never the only signal.

import type { CSSProperties } from 'react';
import { LEVEL_LABELS } from '../engine/policy.ts';

export const LEVEL_COLORS = ['var(--level-0)', 'var(--level-1)', 'var(--level-2)', 'var(--level-3)', 'var(--level-4)'] as const;

export const LEVEL_SHORT = ['Allowed', 'Flagged', 'Dept. approval', 'Finance approval', 'Blocked'] as const;

export function levelColor(level: number): string {
  return LEVEL_COLORS[level] ?? LEVEL_COLORS[0];
}

export function OutcomeBadge({ level, short = false, muted = false }: { readonly level: number; readonly short?: boolean; readonly muted?: boolean }) {
  const labels = short ? LEVEL_SHORT : LEVEL_LABELS;
  return (
    <span className={muted ? 'badge badge--muted' : 'badge'} style={{ '--dot': levelColor(level) } as CSSProperties}>
      <span className="badge__dot" />
      {labels[level] ?? labels[0]}
    </span>
  );
}
