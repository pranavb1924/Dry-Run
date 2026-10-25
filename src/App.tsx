// The page: state, the engine, and the layout. Both policies live in an undo
// history and in the address bar, so every comparison can be undone and
// shared. The table's view, search and sort are separate: they change what
// you look at, not the policy.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DEFAULT_POLICIES, SCENARIOS } from './app/defaults.ts';
import type { Policies } from './app/defaults.ts';
import { historyReducer, startHistory } from './app/history.ts';
import type { History, HistoryAction } from './app/history.ts';
import { computeTotals } from './app/metrics.ts';
import { decodePolicies, encodePolicies } from './app/share.ts';
import { useEngine } from './app/useEngine.ts';
import type { Policy } from './engine/policy.ts';
import type { Query } from './engine/query.ts';
import { ApprovalsChart } from './ui/charts/ApprovalsChart.tsx';
import { OutcomeMix } from './ui/charts/OutcomeMix.tsx';
import { CategoriesChart, DepartmentsChart } from './ui/charts/Rankings.tsx';
import { Splash, TopBar } from './ui/Chrome.tsx';
import { DetailDrawer } from './ui/DetailDrawer.tsx';
import { CheckIcon } from './ui/icons.tsx';
import { Summary, Tiles } from './ui/Impact.tsx';
import { PolicyPanel } from './ui/PolicyPanel.tsx';
import { Transactions } from './ui/Transactions.tsx';

const reducer = (state: History<Policies>, action: HistoryAction<Policies>): History<Policies> => historyReducer(state, action);

export function App() {
  const [history, dispatch] = useReducer(reducer, null, () => startHistory(decodePolicies(window.location.hash) ?? DEFAULT_POLICIES));
  const policies = history.present;
  const [query, setQuery] = useState<Query>({ view: 'all', search: '', sort: 'newest' });
  const engine = useEngine(policies, query);
  const [selected, setSelected] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const edit = useCallback((next: Policies, group?: string) => {
    dispatch({ type: 'edit', value: next, time: performance.now(), ...(group === undefined ? {} : { group }) });
  }, []);
  const editProposed = useCallback((proposed: Policy, group?: string) => edit({ current: policies.current, proposed }, group), [edit, policies.current]);

  // Keep the address bar in step with the policies, so the URL is always a share link.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.history.replaceState(null, '', `#${encodePolicies(policies)}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [policies]);

  // Undo, redo, and "/" to search. Text fields keep their own undo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z' && !typing) {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
      } else if (mod && event.key.toLowerCase() === 'y' && !typing) {
        event.preventDefault();
        dispatch({ type: 'redo' });
      } else if (event.key === '/' && !typing && !mod) {
        event.preventDefault();
        tableRef.current?.scrollIntoView({ block: 'start' });
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeScenario = useMemo(() => {
    const proposed = JSON.stringify(policies.proposed);
    return SCENARIOS.find((scenario) => JSON.stringify(scenario.apply(policies.current)) === proposed)?.id ?? null;
  }, [policies]);

  const data = engine.status === 'ready' ? engine.data : null;
  const totals = useMemo(() => (data === null ? null : computeTotals(data)), [data]);
  const closeDrawer = useCallback(() => setSelected(null), []);

  if (engine.status === 'loading') {
    return <Splash progress={engine.progress} />;
  }
  if (engine.status === 'error') {
    return <Splash error={engine.message} />;
  }
  if (data === null || totals === null) {
    return <Splash progress={1} />;
  }

  const snapshot = engine.snapshot;

  const share = async (): Promise<void> => {
    const url = `${window.location.origin}${window.location.pathname}#${encodePolicies(policies)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied. It opens this exact comparison.');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <div className="app">
      <TopBar
        transactions={data.dataset.transactions.count}
        evaluateMs={snapshot?.evaluateMs ?? null}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onShare={() => void share()}
        onTogglePanel={() => setPanelOpen(!panelOpen)}
        ruleCount={policies.proposed.length}
      />
      <div className="workspace">
        <PolicyPanel
          policies={policies}
          stats={snapshot?.proposed.stats ?? null}
          data={data}
          totals={totals}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onChangeProposed={editProposed}
          onChangeBoth={(next) => edit(next)}
        />
        <main className="results" id="results">
          {snapshot === null ? (
            <div className="results__inner">
              <p className="summary__sub">Evaluating…</p>
            </div>
          ) : (
            <div className="results__inner">
              <Summary
                policies={policies}
                snapshot={snapshot}
                data={data}
                activeScenario={activeScenario}
                onScenario={(id) => {
                  const scenario = SCENARIOS.find((s) => s.id === id);
                  if (scenario !== undefined) {
                    edit({ current: policies.current, proposed: scenario.apply(policies.current) });
                  }
                }}
              />
              <Tiles snapshot={snapshot} data={data} />
              <div className="grid-wide">
                <ApprovalsChart current={snapshot.current.stats.weeklyApprovals} proposed={snapshot.proposed.stats.weeklyApprovals} />
                <OutcomeMix current={snapshot.current.stats} proposed={snapshot.proposed.stats} />
              </div>
              <div className="grid-2">
                <DepartmentsChart data={data} current={snapshot.current.stats} proposed={snapshot.proposed.stats} />
                <CategoriesChart data={data} current={snapshot.current.stats} proposed={snapshot.proposed.stats} />
              </div>
              <div ref={tableRef} style={{ scrollMarginTop: 16 }}>
                <Transactions
                  data={data}
                  snapshot={snapshot}
                  query={query}
                  onQuery={setQuery}
                  selected={selected}
                  onSelect={setSelected}
                  searchRef={searchRef}
                />
              </div>
              <footer className="summary__sub" style={{ textAlign: 'center', paddingTop: 8 }}>
                Data: State of Oklahoma purchase card transactions, data.ok.gov. The current policy is an example, not the state’s own rules.
              </footer>
            </div>
          )}
        </main>
      </div>

      {selected !== null && snapshot !== null && (
        <DetailDrawer
          index={selected}
          data={data}
          policies={policies}
          snapshot={snapshot}
          onClose={closeDrawer}
          onSearch={(text) => {
            setQuery({ view: 'all', search: text, sort: 'newest' });
            setSelected(null);
            tableRef.current?.scrollIntoView({ block: 'start' });
          }}
        />
      )}

      {toast !== null && (
        <div className="toast" role="status">
          <CheckIcon />
          {toast}
        </div>
      )}
    </div>
  );
}
