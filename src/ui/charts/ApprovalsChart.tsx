// Approvals per week across the year, current policy in gray and the
// proposal in ink, with the proposal's area washed in the accent. A
// crosshair follows the pointer (or the arrow keys) and reads out both
// policies for that week.

import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { count, monthOfWeek, perWeek, signed, weekRange } from '../../app/format.ts';
import { WEEKS } from '../../engine/prepare.ts';
import { useWidth } from '../useWidth.ts';
import { ChartCard, LegendLine, niceScale } from './ChartCard.tsx';

const HEIGHT = 240;
const PAD = { top: 12, right: 14, bottom: 28, left: 40 };

export function ApprovalsChart({ current, proposed }: { readonly current: Float64Array; readonly proposed: Float64Array }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [week, setWeek] = useState<number | null>(null);

  const totalCurrent = current.reduce((a, b) => a + b, 0);
  const totalProposed = proposed.reduce((a, b) => a + b, 0);
  const { max, step } = niceScale(Math.max(...current, ...proposed, 1));

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (w: number): number => PAD.left + (w / (WEEKS - 1)) * plotWidth;
  const y = (v: number): number => PAD.top + plotHeight - (v / max) * plotHeight;
  const line = (values: Float64Array): string => Array.from(values, (v, w) => `${w === 0 ? 'M' : 'L'}${x(w).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const baseline = y(0);

  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) {
    ticks.push(v);
  }
  const months: { week: number; label: string }[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const label = monthOfWeek(w);
    const previous = months.at(-1);
    if (w === 0 || label !== monthOfWeek(w - 1)) {
      if (previous === undefined || x(w) - x(previous.week) > (width < 520 ? 52 : 30)) {
        months.push({ week: w, label });
      }
    }
  }

  const point = (event: PointerEvent<SVGSVGElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const w = Math.round(((event.clientX - rect.left - PAD.left) / plotWidth) * (WEEKS - 1));
    setWeek(Math.max(0, Math.min(WEEKS - 1, w)));
  };
  const keys = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      setWeek((w) => Math.max(0, Math.min(WEEKS - 1, (w ?? (delta > 0 ? -1 : WEEKS)) + delta)));
    } else if (event.key === 'Escape') {
      setWeek(null);
    }
  };

  const hovered = week === null ? null : { cur: current[week]!, pro: proposed[week]! };

  return (
    <ChartCard
      title="Approvals per week"
      subtitle="Department and finance approvals the policy creates, week by week"
      legend={
        <div className="legend">
          <LegendLine color="var(--proposed)">
            Proposed <strong>{perWeek(totalProposed)}</strong> a week on average
          </LegendLine>
          <LegendLine color="var(--current)">
            Current <strong>{perWeek(totalCurrent)}</strong>
          </LegendLine>
        </div>
      }
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(proposed, (pro, w) => (
              <tr key={w}>
                <td>{weekRange(w)}</td>
                <td>{count(current[w]!)}</td>
                <td>{count(pro)}</td>
                <td>{signed(pro - current[w]!, count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div ref={wrap} style={{ position: 'relative' }}>
        {width > 0 && (
          <svg
            className="chart"
            width={width}
            height={HEIGHT}
            role="img"
            tabIndex={0}
            aria-label={`Approvals per week from July 2025 to June 2026. Proposed averages ${perWeek(totalProposed)} a week, current ${perWeek(totalCurrent)}. Use the arrow keys to read each week.`}
            onPointerMove={point}
            onPointerLeave={() => setWeek(null)}
            onKeyDown={keys}
            onBlur={() => setWeek(null)}
          >
            {ticks.map((v) => (
              <g key={v}>
                <line className={v === 0 ? 'chart__baseline' : 'chart__grid'} x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
                <text x={PAD.left - 10} y={y(v)} dy="0.32em" textAnchor="end">
                  {count(v)}
                </text>
              </g>
            ))}
            {months.map(({ week: w, label }) => (
              <text key={w} x={x(w)} y={HEIGHT - 8} textAnchor={w === 0 ? 'start' : 'middle'}>
                {label}
              </text>
            ))}

            <defs>
              <linearGradient id="approvals-wash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="wash-stop" stopOpacity={0.5} />
                <stop offset="100%" className="wash-stop" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <path d={`${line(proposed)}L${x(WEEKS - 1)},${baseline}L${x(0)},${baseline}Z`} fill="url(#approvals-wash)" />
            <path d={line(current)} className="mark-line mark-line--current" />
            <path d={line(proposed)} className="mark-line mark-line--proposed" />

            {week === null ? (
              <>
                <circle cx={x(WEEKS - 1)} cy={y(current[WEEKS - 1]!)} r={4} className="mark-dot mark-dot--current" />
                <circle cx={x(WEEKS - 1)} cy={y(proposed[WEEKS - 1]!)} r={4} className="mark-dot mark-dot--proposed" />
              </>
            ) : (
              <>
                <line className="chart__crosshair" x1={x(week)} x2={x(week)} y1={PAD.top} y2={baseline} />
                <circle cx={x(week)} cy={y(current[week]!)} r={4.5} className="mark-dot mark-dot--current" />
                <circle cx={x(week)} cy={y(proposed[week]!)} r={4.5} className="mark-dot mark-dot--proposed" />
              </>
            )}
          </svg>
        )}
        {week !== null && hovered !== null && (
          <div className="tooltip" style={{ left: Math.max(96, Math.min(x(week), width - 96)), top: y(Math.max(hovered.cur, hovered.pro)) }}>
            <div className="tooltip__title">{weekRange(week)}</div>
            <div className="tooltip__row">
              <span className="tooltip__key tooltip__key--light" />
              <strong>{count(hovered.pro)}</strong> proposed
            </div>
            <div className="tooltip__row">
              <span className="tooltip__key" style={{ background: 'var(--current)' }} />
              <strong>{count(hovered.cur)}</strong> current
            </div>
            <div className="tooltip__note">{signed(hovered.pro - hovered.cur, count)} approvals this week</div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
