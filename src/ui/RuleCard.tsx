// One rule, edited in place: its name, whether it's on, what it does, and
// when it applies. The footer shows what the rule decides on its own.

import type { CSSProperties } from 'react';
import { conditionLabel, describeRule } from '../app/describe.ts';
import { replaceCondition, removeCondition } from '../app/edit.ts';
import { compactMoney, count } from '../app/format.ts';
import type { Totals } from '../app/metrics.ts';
import { ACTION_LABELS, ACTIONS, levelOf } from '../engine/policy.ts';
import type { Action, Condition, Rule } from '../engine/policy.ts';
import type { EngineData } from '../engine/prepare.ts';
import { ConditionEditor } from './ConditionEditor.tsx';
import { CheckIcon, ChevronDownIcon, CloseIcon, CopyIcon, MoreIcon, PlusIcon, TrashIcon } from './icons.tsx';
import { levelColor } from './Outcome.tsx';
import { Popover, usePopover } from './Popover.tsx';

const ACTION_HINTS: Readonly<Record<Action, string>> = {
  flag: 'Allowed, then flagged for finance to review',
  approval: "Held until the cardholder's department approves",
  finance: 'Held until central finance approves',
  block: 'Declined at the card',
};

const EMPTY_LABELS: Readonly<Partial<Record<Condition['kind'], string>>> = {
  category: 'Choose categories',
  merchant: 'Choose merchants',
  department: 'Choose departments',
};

const NEW_CONDITIONS: readonly { readonly kind: Condition['kind']; readonly label: string; readonly make: () => Condition }[] = [
  { kind: 'over', label: 'Amount is over', make: () => ({ kind: 'over', cents: 100_000 }) },
  { kind: 'under', label: 'Amount is under', make: () => ({ kind: 'under', cents: 10_000 }) },
  { kind: 'category', label: 'Category', make: () => ({ kind: 'category', names: [] }) },
  { kind: 'merchant', label: 'Merchant', make: () => ({ kind: 'merchant', names: [] }) },
  { kind: 'department', label: 'Department', make: () => ({ kind: 'department', names: [] }) },
  { kind: 'weekend', label: 'On a weekend', make: () => ({ kind: 'weekend' }) },
  { kind: 'noDescription', label: 'Has no description', make: () => ({ kind: 'noDescription' }) },
];

interface RuleCardProps {
  readonly rule: Rule;
  readonly status: 'new' | 'changed' | 'same';
  /** What the rule decides under the proposed policy, or null before the first result. */
  readonly decides: { readonly count: number; readonly spend: number; readonly share: number } | null;
  readonly data: EngineData;
  readonly totals: Totals;
  readonly onChange: (rule: Rule, group?: string) => void;
  readonly onRemove: () => void;
  readonly onDuplicate: () => void;
}

