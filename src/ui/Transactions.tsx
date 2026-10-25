// Every transaction, filtered by view and search, with its outcome under
// both policies. The engine worker finds the matching rows; this component
// only draws the ~20 that are on screen.
//
// 416,939 rows at 56px would be about 23 million pixels tall, more than
// browsers allow an element to be (Firefox stops near 17.9 million). Past a
// cap, the scrollbar is scaled: each pixel scrolled moves a little more than
// one pixel of rows, and the rows on screen are placed exactly.

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { count, money, shortDay } from '../app/format.ts';
import type { Snapshot } from '../app/useEngine.ts';
import { LEVEL_LABELS } from '../engine/policy.ts';
import type { EngineData } from '../engine/prepare.ts';
import { SORTS, VIEWS } from '../engine/query.ts';
import type { Query, Sort, View } from '../engine/query.ts';
import { ArrowRightIcon, SearchIcon } from './icons.tsx';
import { OutcomeBadge } from './Outcome.tsx';

const ROW = 56;
const MAX_HEIGHT = 8_000_000;
const OVERSCAN = 6;

const VIEW_LABELS: Readonly<Record<View, string>> = {
  all: 'All',
  changed: 'Changed',
  flagged: 'Flagged',
  approval: 'Needs approval',
  blocked: 'Blocked',
};

const SORT_LABELS: Readonly<Record<Sort, string>> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  largest: 'Largest first',
  smallest: 'Smallest first',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TransactionsProps {
  readonly data: EngineData;
  readonly snapshot: Snapshot;
  readonly query: Query;
  readonly onQuery: (query: Query) => void;
  readonly selected: number | null;
  readonly onSelect: (index: number) => void;
  readonly searchRef: RefObject<HTMLInputElement | null>;
}

export function Transactions({ data, snapshot, query, onQuery, selected, onSelect, searchRef }: TransactionsProps) {
  const after = snapshot.proposed.stats;
  const counts: Readonly<Record<View, number>> = {
    all: data.dataset.transactions.count,
    changed: snapshot.change.stricter + snapshot.change.looser,
    flagged: after.count[1]!,
    approval: after.count[2]! + after.count[3]!,
    blocked: after.count[4]!,
  };

  return (
    <section className="card transactions" aria-label="Transactions">
      <div className="transactions__header">
        <div className="transactions__top">
          <div>
            <h2 className="card__title">Transactions</h2>
            <p className="card__subtitle">
              {count(snapshot.rows.length)} {snapshot.rows.length === 1 ? 'transaction' : 'transactions'} · select one to see why it got its outcome
            </p>
          </div>
          <div className="transactions__controls">
            <label className="input transactions__search">
              <SearchIcon />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search merchants or people"
                aria-label="Search transactions by merchant, cardholder, department or category"
                value={query.search}
                onChange={(event) => onQuery({ ...query, search: event.target.value })}
              />
              {query.search === '' && <kbd>/</kbd>}
            </label>
            <select className="select" aria-label="Sort" value={query.sort} onChange={(event) => onQuery({ ...query, sort: event.target.value as Sort })}>
              {SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Views">
          {VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              role="tab"
              className="tab"
              aria-selected={query.view === view}
              onClick={() => onQuery({ ...query, view })}
            >
              {VIEW_LABELS[view]}
              <span className="tab__count">{count(counts[view])}</span>
            </button>
          ))}
        </div>
      </div>
      <Rows data={data} snapshot={snapshot} selected={selected} onSelect={onSelect} resetKey={`${query.view}|${query.search}|${query.sort}`} />
    </section>
  );
}

