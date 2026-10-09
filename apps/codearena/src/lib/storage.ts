import { useSyncExternalStore } from 'react'

/** Bump when a stored shape changes incompatibly; old keys are then ignored. */
const PREFIX = 'codearena:v1:'

function storageKey(name: string): string {
  return PREFIX + name
}

export function readText(name: string): string | null {
  try {
    return localStorage.getItem(storageKey(name))
  } catch {
    return null
  }
}

export function writeText(name: string, value: string): void {
  try {
    localStorage.setItem(storageKey(name), value)
  } catch {
    // Storage full or disabled (private mode): the app keeps working in memory.
  }
}

export function removeItem(name: string): void {
  try {
    localStorage.removeItem(storageKey(name))
  } catch {
    // Ignore: nothing to clean up if storage is unavailable.
  }
}

/** Reads JSON and runs it through `parse`, which must sanitise unknown data. */
function readJSON<T>(name: string, parse: (raw: unknown) => T, fallback: T): T {
  const text = readText(name)
  if (text === null) return fallback
  try {
    return parse(JSON.parse(text))
  } catch {
    return fallback
  }
}

export interface Store<T> {
  get(): T
  set(update: (previous: T) => T): void
  subscribe(listener: () => void): () => void
}

/**
 * A tiny observable value persisted to localStorage. Changes made in another
 * tab are picked up through the `storage` event.
 */
export function createPersistedStore<T>(name: string, parse: (raw: unknown) => T, fallback: T): Store<T> {
  let state = readJSON(name, parse, fallback)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      // `key` is null when another tab cleared all of localStorage.
      if (event.key !== null && event.key !== storageKey(name)) return
      state = readJSON(name, parse, fallback)
      emit()
    })
  }

  return {
    get: () => state,
    set(update) {
      state = update(state)
      writeText(name, JSON.stringify(state))
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get)
}

/* ---------- Validation helpers for parsers ---------- */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
