/**
 * "Jump to field": anything (ATS checker issue, preview click, keyboard shortcut) calls
 * `focusField(target)`; editors register their inputs/cards with `useFieldFocus(target)` and expand
 * collapsed containers with `useRevealOnFocus(container, reveal)`.
 *
 * Resolution: switch to the Content panel + Edit tab, then on each animation frame look for the most
 * specific registered element (bullet → field → entry → section/basics). Containers that expand mount
 * deeper fields, which register and win on a later frame. Once the exact element appears — or the
 * registry has been stable for a few frames — the best match is scrolled into view, focused and
 * flashed (data-focus-flash attribute + `flash` flag from the hook).
 */
import { useCallback, useEffect, useRef, type RefCallback } from 'react'
import { isWithin, targetAncestors, targetKey, type FieldTarget } from '../lib/target.ts'
import { useUiStore, type FocusRequest } from './uiStore.ts'

const registry = new Map<string, Set<HTMLElement>>()
let registryVersion = 0
let nonce = 0

export const FLASH_MS = 1600
const MAX_FRAMES = 60
const SETTLE_FRAMES = 3

function register(key: string, el: HTMLElement) {
  let set = registry.get(key)
  if (!set) registry.set(key, (set = new Set()))
  set.add(el)
  registryVersion++
}

function unregister(key: string, el: HTMLElement) {
  const set = registry.get(key)
  if (!set) return
  set.delete(el)
  if (!set.size) registry.delete(key)
}

function firstConnected(key: string): HTMLElement | null {
  for (const el of registry.get(key) ?? []) if (el.isConnected && el.getClientRects().length > 0) return el
  return null
}

const FOCUSABLE = 'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function activate(el: HTMLElement, key: string, n: number) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  const target = el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]')
  if (target) {
    target.focus({ preventScroll: true })
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      try {
        const len = target.value.length
        target.setSelectionRange(len, len)
      } catch {
        /* type=email/number do not support selection */
      }
    }
  }
  el.removeAttribute('data-focus-flash')
  void el.offsetWidth // restart the CSS animation
  el.setAttribute('data-focus-flash', '')
  useUiStore.setState({ flash: { key, nonce: n } })
  setTimeout(() => {
    el.removeAttribute('data-focus-flash')
    const s = useUiStore.getState()
    if (s.flash?.nonce === n) useUiStore.setState({ flash: null })
    if (s.focus?.nonce === n) useUiStore.setState({ focus: null })
  }, FLASH_MS)
}

/**
 * Ask the editor to reveal, scroll to, focus and highlight a field.
 * Switches to the Content panel and (on mobile) the Edit tab.
 */
export function focusField(target: FieldTarget): void {
  const n = ++nonce
  useUiStore.setState({ focus: { target, nonce: n }, panel: 'content', mobileTab: 'edit' })
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return
  const keys = targetAncestors(target).map(targetKey)
  let frames = 0
  let stable = 0
  let lastVersion = registryVersion
  const tick = () => {
    if (useUiStore.getState().focus?.nonce !== n) return // superseded by a newer request
    frames++
    const exact = firstConnected(keys[0])
    if (registryVersion === lastVersion) stable++
    else {
      stable = 0
      lastVersion = registryVersion
    }
    if (!exact && frames < MAX_FRAMES && (frames < 2 || stable < SETTLE_FRAMES)) {
      requestAnimationFrame(tick)
      return
    }
    for (const k of keys) {
      const el = k === keys[0] ? exact : firstConnected(k)
      if (el) return activate(el, k, n)
    }
  }
  requestAnimationFrame(tick)
}

/**
 * Register an element as the focus target for `target`. Attach `ref` to the input (or the card for
 * container targets). `flash` is true for ~1.6 s after the element was jumped to.
 */
export function useFieldFocus<T extends HTMLElement = HTMLElement>(target: FieldTarget | null | undefined): { ref: RefCallback<T>; flash: boolean } {
  const key = target ? targetKey(target) : null
  const ref = useCallback(
    (el: T | null) => {
      if (!el || !key) return
      register(key, el)
      return () => unregister(key, el)
    },
    [key],
  )
  const flash = useUiStore((s) => key !== null && s.flash?.key === key)
  return { ref, flash }
}

/** The pending focus request (or null). */
export function useFocusRequest(): FocusRequest | null {
  return useUiStore((s) => s.focus)
}

/**
 * Call `reveal()` (e.g. setOpen(true)) when a focus request lands inside `container` — use it in
 * collapsible section/entry cards so the requested field gets mounted.
 */
export function useRevealOnFocus(container: FieldTarget | null | undefined, reveal: () => void): void {
  const request = useUiStore((s) => s.focus)
  const latest = useRef({ reveal, container })
  useEffect(() => {
    latest.current = { reveal, container }
  })
  const key = container ? targetKey(container) : null
  useEffect(() => {
    const c = latest.current.container
    if (request && c && key && isWithin(request.target, c)) latest.current.reveal()
  }, [request, key])
}

/** Merge several refs (e.g. a local ref + useFieldFocus().ref). */
export function mergeRefs<T>(...refs: (RefCallback<T> | { current: T | null } | null | undefined)[]): RefCallback<T> {
  return (el: T | null) => {
    const cleanups: (() => void)[] = []
    for (const r of refs) {
      if (!r) continue
      if (typeof r === 'function') {
        const c = r(el)
        if (typeof c === 'function') cleanups.push(c)
      } else r.current = el
    }
    return () => {
      for (const c of cleanups) c()
      for (const r of refs) if (r && typeof r !== 'function') r.current = null
    }
  }
}
