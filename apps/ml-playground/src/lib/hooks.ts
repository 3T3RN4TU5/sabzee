import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Current route from the URL hash, constrained to `ids`. */
export function useHashRoute<T extends string>(ids: readonly T[], fallback: T): T {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => '')
  return (ids as readonly string[]).includes(hash) ? (hash as T) : fallback
}

/** Observed content-box width of an element. */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    setWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** Value that only updates after `delay` ms without changes. */
export function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

/** requestAnimationFrame loop that runs while `active`. */
export function useAnimationFrame(active: boolean, cb: (dt: number) => void): void {
  const cbRef = useRef(cb)
  useEffect(() => {
    cbRef.current = cb
  })
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      cbRef.current(now - last)
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
}
