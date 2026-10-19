/**
 * localStorage wrapper for zustand `persist` that batches writes: typing in a field updates the
 * store on every keystroke, but the (possibly photo-sized) JSON is written at most every `delay`
 * ms and flushed when the page is hidden/closed. Quota errors are reported instead of thrown.
 */
import type { StateStorage } from 'zustand/middleware'

export interface ThrottledStorage extends StateStorage {
  /** Write pending values now. */
  flush(): void
  /** Called with the error when a write fails (e.g. QuotaExceededError). */
  onError: ((error: unknown) => void) | null
}

export function createThrottledStorage(getBackend: () => Storage | undefined, delay = 400): ThrottledStorage {
  const pending = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  const storage: ThrottledStorage = {
    onError: null,
    getItem: (name) => {
      if (pending.has(name)) return pending.get(name)!
      try {
        return getBackend()?.getItem(name) ?? null
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      pending.set(name, value)
      if (!timer) timer = setTimeout(storage.flush, delay)
    },
    removeItem: (name) => {
      pending.delete(name)
      try {
        getBackend()?.removeItem(name)
      } catch {
        /* ignore */
      }
    },
    flush: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      const backend = getBackend()
      for (const [k, v] of pending) {
        try {
          backend?.setItem(k, v)
        } catch (e) {
          storage.onError?.(e)
        }
      }
      pending.clear()
    },
  }
  return storage
}

const browserStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** Shared instance used by both stores. */
export const persistStorage = createThrottledStorage(browserStorage)

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistStorage.flush)
  window.addEventListener('beforeunload', persistStorage.flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistStorage.flush()
  })
}
