// Where every dollar ends up under each policy: allowed, flagged, approved
// by a department or by finance, or blocked. Two stacked bars, current over
// proposed, on the same strictness scale as the table's badges.

import type { CSSProperties } from 'react';
import { compactMoney, count, percent, signed } from '../../app/format.ts';
import { controlledSpend, totalSpend } from '../../app/metrics.ts';
import { LEVEL_LABELS } from '../../engine/policy.ts';
import type { Stats } from '../../engine/stats.ts';
import { levelColor } from '../Outcome.tsx';
import { ChartCard, LegendSwatch, useTooltip } from './ChartCard.tsx';

export function OutcomeMix({ current, proposed }: { readonly current: Stats; readonly proposed: Stats }) {
  const tooltip = useTooltip();
  const rows = [
    { label: 'Current', stats: current },
    { label: 'Proposed', stats: proposed },
  ];

  return (
    <ChartCard
      title="Where the spend ends up"
      subtitle={`Every dollar of the year’s ${compactMoney(totalSpend(current))} in spend, under each policy`}
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Outcome</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_LABELS.map((label, level) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{compactMoney(current.spend[level]!)}</td>
                <td>{compactMoney(proposed.spend[level]!)}</td>
                <td>{signed(proposed.spend[level]! - current.spend[level]!, compactMoney)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="mix" ref={tooltip.ref} style={{ position: 'relative' }}>
        {rows.map(({ label, stats }) => {
          const total = totalSpend(stats);
          return (
            <div key={label} className="mix__row">
              <div className="mix__label">
                <strong>{label}</strong>
                <span>{percent(controlledSpend(stats) / total)} under control</span>
              </div>
              <div className="mix__bar">
                {Array.from(stats.spend, (spend, level) =>
                  spend <= 0 ? null : (
                    <div
                      key={level}
                      className="mix__segment"
                      tabIndex={0}
                      aria-label={`${label}: ${LEVEL_LABELS[level]}, ${compactMoney(spend)}, ${percent(spend / total)}`}
                      style={{ flexGrow: spend, '--key': levelColor(level) } as CSSProperties}
                      onPointerMove={(event) => tooltip.show(event, tip(label, level, spend, total, stats.count[level]!))}
                      onPointerLeave={tooltip.hide}
                      onFocus={(event) => tooltip.show(event, tip(label, level, spend, total, stats.count[level]!))}
                      onBlur={tooltip.hide}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
        <div className="legend">
          {LEVEL_LABELS.map((label, level) => (
            <LegendSwatch key={label} color={levelColor(level)}>
              {label} <strong>{compactMoney(proposed.spend[level]!)}</strong>
            </LegendSwatch>
          ))}
        </div>
        {tooltip.element}
      </div>
    </ChartCard>
  );
}

function tip(policy: string, level: number, spend: number, total: number, transactions: number) {
  return (
    <>
      <div className="tooltip__title">
        {policy} · {LEVEL_LABELS[level]}
      </div>
      <div className="tooltip__row">
        <strong>{compactMoney(spend)}</strong> {percent(spend / total)} of spend
      </div>
      <div className="tooltip__row">
        <strong>{count(transactions)}</strong> transactions
      </div>
    </>
  );
}
