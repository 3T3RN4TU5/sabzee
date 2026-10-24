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
  /** Called after every flush with whether all keys are now stored (false while any key's last write failed). */
  onStatus: ((ok: boolean) => void) | null
  /** Keys whose most recent write failed. */
  readonly failing: ReadonlySet<string>
}

export function createThrottledStorage(getBackend: () => Storage | undefined, delay = 400): ThrottledStorage {
  const pending = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  /** Keys whose last write failed → the value that failed (retried on every later flush). */
  const failed = new Map<string, string>()
  const failing = new Set<string>()
  const storage: ThrottledStorage = {
    onError: null,
    onStatus: null,
    failing,
    getItem: (name) => {
      if (pending.has(name)) return pending.get(name)!
      if (failed.has(name)) return failed.get(name)!
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
      failed.delete(name)
      failing.delete(name)
      try {
        getBackend()?.removeItem(name)
      } catch {
        /* ignore */
      }
      // Removing a key may be what frees the space another key needed.
      if (failed.size) storage.flush()
    },
    flush: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (!pending.size && !failed.size) return
      // Retry earlier failures too: a key that failed while storage was full must not stay
      // "not saved" forever just because nothing re-wrote it after space was freed.
      const batch = new Map([...failed, ...pending])
      pending.clear()
      let backend: Storage | undefined
      try {
        backend = getBackend()
      } catch {
        backend = undefined
      }
      for (const [k, v] of batch) {
        try {
          if (!backend) throw new Error('Browser storage is unavailable')
          backend.setItem(k, v)
          failed.delete(k)
          failing.delete(k)
        } catch (e) {
          const isNew = !failed.has(k) || failed.get(k) !== v
          failed.set(k, v)
          failing.add(k)
          if (isNew) storage.onError?.(e)
        }
      }
      storage.onStatus?.(failing.size === 0)
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
