import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function readHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1))
  } catch {
    return window.location.hash.slice(1)
  }
}

/** The current URL fragment without `#`. Routing is hash based: `#two-sum`, `#progress`. */
export function useHash(): string {
  return useSyncExternalStore(subscribeToHash, readHash)
}

/** Current epoch ms, refreshed every `intervalMs` while `active`. */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, active])
  return now
}

/** True when the viewport is at least `minWidth` px wide. */
export function useMinWidth(minWidth: number): boolean {
  const query = `(min-width: ${minWidth}px)`
  const subscribe = useCallback(
    (callback: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', callback)
      return () => list.removeEventListener('change', callback)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** Tracks an element's content width with a ResizeObserver (0 until measured). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl'
/** The same modifier as an `aria-keyshortcuts` key name. */
export const MOD_ARIA = IS_MAC ? 'Meta' : 'Control'
