// The left panel: the proposed policy's rules, edited in place, with the
// current policy below for reference. Rules the proposal drops stay visible,
// struck through, so they can be restored.

import type { Policies } from '../app/defaults.ts';
import { describeRule } from '../app/describe.ts';
import { duplicateRule, newRule, removedRules, removeRule, ruleStatus, updateRule } from '../app/edit.ts';
import { totalSpend } from '../app/metrics.ts';
import type { Totals } from '../app/metrics.ts';
import type { Policy } from '../engine/policy.ts';
import { MAX_RULES } from '../engine/policy.ts';
import type { EngineData } from '../engine/prepare.ts';
import type { Stats } from '../engine/stats.ts';
import { ChevronDownIcon, PlusIcon, ResetIcon } from './icons.tsx';
import { RuleCard } from './RuleCard.tsx';

interface PolicyPanelProps {
  readonly policies: Policies;
  readonly stats: Stats | null;
  readonly data: EngineData;
  readonly totals: Totals;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onChangeProposed: (proposed: Policy, group?: string) => void;
  readonly onChangeBoth: (policies: Policies) => void;
}

export function PolicyPanel({ policies, stats, data, totals, open, onClose, onChangeProposed, onChangeBoth }: PolicyPanelProps) {
  const { current, proposed } = policies;
  const statuses = proposed.map((rule) => ruleStatus(rule, current));
  const removed = removedRules(current, proposed);
  const added = statuses.filter((s) => s === 'new').length;
  const changed = statuses.filter((s) => s === 'changed').length;
  const same = added === 0 && changed === 0 && removed.length === 0 && proposed.length === current.length;
  const allSpend = stats === null ? 0 : totalSpend(stats);

  const differences = [
    added > 0 && `${added} new`,
    changed > 0 && `${changed} changed`,
    removed.length > 0 && `${removed.length} removed`,
  ].filter(Boolean);

  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={open ? 'policy policy--open' : 'policy'} aria-label="Proposed policy">
        <div className="policy__header">
          <div>
            <h2 className="policy__title">Proposed policy</h2>
            <p className="policy__subtitle">
              {proposed.length} {proposed.length === 1 ? 'rule' : 'rules'} · {same ? 'same as current' : differences.join(', ')}
            </p>
          </div>
          <div className="policy__header-actions">
            <button
              type="button"
              className="button button--small"
              disabled={same}
              onClick={() => onChangeBoth({ current, proposed: current })}
              title="Throw away the proposed changes"
            >
              <ResetIcon size={14} />
              Reset
            </button>
          </div>
        </div>

        <div className="policy__scroll">
          <ul className="rules">
            {proposed.map((rule, position) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                status={statuses[position]!}
                decides={
                  stats === null
                    ? null
                    : {
                        count: stats.ruleCount[position]!,
                        spend: stats.ruleSpend[position]!,
                        share: allSpend === 0 ? 0 : stats.ruleSpend[position]! / allSpend,
                      }
                }
                data={data}
                totals={totals}
                onChange={(next, group) => onChangeProposed(updateRule(proposed, rule.id, () => next), group)}
                onRemove={() => onChangeProposed(removeRule(proposed, rule.id))}
                onDuplicate={() => onChangeProposed(duplicateRule(proposed, rule.id))}
              />
            ))}
            {removed.map((rule) => (
              <li key={rule.id} className="rule rule--removed">
                <span>
                  <strong>{rule.name}</strong> removed
                </span>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => {
                    // Put it back where it was in the current policy.
                    const index = current.findIndex((r) => r.id === rule.id);
                    const before = current.slice(0, index).map((r) => r.id);
                    const at = proposed.reduce((spot, r, i) => (before.includes(r.id) ? i + 1 : spot), 0);
                    onChangeProposed([...proposed.slice(0, at), rule, ...proposed.slice(at)]);
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="add-rule"
            disabled={proposed.length >= MAX_RULES}
            onClick={() => onChangeProposed([...proposed, newRule()])}
          >
            <PlusIcon />
            Add rule
          </button>

          <details className="current-policy">
            <summary>
              Current policy
              <span className="current-policy__hint">{current.length} rules</span>
              <ChevronDownIcon />
            </summary>
            <ol>
              {current.map((rule) => (
                <li key={rule.id}>
                  <strong>{rule.enabled ? rule.name : `${rule.name} (off)`}</strong>
                  <span>{describeRule(rule)}</span>
                </li>
              ))}
            </ol>
            <div className="current-policy__actions">
              <button type="button" className="button button--small" disabled={same} onClick={() => onChangeBoth({ current: proposed, proposed })}>
                Make the proposal current
              </button>
            </div>
          </details>
        </div>
      </aside>
    </>
  );
}
