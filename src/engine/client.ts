// The page's side of the engine worker. While the worker is busy, new runs
// don't queue up: only the latest one waits, and it replaces any older one.
// Typing "5000" into a limit field never leaves four stale evaluations to
// work through.

import type { Policy } from './policy.ts';
import type { Query } from './query.ts';
import type { Request, Response, Result } from './worker.ts';

interface Run {
  readonly current: Policy;
  readonly proposed: Policy;
  readonly query: Query;
}

export class EngineClient {
  readonly #worker: Worker;
  readonly #onResult: (result: Result) => void;
  readonly #onError: (message: string) => void;
  #loading: { resolve: () => void; reject: (error: Error) => void } | null = null;
  #busy = false;
  #waiting: Run | null = null;
  #nextId = 1;

  constructor(onResult: (result: Result) => void, onError: (message: string) => void) {
    this.#onResult = onResult;
    this.#onError = onError;
    this.#worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.#worker.onmessage = (event: MessageEvent<Response>) => this.#receive(event.data);
    this.#worker.onerror = (event) => onError(event.message || 'The engine stopped unexpectedly');
  }

  /** Hands the data file's bytes to the worker. The buffer moves there and can't be used here afterwards. */
  load(buffer: ArrayBuffer): Promise<void> {
    const ready = new Promise<void>((resolve, reject) => {
      this.#loading = { resolve, reject };
    });
    this.#post({ type: 'load', buffer }, [buffer]);
    return ready;
  }

  run(current: Policy, proposed: Policy, query: Query): void {
    this.#waiting = { current, proposed, query };
    if (!this.#busy) {
      this.#sendWaiting();
    }
  }

  dispose(): void {
    this.#worker.terminate();
  }

  #receive(response: Response): void {
    switch (response.type) {
      case 'ready':
        this.#loading?.resolve();
        this.#loading = null;
        return;
      case 'error':
        if (this.#loading !== null) {
          this.#loading.reject(new Error(response.message));
          this.#loading = null;
        } else {
          this.#onError(response.message);
        }
        break;
      case 'result':
        this.#onResult(response);
        break;
    }
    this.#busy = false;
    this.#sendWaiting();
  }

  #sendWaiting(): void {
    const run = this.#waiting;
    if (run === null) {
      return;
    }
    this.#waiting = null;
    this.#busy = true;
    this.#post({ type: 'run', id: this.#nextId++, ...run });
  }

  #post(request: Request, transfer: Transferable[] = []): void {
    this.#worker.postMessage(request, transfer);
  }
}