function Rows({
  data,
  snapshot,
  selected,
  onSelect,
  resetKey,
}: {
  readonly data: EngineData;
  readonly snapshot: Snapshot;
  readonly selected: number | null;
  readonly onSelect: (index: number) => void;
  readonly resetKey: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(560);
  const [focused, setFocused] = useState<number | null>(null);
  const { rows } = snapshot;

  // A new view, search or sort starts at the top; a policy edit keeps the place.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setScrollTop(0);
    setFocused(null);
  }, [resetKey]);

  useEffect(() => {
    const element = scroller.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(() => setViewport(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const natural = rows.length * ROW;
  const height = Math.min(natural, MAX_HEIGHT);
  const scale = height > viewport ? (natural - viewport) / (height - viewport) : 1;
  const offset = scrollTop * scale;
  const first = Math.max(0, Math.floor(offset / ROW) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((offset + viewport) / ROW) + OVERSCAN);

  /** Scrolls so a row is on screen, and focuses it once it's drawn. */
  const focusRow = (position: number): void => {
    const element = scroller.current;
    if (element === null) {
      return;
    }
    const top = position * ROW;
    if (top < offset) {
      element.scrollTop = top / scale;
    } else if (top + ROW > offset + viewport) {
      element.scrollTop = (top + ROW - viewport) / scale;
    }
    setFocused(position);
  };

  useEffect(() => {
    if (focused !== null) {
      scroller.current?.querySelector<HTMLElement>(`[data-position="${focused}"]`)?.focus({ preventScroll: true });
    }
  }, [focused, first]);

  const keys = (event: KeyboardEvent<HTMLButtonElement>, position: number): void => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      focusRow(Math.max(0, Math.min(rows.length - 1, position + move)));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusRow(event.key === 'Home' ? 0 : rows.length - 1);
    }
  };

  const t = data.dataset.transactions;
  const { dataset } = data;
  const before = snapshot.current.evaluation.level;
  const after = snapshot.proposed.evaluation.level;

  const drawn = [];
  for (let position = first; position < last; position++) {
    const i = rows[position]!;
    const amount = t.amountCents[i]!;
    const from = before[i]!;
    const to = after[i]!;
    const merchant = dataset.merchants[t.merchant[i]!]!;
    const holder = dataset.cardholders[t.cardholder[i]!]!.name;
    const department = dataset.agencies[data.agency[i]!]!;
    const category = dataset.categories[t.category[i]!]!;
    drawn.push(
      <button
        key={i}
        type="button"
        className="vrow"
        data-position={position}
        aria-selected={selected === i}
        aria-label={`${shortDay(t.day[i]!)}, ${merchant}, ${money(amount)}, ${holder}. Current policy: ${LEVEL_LABELS[from]}. Proposed: ${LEVEL_LABELS[to]}.`}
        style={{ top: position * ROW - offset + scrollTop }}
        onClick={() => onSelect(i)}
        onKeyDown={(event) => keys(event, position)}
        onFocus={() => setFocused(position)}
      >
        <span className="cell col-date">
          <span className="cell__main tabular">{shortDay(t.day[i]!)}</span>
          <span className="cell__sub">{WEEKDAYS[t.weekday[i]!]}</span>
        </span>
        <span className="cell">
          <span className="cell__main">{merchant}</span>
          <span className="cell__sub">
            {category}
            {t.described[i] === 0 && ' · no description'}
          </span>
        </span>
        <span className="cell col-cardholder">
          <span className="cell__main">{holder}</span>
          <span className="cell__sub">{department}</span>
        </span>
        <span className="cell num">
          <span className={amount < 0 ? 'cell__main cell__amount cell__amount--refund' : 'cell__main cell__amount'}>{money(amount)}</span>
          {amount < 0 && <span className="cell__sub">Refund</span>}
        </span>
        <span className={from === to ? 'outcome' : 'outcome outcome--changed'}>
          {from === to ? (
            <OutcomeBadge level={to} short />
          ) : (
            <>
              <OutcomeBadge level={from} short muted />
              <ArrowRightIcon size={13} />
              <OutcomeBadge level={to} short />
            </>
          )}
        </span>
      </button>,
    );
  }

  return (
    <>
      <div className="vtable__head" style={{ overflowY: 'hidden', scrollbarGutter: 'stable' }} aria-hidden="true">
        <span className="col-date">Date</span>
        <span>Merchant</span>
        <span className="col-cardholder">Cardholder</span>
        <span className="num">Amount</span>
        <span className="col-outcome-head">Current → proposed</span>
      </div>
      <div ref={scroller} className="vtable" style={{ scrollbarGutter: 'stable' }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        {rows.length === 0 ? (
          <div className="vtable__empty">
            <div>
              <strong>No transactions match</strong>
              <p>Try another view, or clear the search.</p>
            </div>
          </div>
        ) : (
          <div className="vtable__spacer" style={{ height }}>
            {drawn}
          </div>
        )}
      </div>
    </>
  );
}
