// Undo and redo for policy edits. Edits to the same field in quick
// succession (typing "2500") are grouped, so one undo takes the whole edit
// back instead of one keystroke.

const LIMIT = 100;
const GROUP_MS = 800;

export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  /** The group and time of the last edit, for grouping the next one. */
  readonly group: string | null;
  readonly time: number;
}

export type HistoryAction<T> =
  | { readonly type: 'edit'; readonly value: T; readonly group?: string; readonly time: number }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' };

export function startHistory<T>(value: T): History<T> {
  return { past: [], present: value, future: [], group: null, time: 0 };
}

export function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case 'edit': {
      const group = action.group ?? null;
      const continues = group !== null && group === state.group && action.time - state.time < GROUP_MS;
      return {
        past: continues ? state.past : [...state.past, state.present].slice(-LIMIT),
        present: action.value,
        future: [],
        group,
        time: action.time,
      };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      if (previous === undefined) {
        return state;
      }
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], group: null, time: 0 };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (next === undefined) {
        return state;
      }
      return { past: [...state.past, state.present], present: next, future: rest, group: null, time: 0 };
    }
  }
}
