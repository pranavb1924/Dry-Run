// Connects React to the engine worker: downloads the data, hands it to the
// worker, and re-runs the engine whenever the policies or the table query
// change. The page keeps its own decoded copy of the data to draw the table
// and explain transactions; the worker does all the heavy work.

import { useEffect, useRef, useState } from 'react';
import { decodeDataset } from '../data/format.ts';
import { DATA_URL, download } from '../data/load.ts';
import { EngineClient } from '../engine/client.ts';
import { prepare } from '../engine/prepare.ts';
import type { EngineData } from '../engine/prepare.ts';
import type { Query } from '../engine/query.ts';
import type { Change } from '../engine/stats.ts';
import type { Outcome, Result } from '../engine/worker.ts';
import type { Policies } from './defaults.ts';

export interface Snapshot {
  readonly current: Outcome;
  readonly proposed: Outcome;
  readonly change: Change;
  readonly rows: Uint32Array;
  /** Milliseconds the proposed policy took to evaluate, from the last run that evaluated it. */
  readonly evaluateMs: number;
}

export type EngineState =
  | { readonly status: 'loading'; readonly progress: number }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly data: EngineData; readonly snapshot: Snapshot | null };

export function useEngine(policies: Policies, query: Query): EngineState {
  const [state, setState] = useState<EngineState>({ status: 'loading', progress: 0 });
  const client = useRef<EngineClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    let last: Snapshot | null = null;

    const onResult = (result: Result): void => {
      const current = result.current ?? last?.current;
      const proposed = result.proposed ?? last?.proposed;
      if (cancelled || current === undefined || proposed === undefined) {
        return;
      }
      last = {
        current,
        proposed,
        change: result.change,
        rows: result.rows,
        evaluateMs: result.evaluateMs ?? last?.evaluateMs ?? 0,
      };
      const snapshot = last;
      setState((previous) => (previous.status === 'ready' ? { ...previous, snapshot } : previous));
    };
    const onError = (message: string): void => {
      if (!cancelled) {
        setState({ status: 'error', message });
      }
    };

    const engine = new EngineClient(onResult, onError);
    client.current = engine;

    download(DATA_URL, (progress) => {
      if (!cancelled) {
        setState({ status: 'loading', progress });
      }
    })
      .then(async (buffer) => {
        // The worker takes the original buffer; the page decodes its own copy.
        const data = prepare(decodeDataset(buffer.slice(0)));
        await engine.load(buffer);
        if (!cancelled) {
          setState({ status: 'ready', data, snapshot: null });
        }
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)));

    return () => {
      cancelled = true;
      engine.dispose();
      client.current = null;
    };
  }, []);

  const ready = state.status === 'ready';
  useEffect(() => {
    if (ready) {
      client.current?.run(policies.current, policies.proposed, query);
    }
  }, [ready, policies, query]);

  return state;
}
