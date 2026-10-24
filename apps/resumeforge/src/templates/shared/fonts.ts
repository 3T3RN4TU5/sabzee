/** On-demand Google Fonts loading (the only runtime network request the app makes). */
import { useEffect } from 'react'
import { googleFontsUrl } from '../../lib/fonts.ts'
import type { FontId } from '../../lib/types.ts'

const injected = new Set<string>()

/** Inject the stylesheet for a font pairing once. Safe to call repeatedly / outside the browser. */
export function ensureFont(id: FontId): void {
  if (typeof document === 'undefined' || injected.has(id)) return
  injected.add(id)
  const href = googleFontsUrl(id)
  if (!href) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.rfFont = id
  document.head.appendChild(link)
}

/** Load a pairing for the component's lifetime (fonts stay cached afterwards). */
export function useFont(id: FontId): void {
  useEffect(() => ensureFont(id), [id])
}

/** Resolves when every font currently requested by the page has loaded (or after `timeoutMs`). */
export function fontsReady(timeoutMs = 2500): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return Promise.race([document.fonts.ready.then(() => undefined), new Promise<void>((r) => setTimeout(r, timeoutMs))])
}
