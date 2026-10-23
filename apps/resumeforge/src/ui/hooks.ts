/** Small DOM hooks shared by the UI kit (popovers, menus). */
import { useEffect, useLayoutEffect, type RefObject } from 'react'

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

/** Shift an absolutely positioned panel horizontally so it stays inside the viewport (8 px gutter). */
export function useKeepInViewport(open: boolean, panel: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = panel.current
    if (!open || !el) return
    el.style.translate = ''
    const r = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    let dx = 0
    if (r.right > vw - 8) dx = vw - 8 - r.right
    if (r.left + dx < 8) dx = 8 - r.left
    if (dx) el.style.translate = `${Math.round(dx)}px 0`
  }, [open, panel])
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
