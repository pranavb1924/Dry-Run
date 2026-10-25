// The top of the results: one sentence that says what the proposal does,
// scenarios to try, and four tiles for the trade-off. Control (spend
// reviewed or blocked) going up is good; friction (approvals, and the people
// who wait on them) going up is a cost. Each tile shows both policies.

import type { ReactNode } from 'react';
import type { Policies } from '../app/defaults.ts';
import { SCENARIOS } from '../app/defaults.ts';
import { compactMoney, count, perWeek, percent, signed } from '../app/format.ts';
import { approvals, busiestDepartment, controlledSpend, totalSpend } from '../app/metrics.ts';
import type { EngineData } from '../engine/prepare.ts';
import { WEEKS_IN_YEAR } from '../engine/prepare.ts';
import type { Stats } from '../engine/stats.ts';
import type { Snapshot } from '../app/useEngine.ts';
import { ArrowRightIcon, SparkIcon } from './icons.tsx';

interface SummaryProps {
  readonly policies: Policies;
  readonly snapshot: Snapshot;
  readonly data: EngineData;
  readonly activeScenario: string | null;
  readonly onScenario: (id: string) => void;
}

export function Summary({ policies, snapshot, data, activeScenario, onScenario }: SummaryProps) {
  const before = snapshot.current.stats;
  const after = snapshot.proposed.stats;
  const same = JSON.stringify(policies.current) === JSON.stringify(policies.proposed);

  return (
    <section className="summary" aria-label="What the proposal does">
      <p className="summary__eyebrow">
        Proposed vs. current policy · {count(data.dataset.transactions.count)} real transactions · Jul 2025 – Jun 2026
      </p>
      <h1 className="summary__headline">{same ? <>The proposal matches the current policy. Change a rule or try a scenario.</> : headline(before, after)}</h1>
      <p className="summary__sub">
        Every purchase the State of Oklahoma made on its cards in fiscal 2026, replayed against both policies. Cardholder names are made up; amounts, merchants and dates are real.
      </p>
      <div className="scenarios" role="group" aria-label="Scenarios">
        <span className="scenarios__label">Try</span>
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            className="scenario"
            aria-pressed={activeScenario === scenario.id}
            onClick={() => onScenario(scenario.id)}
          >
            {activeScenario === scenario.id && <SparkIcon size={13} />}
            {scenario.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** "This change puts $17.0M more spend under control and adds 179 approvals a week." */
function headline(before: Stats, after: Stats) {
  const control = controlledSpend(after) - controlledSpend(before);
  const weekly = (approvals(after) - approvals(before)) / WEEKS_IN_YEAR;
  const blocked = after.count[4]! - before.count[4]!;

  const clauses: ReactNode[] = [];
  if (Math.abs(control) >= 100) {
    clauses.push(
      control > 0 ? (
        <>puts <em>{compactMoney(control)}</em> more spend under control</>
      ) : (
        <>releases <em>{compactMoney(-control)}</em> of spend from control</>
      ),
    );
  }
  if (Math.round(Math.abs(weekly)) >= 1) {
    const n = Math.round(Math.abs(weekly));
    clauses.push(
      weekly > 0 ? (
        <>adds <em>{count(n)}</em> {n === 1 ? 'approval' : 'approvals'} a week</>
      ) : (
        <>removes <em>{count(n)}</em> {n === 1 ? 'approval' : 'approvals'} a week</>
      ),
    );
  }
  if (blocked !== 0) {
    clauses.push(
      blocked > 0 ? (
        <>blocks <em>{count(blocked)}</em> purchases a year</>
      ) : (
        <>unblocks <em>{count(-blocked)}</em> purchases a year</>
      ),
    );
  }
  if (clauses.length === 0) {
    return <>This change doesn’t move a single purchase in the year.</>;
  }
  return (
    <>
      This change{' '}
      {clauses.map((clause, i) => (
        <span key={i}>
          {i > 0 && (i === clauses.length - 1 ? ' and ' : ', ')}
          {clause}
        </span>
      ))}
      .
    </>
  );
}

export function Tiles({ snapshot, data }: { readonly snapshot: Snapshot; readonly data: EngineData }) {
  const before = snapshot.current.stats;
  const after = snapshot.proposed.stats;
  const busiestAfter = busiestDepartment(after);
  const busiestBefore = busiestAfter === null ? null : before.departmentApprovals[busiestAfter.index]!;
  const holders = data.dataset.cardholders.length;

  return (
    <div className="tiles">
      <Tile
        label="Spend under control"
        tag="Control"
        value={compactMoney(controlledSpend(after))}
        unit={percent(controlledSpend(after) / totalSpend(after))}
        delta={controlledSpend(after) - controlledSpend(before)}
        good="up"
        format={compactMoney}
        was={compactMoney(controlledSpend(before))}
        note="Flagged, approved first, or blocked"
      />
      <Tile
        label="Approvals per week"
        tag="Friction"
        value={perWeek(approvals(after))}
        delta={(approvals(after) - approvals(before)) / WEEKS_IN_YEAR}
        good="down"
        format={(n) => perWeek(n * WEEKS_IN_YEAR)}
        was={perWeek(approvals(before))}
        note={`${perWeek(after.count[2]!)} department · ${perWeek(after.count[3]!)} finance`}
      />
      {busiestAfter === null || busiestBefore === null ? (
        <Tile label="Busiest department" tag="Friction" value="None" note="No department approvals" />
      ) : (
        <Tile
          label="Busiest department"
          tag="Friction"
          value={perWeek(busiestAfter.total)}
          unit="a week"
          name={data.dataset.agencies[busiestAfter.index]}
          delta={(busiestAfter.total - busiestBefore) / WEEKS_IN_YEAR}
          good="down"
          format={(n) => perWeek(n * WEEKS_IN_YEAR)}
          was={perWeek(busiestBefore)}
          note={`Peaks at ${count(busiestAfter.peak)} in one week`}
        />
      )}
      <Tile
        label="Cardholders who wait"
        tag="Friction"
        value={count(after.cardholdersAffected)}
        unit={`of ${count(holders)}`}
        delta={after.cardholdersAffected - before.cardholdersAffected}
        good="down"
        format={count}
        was={count(before.cardholdersAffected)}
        note="Need approval at least once, or get blocked"
      />
    </div>
  );
}

interface TileProps {
  readonly label: string;
  readonly tag: string;
  readonly value: string;
  readonly unit?: string;
  readonly name?: string | undefined;
  readonly delta?: number;
  readonly good?: 'up' | 'down';
  readonly format?: (value: number) => string;
  readonly was?: string;
  readonly note: string;
}

function Tile({ label, tag, value, unit, name, delta, good, format, was, note }: TileProps) {
  const rounded = delta === undefined || format === undefined ? 0 : format(Math.abs(delta)) === format(0) ? 0 : delta;
  const tone = rounded === 0 ? 'none' : (rounded > 0) === (good === 'up') ? 'good' : 'cost';
  return (
    <div className="tile">
      <div className="tile__label">
        {label}
        <span className="tile__tag">{tag}</span>
      </div>
      <div className="tile__value">
        {value}
        {unit !== undefined && <span className="tile__unit">{unit}</span>}
      </div>
      {name !== undefined && <div className="tile__name" title={name}>{name}</div>}
      <div className="tile__foot">
        {delta !== undefined && format !== undefined && (
          <span className={`tile__delta tile__delta--${tone}`}>
            {rounded !== 0 && <ArrowRightIcon size={13} style={{ transform: `rotate(${rounded > 0 ? -45 : 45}deg)` }} />}
            {signed(rounded, format)}
          </span>
        )}
        {was !== undefined && <span className="tile__was">was {was}</span>}
      </div>
      <div className="tile__was">{note}</div>
    </div>
  );
}
