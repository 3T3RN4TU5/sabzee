/** Shell-level hooks: theme class, keyboard shortcuts, print source, document title. OWNER: shell agent. */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { resumeActions, toast, uiActions, useTheme, useUiStore, type EditorPanel, type PrintJob } from '../store'
import { isTypingTarget } from '../ui'

const darkQuery = () => matchMedia('(prefers-color-scheme: dark)')

/** Toggle the `dark` class on <html> from the theme preference (system follows prefers-color-scheme). */
export function useApplyTheme(): void {
  const theme = useTheme()
  useEffect(() => {
    const mq = darkQuery()
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#4f46e5')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** The theme actually shown ('light' | 'dark'), following the OS when the preference is 'system'. */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useTheme()
  const systemDark = useSyncExternalStore(
    (cb) => {
      const mq = darkQuery()
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => darkQuery().matches,
    () => false,
  )
  return theme === 'dark' || (theme === 'system' && systemDark) ? 'dark' : 'light'
}

const PANEL_KEYS: Record<string, EditorPanel> = { Digit1: 'content', Digit2: 'design', Digit3: 'analysis', Digit4: 'cover' }

/**
 * Editor shortcuts: Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl+Y redo (store-level, works inside inputs
 * because every keystroke is in the store history), Ctrl/⌘+S → "saved" toast, Alt+1…4 switch
 * panels, "?" opens the shortcut list (when not typing).
 * Inputs whose value is NOT in the store (resume name, version names, tag drafts, helper inputs,
 * the job description box…) set `data-native-undo` (on themselves or an ancestor) so Ctrl+Z undoes
 * their own text instead of silently undoing another field; any text field inside a dialog is
 * treated the same way.
 */
export function useEditorShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const offNative = trackNativeUndoFields()
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (guardNativeUndo(e)) return
      const ui = useUiStore.getState()
      if (ui.modal || ui.confirm) return
      const mod = e.metaKey || e.ctrlKey
      if (e.altKey && !mod && PANEL_KEYS[e.code]) {
        e.preventDefault()
        uiActions.setPanel(PANEL_KEYS[e.code])
        uiActions.setMobileTab('edit')
        return
      }
      if (!mod && !e.altKey && e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault()
        uiActions.openModal('shortcuts')
        return
      }
      if (!mod || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('[data-native-undo]')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (!resumeActions.undo()) toast('Nothing to undo')
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        if (!resumeActions.redo()) toast('Nothing to redo')
      } else if (k === 's') {
        e.preventDefault()
        if (useUiStore.getState().saveError) toast('Changes are NOT being saved in this browser right now — export a backup (Download → JSON)', 'error')
        else toast('All changes are saved automatically in this browser', 'success')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      offNative()
    }
  }, [enabled])
}

type TextField = HTMLInputElement | HTMLTextAreaElement

/** A text field that keeps its own (browser-native) undo: `data-native-undo` or any text field in a dialog. */
function nativeUndoField(target: EventTarget | null): TextField | null {
  const el = target as HTMLElement | null
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return null
  if (el.closest('[data-native-undo]') || (isTypingTarget(el) && el.closest('[role="dialog"]'))) return el
  return null
}

/** The focused native-undo field's state since it got focus: its value then, and how many native undos are redoable. */
let session: { el: TextField; initial: string; undone: number } | null = null

function trackNativeUndoFields(): () => void {
  const onFocus = (e: FocusEvent) => {
    const el = nativeUndoField(e.target)
    session = el ? { el, initial: el.value, undone: 0 } : null
  }
  const onInput = (e: Event) => {
    if (!session || e.target !== session.el) return
    const type = (e as InputEvent).inputType
    if (type === 'historyUndo') session.undone++
    else if (type === 'historyRedo') session.undone = Math.max(0, session.undone - 1)
    else session.undone = 0
  }
  document.addEventListener('focusin', onFocus)
  document.addEventListener('input', onInput, true)
  const active = nativeUndoField(document.activeElement)
  session = active ? { el: active, initial: active.value, undone: 0 } : null
  return () => {
    document.removeEventListener('focusin', onFocus)
    document.removeEventListener('input', onInput, true)
    session = null
  }
}

/**
 * Ctrl/⌘+Z (and redo) in a native-undo field: let the browser undo the field's own edits, but stop
 * it once they are exhausted — the browser's undo stack is page-wide, so the next native undo would
 * silently change ANOTHER field (one the store doesn't know about). Returns true when handled.
 */
function guardNativeUndo(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  if (!mod || e.altKey) return false
  const el = nativeUndoField(e.target)
  if (!el) return false
  const k = e.key.toLowerCase()
  const isUndo = k === 'z' && !e.shiftKey
  const isRedo = (k === 'z' && e.shiftKey) || k === 'y'
  if (!isUndo && !isRedo) return true // other shortcuts (Ctrl+S…) are not ours inside these fields
  if (!session || session.el !== el) session = { el, initial: el.value, undone: 0 }
  if (isUndo && el.value === session.initial) e.preventDefault()
  if (isRedo && session.undone === 0) e.preventDefault()
  return true
}

/** Declare what Ctrl+P prints on the current screen. */
export function usePrintSource(job: PrintJob | null): void {
  const latest = useRef(job)
  useEffect(() => {
    latest.current = job
  })
  // job objects are recreated every render; the target is what matters (data defaults to the active resume)
  const key = job ? job.target : ''
  useEffect(() => {
    uiActions.setPrintSource(latest.current)
    return () => uiActions.setPrintSource(null)
  }, [key])
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title
  }, [title])
}

/** Track a media query (e.g. '(min-width: 1024px)'). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}
