// The editors that open from a condition chip: an amount field with quick
// picks, or a searchable checklist of categories, merchants or departments,
// each shown with its yearly spend so the choice is informed.

import { useMemo, useState } from 'react';
import type { Condition } from '../engine/policy.ts';
import type { EngineData } from '../engine/prepare.ts';
import type { Totals } from '../app/metrics.ts';
import { compactMoney } from '../app/format.ts';
import { CheckIcon, SearchIcon } from './icons.tsx';

const QUICK_AMOUNTS = [100, 250, 500, 1_000, 2_500, 5_000, 10_000];
const MAX_SHOWN = 80;

interface EditorProps {
  readonly condition: Condition;
  readonly onChange: (condition: Condition) => void;
  readonly data: EngineData;
  readonly totals: Totals;
}

export function ConditionEditor({ condition, onChange, data, totals }: EditorProps) {
  switch (condition.kind) {
    case 'over':
    case 'under':
      return <AmountEditor condition={condition} onChange={onChange} />;
    case 'category':
      return (
        <NamesEditor
          title="Category is any of"
          names={data.dataset.categories}
          spend={totals.categories}
          selected={condition.names}
          onChange={(names) => onChange({ ...condition, names })}
        />
      );
    case 'merchant':
      return (
        <NamesEditor
          title="Merchant is any of"
          names={data.dataset.merchants}
          spend={totals.merchants}
          selected={condition.names}
          onChange={(names) => onChange({ ...condition, names })}
          searchPlaceholder={`Search ${data.dataset.merchants.length.toLocaleString()} merchants`}
        />
      );
    case 'department':
      return (
        <NamesEditor
          title="Department is any of"
          names={data.dataset.agencies}
          spend={totals.agencies}
          selected={condition.names}
          onChange={(names) => onChange({ ...condition, names })}
          searchPlaceholder={`Search ${data.dataset.agencies.length} departments`}
        />
      );
    case 'weekend':
    case 'noDescription':
      return null;
  }
}

function AmountEditor({
  condition,
  onChange,
}: {
  readonly condition: Extract<Condition, { kind: 'over' | 'under' }>;
  readonly onChange: (condition: Condition) => void;
}) {
  const [text, setText] = useState(String(condition.cents / 100));

  const type = (value: string): void => {
    setText(value);
    const dollars = Number(value.replace(/[$,\s]/g, ''));
    if (value.trim() !== '' && Number.isFinite(dollars) && dollars >= 0) {
      onChange({ ...condition, cents: Math.round(dollars * 100) });
    }
  };

  return (
    <>
      <div className="popover__header">{condition.kind === 'over' ? 'Amount is over' : 'Amount is under'}</div>
      <div className="popover__body">
        <label className="input" style={{ margin: '2px 4px 10px' }}>
          <span>$</span>
          <input
            autoFocus
            inputMode="decimal"
            aria-label="Amount in dollars"
            value={text}
            onChange={(event) => type(event.target.value)}
            onFocus={(event) => event.target.select()}
          />
        </label>
        <div className="quick-picks">
          {QUICK_AMOUNTS.map((dollars) => (
            <button
              key={dollars}
              type="button"
              className="quick-pick"
              aria-pressed={condition.cents === dollars * 100}
              onClick={() => {
                setText(String(dollars));
                onChange({ ...condition, cents: dollars * 100 });
              }}
            >
              ${dollars.toLocaleString()}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function NamesEditor({
  title,
  names,
  spend,
  selected,
  onChange,
  searchPlaceholder,
}: {
  readonly title: string;
  readonly names: readonly string[];
  readonly spend: Float64Array;
  readonly selected: readonly string[];
  readonly onChange: (names: readonly string[]) => void;
  readonly searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState('');
  const bySpend = useMemo(() => names.map((_, i) => i).sort((a, b) => spend[b]! - spend[a]!), [names, spend]);
  const lower = useMemo(() => names.map((name) => name.toLowerCase()), [names]);
  const ids = useMemo(() => new Map(names.map((name, i) => [name, i])), [names]);

  const chosen = new Set(selected);
  const needle = search.trim().toLowerCase();
  const matches = bySpend.filter((i) => !chosen.has(names[i]!) && (needle === '' || lower[i]!.includes(needle)));
  const shown = [...selected.flatMap((name) => ids.get(name) ?? []), ...matches].slice(0, MAX_SHOWN + selected.length);

  const toggle = (name: string): void => {
    onChange(chosen.has(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  };

  return (
    <>
      <div className="popover__header">{title}</div>
      {searchPlaceholder !== undefined && (
        <div style={{ padding: '6px 10px 2px' }}>
          <label className="input">
            <SearchIcon />
            <input autoFocus placeholder={searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
      )}
      <div className="popover__body" role="listbox" aria-multiselectable="true" aria-label={title}>
        {shown.map((i) => {
          const name = names[i]!;
          return (
            <button key={name} type="button" role="option" className="option" aria-checked={chosen.has(name)} aria-selected={chosen.has(name)} onClick={() => toggle(name)}>
              <span className="option__box">
                <CheckIcon size={12} strokeWidth={2.2} />
              </span>
              <span className="option__name">{name}</span>
              <span className="option__meta">{compactMoney(spend[i]!)}</span>
            </button>
          );
        })}
        {shown.length === 0 && <div className="option-empty">Nothing matches “{search}”</div>}
        {matches.length > MAX_SHOWN && <div className="option-empty">{(matches.length - MAX_SHOWN).toLocaleString()} more. Search to narrow down.</div>}
      </div>
      <div className="popover__footer">
        <span>{selected.length === 0 ? 'Pick at least one' : `${selected.length} selected`}</span>
        {selected.length > 0 && (
          <button type="button" className="button button--ghost button--small" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
    </>
  );
}