export function RuleCard({ rule, status, decides, data, totals, onChange, onRemove, onDuplicate }: RuleCardProps) {
  const popover = usePopover();
  const level = levelOf(rule.action);
  const usedKinds = new Set(rule.conditions.map((c) => c.kind));
  const editing = popover.openKey?.startsWith('condition:') ? Number(popover.openKey.slice('condition:'.length)) : null;
  const editingCondition = editing === null ? undefined : rule.conditions[editing];

  const className = ['rule', status !== 'same' && `rule--${status}`, !rule.enabled && 'rule--off'].filter(Boolean).join(' ');

  return (
    <li className={className} aria-label={`${rule.name}: ${describeRule(rule)}`}>
      <div className="rule__top">
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={rule.enabled}
          aria-label={rule.enabled ? 'Turn rule off' : 'Turn rule on'}
          onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
        />
        <input
          className="rule__name"
          aria-label="Rule name"
          value={rule.name}
          maxLength={80}
          onChange={(event) => onChange({ ...rule, name: event.target.value }, `name:${rule.id}`)}
        />
        {status !== 'same' && <span className="badge badge--accent">{status === 'new' ? 'New' : 'Changed'}</span>}
        <button
          type="button"
          className="icon-button icon-button--small"
          aria-label="More actions"
          aria-haspopup="menu"
          onClick={(event) => popover.toggle('more', event.currentTarget)}
        >
          <MoreIcon />
        </button>
      </div>

      <div className="rule__body">
        <div className="rule__line">
          <span className="rule__label">Then</span>
          <button
            type="button"
            className="action-picker"
            aria-haspopup="menu"
            onClick={(event) => popover.toggle('action', event.currentTarget)}
            style={{ '--dot': levelColor(level) } as CSSProperties}
          >
            <span className="level-dot" />
            {ACTION_LABELS[rule.action]}
            <ChevronDownIcon />
          </button>
        </div>

        <div className="rule__line">
          <span className="rule__label">When</span>
          <div className="rule__conditions">
            {rule.conditions.length === 0 && (
              <span className="chip">
                <span className="chip__label chip__label--static">Any purchase</span>
              </span>
            )}
            {rule.conditions.map((condition, index) => {
              const editable = condition.kind !== 'weekend' && condition.kind !== 'noDescription';
              const empty = 'names' in condition && condition.names.length === 0;
              return (
                <span key={`${condition.kind}-${index}`} className="chip">
                  {editable ? (
                    <button
                      type="button"
                      className={empty ? 'chip__label chip__label--empty' : 'chip__label'}
                      aria-haspopup="dialog"
                      onClick={(event) => popover.toggle(`condition:${index}`, event.currentTarget)}
                    >
                      {empty ? EMPTY_LABELS[condition.kind] : conditionLabel(condition)}
                    </button>
                  ) : (
                    <span className="chip__label chip__label--static">{conditionLabel(condition)}</span>
                  )}
                  <button
                    type="button"
                    className="chip__remove"
                    aria-label={`Remove “${conditionLabel(condition)}”`}
                    onClick={() => onChange(removeCondition(rule, index))}
                  >
                    <CloseIcon size={12} />
                  </button>
                </span>
              );
            })}
            {usedKinds.size < NEW_CONDITIONS.length && (
              <button
                type="button"
                className="chip chip--add"
                aria-haspopup="menu"
                onClick={(event) => popover.toggle('add', event.currentTarget)}
              >
                <PlusIcon size={13} />
                Condition
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rule__footer" style={{ '--dot': levelColor(level) } as CSSProperties}>
        {!rule.enabled ? (
          <span>Off. Turn it on to include it.</span>
        ) : decides === null ? (
          <span>Evaluating…</span>
        ) : decides.count === 0 ? (
          <span>Decides no purchases on its own</span>
        ) : (
          <>
            <span>
              Decides <strong>{count(decides.count)}</strong> purchases · <strong>{compactMoney(decides.spend)}</strong>
            </span>
            <span className="rule__meter" title={`${(decides.share * 100).toFixed(1)}% of all spend`}>
              <span style={{ width: `${Math.max(4, decides.share * 100)}%` }} />
            </span>
          </>
        )}
      </div>

      {popover.openKey === 'action' && (
        <Popover anchor={popover.anchor} onClose={popover.close} label="Action" width={300}>
          <div className="popover__body" role="menu">
            {ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                role="menuitemradio"
                aria-checked={rule.action === action}
                className="menu-item"
                style={{ '--dot': levelColor(levelOf(action)) } as CSSProperties}
                onClick={() => {
                  onChange({ ...rule, action });
                  popover.close();
                }}
              >
                <span className="level-dot" />
                <span className="menu-item__text">
                  <span className="menu-item__label">{ACTION_LABELS[action]}</span>
                  <span className="menu-item__hint">{ACTION_HINTS[action]}</span>
                </span>
                {rule.action === action && <CheckIcon />}
              </button>
            ))}
          </div>
        </Popover>
      )}

      {popover.openKey === 'add' && (
        <Popover anchor={popover.anchor} onClose={popover.close} label="Add a condition" width={240}>
          <div className="popover__body" role="menu">
            {NEW_CONDITIONS.filter((option) => !usedKinds.has(option.kind)).map((option) => (
              <button
                key={option.kind}
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={(event) => {
                  const conditions = [...rule.conditions, option.make()];
                  onChange({ ...rule, conditions });
                  const anchor = popover.anchor;
                  popover.close();
                  // Open the new condition's editor right away, where it has one.
                  if (option.kind !== 'weekend' && option.kind !== 'noDescription' && anchor !== null) {
                    popover.toggle(`condition:${conditions.length - 1}`, anchor);
                  }
                  event.preventDefault();
                }}
              >
                <span className="menu-item__label">{option.label}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}

      {editing !== null && editingCondition !== undefined && (
        <Popover anchor={popover.anchor} onClose={popover.close} label="Edit condition" width={editingCondition.kind === 'over' || editingCondition.kind === 'under' ? 280 : 340}>
          <ConditionEditor
            condition={editingCondition}
            data={data}
            totals={totals}
            onChange={(condition) => onChange(replaceCondition(rule, editing, condition), `condition:${rule.id}:${editing}`)}
          />
        </Popover>
      )}

      {popover.openKey === 'more' && (
        <Popover anchor={popover.anchor} onClose={popover.close} label="Rule actions" width={200} align="end">
          <div className="popover__body" role="menu">
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                onDuplicate();
                popover.close();
              }}
            >
              <CopyIcon />
              <span className="menu-item__label">Duplicate</span>
            </button>
            <div className="menu-separator" />
            <button
              type="button"
              role="menuitem"
              className="menu-item menu-item--danger"
              onClick={() => {
                onRemove();
                popover.close();
              }}
            >
              <TrashIcon />
              <span className="menu-item__label">Delete rule</span>
            </button>
          </div>
        </Popover>
      )}
    </li>
  );
}
