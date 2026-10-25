// One transaction in full, and why it got its outcome: every rule, which of
// its conditions this purchase meets, and which rule decided. The proposed
// policy is open; the current one is folded below it.

import { useEffect, useRef } from 'react';
import type { Policies } from '../app/defaults.ts';
import { conditionPhrase } from '../app/describe.ts';
import { longDay, money, threshold } from '../app/format.ts';
import type { Snapshot } from '../app/useEngine.ts';
import { NO_RULE } from '../engine/evaluate.ts';
import { explain } from '../engine/explain.ts';
import type { RuleCheck } from '../engine/explain.ts';
import { ACTION_LABELS, levelOf } from '../engine/policy.ts';
import type { Condition, Policy } from '../engine/policy.ts';
import type { EngineData } from '../engine/prepare.ts';
import { ArrowRightIcon, CheckIcon, CloseIcon, SearchIcon } from './icons.tsx';
import { OutcomeBadge } from './Outcome.tsx';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DetailDrawerProps {
  readonly index: number;
  readonly data: EngineData;
  readonly policies: Policies;
  readonly snapshot: Snapshot;
  readonly onClose: () => void;
  readonly onSearch: (text: string) => void;
}

export function DetailDrawer({ index: i, data, policies, snapshot, onClose, onSearch }: DetailDrawerProps) {
  const close = useRef<HTMLButtonElement>(null);
  const { dataset } = data;
  const t = dataset.transactions;
  const amount = t.amountCents[i]!;
  const merchant = dataset.merchants[t.merchant[i]!]!;

  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const facts: [string, string][] = [
    ['Date', longDay(t.day[i]!)],
    ['Cardholder', dataset.cardholders[t.cardholder[i]!]!.name],
    ['Department', dataset.agencies[data.agency[i]!]!],
    ['Category', dataset.categories[t.category[i]!]!],
    ['Merchant type', titleCase(dataset.mccs[t.mcc[i]!]!)],
    ['Description', t.described[i] === 1 ? 'Has an item description' : 'Only “General purchase”'],
  ];

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${merchant}, ${money(amount)}`}>
        <div className="drawer__header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="drawer__eyebrow">{amount < 0 ? 'Refund' : 'Purchase'}</p>
            <h2 className="drawer__title">{merchant}</h2>
            <p className="drawer__amount">{money(amount)}</p>
          </div>
          <button ref={close} type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="drawer__body">
          <section className="drawer__section">
            <div className="verdicts">
              <div className="verdict">
                Current policy
                <OutcomeBadge level={snapshot.current.evaluation.level[i]!} />
              </div>
              <ArrowRightIcon />
              <div className="verdict">
                Proposed policy
                <OutcomeBadge level={snapshot.proposed.evaluation.level[i]!} />
              </div>
            </div>
          </section>

          <section className="drawer__section">
            <h3 className="drawer__section-title">Details</h3>
            <dl className="facts">
              {facts.map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="drawer__section">
            <h3 className="drawer__section-title">Why, under the proposed policy</h3>
            <Checks data={data} policy={policies.proposed} index={i} decided={snapshot.proposed.evaluation.rule[i]!} />
          </section>

          <section className="drawer__section">
            <details>
              <summary>Why, under the current policy</summary>
              <Checks data={data} policy={policies.current} index={i} decided={snapshot.current.evaluation.rule[i]!} />
            </details>
          </section>

          <section className="drawer__section">
            <button type="button" className="button" onClick={() => onSearch(merchant)}>
              <SearchIcon size={14} />
              Every transaction at {merchant}
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}

function Checks({ data, policy, index, decided }: { readonly data: EngineData; readonly policy: Policy; readonly index: number; readonly decided: number }) {
  const amount = data.dataset.transactions.amountCents[index]!;
  if (amount <= 0) {
    return <p className="check__note">Refunds never match a rule, so this one is allowed under any policy.</p>;
  }
  if (policy.length === 0) {
    return <p className="check__note">This policy has no rules, so everything is allowed.</p>;
  }
  const checks = explain(data, policy, index);
  return (
    <>
      <p className="check__note" style={{ marginBottom: 10 }}>
        {decided === NO_RULE
          ? 'No rule applies, so the purchase is allowed.'
          : 'Several rules can apply. The strictest one decides, and between equally strict rules, the one listed first.'}
      </p>
      <ul className="checks">
        {checks.map((check) => (
          <CheckItem key={check.rule.id} check={check} decides={check.position === decided} data={data} index={index} />
        ))}
      </ul>
    </>
  );
}

function CheckItem({ check, decides, data, index }: { readonly check: RuleCheck; readonly decides: boolean; readonly data: EngineData; readonly index: number }) {
  const { rule } = check;
  const className = ['check', decides && 'check--decides', !rule.enabled && 'check--off'].filter(Boolean).join(' ');
  return (
    <li className={className}>
      <div className="check__top">
        {rule.name}
        <OutcomeBadge level={levelOf(rule.action)} short muted={!check.applies} />
      </div>
      <p className="check__note">
        {!rule.enabled
          ? 'Off'
          : decides
            ? `Decides the outcome: ${ACTION_LABELS[rule.action].toLowerCase()}`
            : check.applies
              ? 'Applies, but a stricter or earlier rule decides'
              : 'Doesn’t apply'}
      </p>
      {check.checks.length > 0 && (
        <ul>
          {check.checks.map(({ condition, met }, n) => (
            <li key={n}>
              {met ? <CheckIcon size={14} className="icon met" /> : <CloseIcon size={14} className="icon unmet" />}
              <span>
                {capitalize(conditionPhrase(condition))} <em>· {actual(condition, data, index)}</em>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** What this transaction actually has, next to what the condition asks for. */
function actual(condition: Condition, data: EngineData, i: number): string {
  const { dataset } = data;
  const t = dataset.transactions;
  switch (condition.kind) {
    case 'over':
    case 'under':
      return `this is ${threshold(t.amountCents[i]!)}`;
    case 'category':
      return `this is ${dataset.categories[t.category[i]!]}`;
    case 'merchant':
      return `this is ${dataset.merchants[t.merchant[i]!]}`;
    case 'department':
      return `this is ${dataset.agencies[data.agency[i]!]}`;
    case 'weekend':
      return `this was a ${WEEKDAYS[t.weekday[i]!]}`;
    case 'noDescription':
      return t.described[i] === 1 ? 'this one has a description' : 'it says only “General purchase”';
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
