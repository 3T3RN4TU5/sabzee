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
 * Inputs that want the browser's native undo (e.g. the job description box) set `data-native-undo`.
 */
export function useEditorShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
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
        toast('All changes are saved automatically in this browser', 'success')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
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
