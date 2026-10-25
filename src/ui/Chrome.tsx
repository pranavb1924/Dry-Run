// The frame around the app: the top bar, and the screen shown while the
// data loads or if it can't.

import { count } from '../app/format.ts';
import { BoltIcon, Logo, RedoIcon, ShareIcon, SlidersIcon, UndoIcon } from './icons.tsx';

interface TopBarProps {
  readonly transactions: number;
  readonly evaluateMs: number | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onShare: () => void;
  readonly onTogglePanel: () => void;
  readonly ruleCount: number;
}

export function TopBar({ transactions, evaluateMs, canUndo, canRedo, onUndo, onRedo, onShare, onTogglePanel, ruleCount }: TopBarProps) {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const key = mac ? '⌘' : 'Ctrl+';
  return (
    <header className="topbar">
      <button type="button" className="button panel-toggle" onClick={onTogglePanel}>
        <SlidersIcon />
        Policy · {ruleCount}
      </button>
      <div className="brand">
        <Logo />
        <span className="brand__name">Dry Run</span>
      </div>
      <div className="topbar__dataset">
        <span>
          <strong>State of Oklahoma</strong> · purchase cards · fiscal 2026
        </span>
      </div>
      <div className="topbar__actions">
        {evaluateMs !== null && (
          <span className="speed" title="Time to replay the proposed policy over every transaction, in a background thread">
            <span className="speed__dot" />
            <BoltIcon size={13} />
            {count(transactions)} in {evaluateMs < 10 ? evaluateMs.toFixed(1) : Math.round(evaluateMs)} ms
          </span>
        )}
        <button type="button" className="icon-button" aria-label="Undo" title={`Undo (${key}Z)`} disabled={!canUndo} onClick={onUndo}>
          <UndoIcon />
        </button>
        <button type="button" className="icon-button" aria-label="Redo" title={`Redo (${key}⇧Z)`} disabled={!canRedo} onClick={onRedo}>
          <RedoIcon />
        </button>
        <button type="button" className="button button--primary" onClick={onShare}>
          <ShareIcon size={14} />
          Share
        </button>
      </div>
    </header>
  );
}

export function Splash({ progress, error }: { readonly progress?: number; readonly error?: string }) {
  return (
    <main className="splash">
      <div className="splash__card" role="status" aria-live="polite">
        <Logo size={40} />
        {error === undefined ? (
          <>
            <h1 className="splash__title">Loading a year of real card spend</h1>
            <p className="splash__text">416,939 State of Oklahoma purchases, 2.9 MB.</p>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress ?? 0) * 100)}>
              <div className="progress__bar" style={{ width: `${Math.max(4, (progress ?? 0) * 100)}%` }} />
            </div>
            <p className="splash__meta">{Math.round((progress ?? 0) * 100)}%</p>
          </>
        ) : (
          <>
            <h1 className="splash__title">Couldn’t load the data</h1>
            <p className="splash__text">{error}</p>
            <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}
