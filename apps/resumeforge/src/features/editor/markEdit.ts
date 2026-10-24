/** Apply an inline-markdown toolbar action to a textarea (DOM glue for lib/shell.ts applyMark). OWNER: shell agent. */
import type { KeyboardEvent } from 'react'
import { applyMark, type MarkKind } from '../../lib/shell.ts'

export function applyMarkTo(el: HTMLTextAreaElement | HTMLInputElement, kind: MarkKind, commit: (value: string) => void): void {
  const r = applyMark(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, kind)
  commit(r.text)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(r.start, r.end)
  })
}

/** Ctrl/⌘+B / I / K inside a markdown-capable field. Returns true when handled. */
export function handleMarkShortcut(e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, commit: (value: string) => void): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false
  const k = e.key.toLowerCase()
  const kind: MarkKind | null = k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'k' ? 'link' : null
  if (!kind) return false
  e.preventDefault()
  applyMarkTo(e.currentTarget, kind, commit)
  return true
}

export function countWords(text: string): number {
  const t = text.replace(/[*_`[\]()]/g, ' ').trim()
  return t ? t.split(/\s+/).length : 0
}
