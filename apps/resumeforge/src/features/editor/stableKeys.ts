/**
 * Stable React/dnd-kit keys for a list of plain strings (bullets have no ids). Keys follow their
 * text when items move (drag, Alt+↑/↓, undo) and stay put for in-place edits. Pure. OWNER: shell agent.
 */
import { useState } from 'react'

let seq = 0
const freshKey = () => `k${++seq}`

/** Reconcile `prev` (values + keys) with `next` values: exact text matches keep their key (nearest first), then same-index keys are reused for edits. */
export function reconcileKeys(prevValues: readonly string[], prevKeys: readonly string[], next: readonly string[], make: () => string = freshKey): string[] {
  const used = new Set<number>()
  const out: (string | null)[] = next.map(() => null)
  // 1. same text at the same index
  next.forEach((v, i) => {
    if (i < prevValues.length && prevValues[i] === v) {
      out[i] = prevKeys[i]
      used.add(i)
    }
  })
  // 2. same text elsewhere (moves)
  next.forEach((v, i) => {
    if (out[i] !== null) return
    let best = -1
    prevValues.forEach((pv, j) => {
      if (!used.has(j) && pv === v && (best < 0 || Math.abs(j - i) < Math.abs(best - i))) best = j
    })
    if (best >= 0) {
      out[i] = prevKeys[best]
      used.add(best)
    }
  })
  // 3. edited in place → reuse that index's key; otherwise a new key
  return out.map((k, i) => {
    if (k !== null) return k
    if (i < prevKeys.length && !used.has(i) && next.length === prevValues.length) {
      used.add(i)
      return prevKeys[i]
    }
    return make()
  })
}

export function useStableKeys(values: readonly string[]): string[] {
  // "Adjusting state while rendering" pattern: derive the next keys from the previous render's.
  const [state, setState] = useState(() => ({ values, keys: values.map(() => freshKey()) }))
  if (state.values !== values) {
    const next = { values, keys: reconcileKeys(state.values, state.keys, values) }
    setState(next)
    return next.keys
  }
  return state.keys
}
