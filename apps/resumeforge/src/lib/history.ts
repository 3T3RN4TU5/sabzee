/**
 * Generic undo/redo stack with edit coalescing: consecutive edits that share a `key`
 * (e.g. typing in the same field) within `windowMs` collapse into a single undo step.
 */
export interface History<T> {
  past: T[]
  future: T[]
  lastKey: string | null
  lastTime: number
}

export const HISTORY_LIMIT = 100
export const COALESCE_MS = 1200

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [], lastKey: null, lastTime: 0 }
}

/** Record that `previous` is about to be replaced. */
export function record<T>(h: History<T>, previous: T, key: string | undefined, now: number, limit = HISTORY_LIMIT): History<T> {
  if (key && h.lastKey === key && now - h.lastTime < COALESCE_MS && h.past.length > 0) {
    return { ...h, future: [], lastTime: now }
  }
  const past = [...h.past, previous]
  if (past.length > limit) past.splice(0, past.length - limit)
  return { past, future: [], lastKey: key ?? null, lastTime: now }
}

export function undo<T>(h: History<T>, current: T): { history: History<T>; value: T } | null {
  if (!h.past.length) return null
  const value = h.past[h.past.length - 1]
  return { value, history: { past: h.past.slice(0, -1), future: [current, ...h.future], lastKey: null, lastTime: 0 } }
}

export function redo<T>(h: History<T>, current: T): { history: History<T>; value: T } | null {
  if (!h.future.length) return null
  const [value, ...future] = h.future
  return { value, history: { past: [...h.past, current], future, lastKey: null, lastTime: 0 } }
}
