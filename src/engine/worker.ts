// Runs the engine off the main thread, so the page stays responsive while a
// policy is evaluated. The page sends the data once, then a "run" for every
// change to the policies or the table's view. Results come back as
// transferred typed arrays, which moves them without copying.

import { decodeDataset } from '../data/format.ts';
import { evaluate } from './evaluate.ts';
import type { Evaluation } from './evaluate.ts';
import type { Policy } from './policy.ts';
import { prepare } from './prepare.ts';
import type { EngineData } from './prepare.ts';
import { createFinder } from './query.ts';
import type { Finder, Query } from './query.ts';
import { compare, summarize } from './stats.ts';
import type { Change, Stats } from './stats.ts';

export type Request =
  | { readonly type: 'load'; readonly buffer: ArrayBuffer }
  | { readonly type: 'run'; readonly id: number; readonly current: Policy; readonly proposed: Policy; readonly query: Query };

export interface Outcome {
  readonly evaluation: Evaluation;
  readonly stats: Stats;
}

export interface Result {
  readonly id: number;
  /** Each policy's outcome, or null when that policy hasn't changed since the last result. */
  readonly current: Outcome | null;
  readonly proposed: Outcome | null;
  readonly change: Change;
  /** The transactions the table shows, in order. */
  readonly rows: Uint32Array;
  /** How long evaluating the proposed policy took, in milliseconds, or null if it didn't change. */
  readonly evaluateMs: number | null;
  /** How long the whole run took, in milliseconds. */
  readonly totalMs: number;
}

export type Response =
  | { readonly type: 'ready' }
  | ({ readonly type: 'result' } & Result)
  | { readonly type: 'error'; readonly message: string };

// In a worker, `self` is the worker's global scope. The project's types
// describe a browser window, so declare just the two members used here.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: Response, options?: { transfer?: Transferable[] }): void;
};

let data: EngineData | null = null;
let find: Finder | null = null;
const latest: Record<'current' | 'proposed', { key: string; outcome: Outcome } | null> = { current: null, proposed: null };
let change: Change = { stricter: 0, stricterSpend: 0, looser: 0, looserSpend: 0 };

scope.onmessage = (event) => {
  const request = event.data;
  try {
    if (request.type === 'load') {
      data = prepare(decodeDataset(request.buffer));
      find = createFinder(data);
      scope.postMessage({ type: 'ready' });
      // Sort by amount now, while the page is idle, so the first "largest first" is instant.
      const none = { level: new Uint8Array(0), rule: new Uint8Array(0) };
      find({ view: 'all', search: '', sort: 'largest' }, none, none);
    } else {
      run(request);
    }
  } catch (error) {
    scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};

function run(request: Extract<Request, { type: 'run' }>): void {
  if (data === null || find === null) {
    throw new Error('The data has not loaded yet');
  }
  const start = performance.now();
  let evaluateMs: number | null = null;
  const fresh: Record<'current' | 'proposed', Outcome | null> = { current: null, proposed: null };

  for (const which of ['current', 'proposed'] as const) {
    const policy = request[which];
    const key = JSON.stringify(policy);
    if (latest[which]?.key !== key) {
      const t = performance.now();
      const evaluation = evaluate(data, policy);
      if (which === 'proposed') {
        evaluateMs = performance.now() - t;
      }
      const outcome = { evaluation, stats: summarize(data, evaluation) };
      latest[which] = { key, outcome };
      fresh[which] = outcome;
    }
  }

  const current = latest.current!.outcome;
  const proposed = latest.proposed!.outcome;
  if (fresh.current !== null || fresh.proposed !== null) {
    change = compare(data, current.evaluation, proposed.evaluation);
  }
  const rows = find(request.query, current.evaluation, proposed.evaluation);

  // The worker keeps its evaluations for later runs, so it sends copies.
  const transfer: Transferable[] = [rows.buffer];
  const send = (outcome: Outcome | null): Outcome | null => {
    if (outcome === null) {
      return null;
    }
    const evaluation = { level: outcome.evaluation.level.slice(), rule: outcome.evaluation.rule.slice() };
    transfer.push(evaluation.level.buffer, evaluation.rule.buffer);
    return { evaluation, stats: outcome.stats };
  };

  scope.postMessage(
    {
      type: 'result',
      id: request.id,
      current: send(fresh.current),
      proposed: send(fresh.proposed),
      change,
      rows,
      evaluateMs,
      totalMs: performance.now() - start,
    },
    { transfer },
  );
}
