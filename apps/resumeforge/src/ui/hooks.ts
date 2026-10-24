/** Small DOM hooks shared by the UI kit (popovers, menus). */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Close on outside pointer-down and Escape while `open`. */
export function useDismiss(open: boolean, close: () => void, root: RefObject<HTMLElement | null>, restoreFocus?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
      restoreFocus?.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, root, restoreFocus])
}

/**
 * Horizontal shift (px) that keeps an absolutely positioned panel inside the viewport (8 px gutter).
 * Apply it as `style={{ translate: `${dx}px 0` }}`.
 */
export function useKeepInViewport(open: boolean, panel: RefObject<HTMLElement | null>): number {
  const [dx, setDx] = useState(0)
  const applied = useRef(0)
  useLayoutEffect(() => {
    const el = panel.current
    if (!open || !el) return
    const r = el.getBoundingClientRect()
    // Measure without the shift currently applied (it is kept from the previous opening).
    const left = r.left - applied.current
    const right = r.right - applied.current
    const vw = document.documentElement.clientWidth
    let shift = 0
    if (right > vw - 8) shift = vw - 8 - right
    if (left + shift < 8) shift = 8 - left
    applied.current = Math.round(shift)
    setDx(applied.current)
  }, [open, panel])
  return dx
}

/** Is the event target a text-entry element (shortcuts like "?" must not fire while typing)? */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName !== 'INPUT') return false
  const type = (el as HTMLInputElement).type
  return !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file', 'reset'].includes(type)
}
