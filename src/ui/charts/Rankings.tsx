// Two ranked lists. Departments: who does the approving, as a dumbbell from
// the current load to the proposed one. Categories: where the controlled
// spend comes from, as bars with a tick where the current policy stands.

import { useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';
import { compactMoney, count, perWeek, signed } from '../../app/format.ts';
import type { EngineData } from '../../engine/prepare.ts';
import type { Stats } from '../../engine/stats.ts';
import { ChartCard, LegendLine, LegendSwatch, useTooltip } from './ChartCard.tsx';

const SHOWN = 8;

interface RankingProps {
  readonly data: EngineData;
  readonly current: Stats;
  readonly proposed: Stats;
}

export function DepartmentsChart({ data, current, proposed }: RankingProps) {
  const tooltip = useTooltip();
  const names = data.dataset.agencies;
  const ids = names
    .map((_, i) => i)
    .filter((i) => current.departmentApprovals[i]! > 0 || proposed.departmentApprovals[i]! > 0)
    .sort((a, b) => proposed.departmentApprovals[b]! - proposed.departmentApprovals[a]! || current.departmentApprovals[b]! - current.departmentApprovals[a]!);
  const shown = ids.slice(0, SHOWN);
  const max = Math.max(1, ...shown.map((i) => Math.max(current.departmentApprovals[i]!, proposed.departmentApprovals[i]!)));
  const at = (value: number): string => `${(value / max) * 100}%`;

  const describe = (i: number) => (
    <>
      <div className="tooltip__title">{names[i]}</div>
      <div className="tooltip__row">
        <span className="tooltip__key tooltip__key--light" />
        <strong>{perWeek(proposed.departmentApprovals[i]!)}</strong> a week, proposed
      </div>
      <div className="tooltip__row">
        <span className="tooltip__key" style={{ background: 'var(--current)' }} />
        <strong>{perWeek(current.departmentApprovals[i]!)}</strong> a week, current
      </div>
      <div className="tooltip__note">Busiest week: {count(proposed.departmentPeak[i]!)} approvals</div>
    </>
  );

  return (
    <ChartCard
      title="Who does the approving"
      subtitle={`Department approvals per week, the ${Math.min(SHOWN, ids.length)} busiest of ${ids.length} departments`}
      legend={
        <div className="legend">
          <LegendLine color="var(--proposed)">Proposed</LegendLine>
          <LegendLine color="var(--current)">Current</LegendLine>
        </div>
      }
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Current a week</th>
              <th>Proposed a week</th>
              <th>Busiest week</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((i) => (
              <tr key={i}>
                <td>{names[i]}</td>
                <td>{perWeek(current.departmentApprovals[i]!)}</td>
                <td>{perWeek(proposed.departmentApprovals[i]!)}</td>
                <td>{count(proposed.departmentPeak[i]!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="hrows" ref={tooltip.ref} style={{ position: 'relative' }}>
        {shown.length === 0 && <p className="card__subtitle">Neither policy sends anything to a department for approval.</p>}
        {shown.map((i) => {
          const before = current.departmentApprovals[i]!;
          const after = proposed.departmentApprovals[i]!;
          const show = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => tooltip.show(event, describe(i));
          return (
            <div
              key={i}
              className="hrow"
              tabIndex={0}
              aria-label={`${names[i]}: ${perWeek(after)} approvals a week proposed, ${perWeek(before)} current`}
              onPointerMove={show}
              onPointerLeave={tooltip.hide}
              onFocus={show}
              onBlur={tooltip.hide}
            >
              <span className="hrow__name">{names[i]}</span>
              <span className="hrow__track">
                <span className="track-base" />
                <span className="dumbbell__line" style={{ left: at(Math.min(before, after)), width: `${(Math.abs(after - before) / max) * 100}%` }} />
                <span className="dumbbell__dot dumbbell__dot--current" style={{ left: at(before) }} />
                <span className="dumbbell__dot dumbbell__dot--proposed" style={{ left: at(after) }} />
              </span>
              <span className="hrow__value">
                {perWeek(after)}
                <span className="hrow__unit"> /wk</span>
              </span>
            </div>
          );
        })}
        {tooltip.element}
      </div>
    </ChartCard>
  );
}

export function CategoriesChart({ data, current, proposed }: RankingProps) {
  const tooltip = useTooltip();
  const [all, setAll] = useState(false);
  const names = data.dataset.categories;
  const ids = names
    .map((_, i) => i)
    .filter((i) => current.categorySpend[i]! > 0 || proposed.categorySpend[i]! > 0)
    .sort((a, b) => proposed.categorySpend[b]! - proposed.categorySpend[a]! || current.categorySpend[b]! - current.categorySpend[a]!);
  const shown = all ? ids : ids.slice(0, SHOWN);
  const max = Math.max(1, ...ids.map((i) => Math.max(current.categorySpend[i]!, proposed.categorySpend[i]!)));
  const at = (value: number): string => `${(value / max) * 100}%`;

  const describe = (i: number) => (
    <>
      <div className="tooltip__title">{names[i]}</div>
      <div className="tooltip__row">
        <strong>{compactMoney(proposed.categorySpend[i]!)}</strong> under control, proposed
      </div>
      <div className="tooltip__row">
        <strong>{compactMoney(current.categorySpend[i]!)}</strong> current
      </div>
      <div className="tooltip__note">{signed(proposed.categorySpend[i]! - current.categorySpend[i]!, compactMoney)}</div>
    </>
  );

  return (
    <ChartCard
      title="Where the controlled spend comes from"
      subtitle="Spend flagged, held for approval or blocked, by category, per year"
      legend={
        <div className="legend">
          <LegendSwatch color="var(--proposed)">Proposed</LegendSwatch>
          <LegendSwatch color="var(--current-soft)">Current</LegendSwatch>
        </div>
      }
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((i) => (
              <tr key={i}>
                <td>{names[i]}</td>
                <td>{compactMoney(current.categorySpend[i]!)}</td>
                <td>{compactMoney(proposed.categorySpend[i]!)}</td>
                <td>{signed(proposed.categorySpend[i]! - current.categorySpend[i]!, compactMoney)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="hrows" ref={tooltip.ref} style={{ position: 'relative' }}>
        {shown.length === 0 && <p className="card__subtitle">Neither policy controls any spend.</p>}
        {shown.map((i) => {
          const before = current.categorySpend[i]!;
          const after = proposed.categorySpend[i]!;
          const show = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => tooltip.show(event, describe(i));
          return (
            <div
              key={i}
              className="hrow"
              tabIndex={0}
              aria-label={`${names[i]}: ${compactMoney(after)} under control proposed, ${compactMoney(before)} current`}
              onPointerMove={show}
              onPointerLeave={tooltip.hide}
              onFocus={show}
              onBlur={tooltip.hide}
            >
              <span className="hrow__name">{names[i]}</span>
              <span className="hrow__track">
                <span className="track-base" />
                <span className="bar bar--current" style={{ width: at(before) }} />
                <span className="bar bar--proposed" style={{ width: at(after) }} />
              </span>
              <span className="hrow__value">{compactMoney(after)}</span>
            </div>
          );
        })}
        {ids.length > SHOWN && (
          <button type="button" className="button button--ghost button--small hrow__more" onClick={() => setAll(!all)}>
            {all ? 'Show fewer' : `Show all ${ids.length} categories`}
          </button>
        )}
        {tooltip.element}
      </div>
    </ChartCard>
  );
}

