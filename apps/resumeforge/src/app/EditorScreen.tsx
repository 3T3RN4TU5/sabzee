/**
 * #/edit — header, side panel (Content / Design / Analysis / Cover letter) and live preview.
 * Below 1024 px: one column with an Edit / Preview switch. OWNER: shell agent.
 */
import { Eye, FileText, Gauge, Mail, Palette, PenLine } from 'lucide-react'
import { Suspense, useEffect, useRef, type ComponentType, type KeyboardEvent } from 'react'
import { ContentEditor } from '../features/editor/ContentEditor.tsx'
import { DesignPanel } from '../features/design/DesignPanel.tsx'
import { uiActions, useActiveDoc, useUiStore, type EditorPanel } from '../store'
import { cn } from '../ui'
import { AppHeader } from './AppHeader.tsx'
import { useDocumentTitle, useEditorShortcuts, useMediaQuery, usePrintSource } from './hooks.ts'
import { AnalysisPanel, CoverLetterEditor, prefetchFeatures } from './lazy.ts'
import { ALT } from './platform.ts'
import { PreviewPane } from './PreviewPane.tsx'

const PANELS: { id: EditorPanel; label: string; short: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[] = [
  { id: 'content', label: 'Content', short: 'Content', icon: FileText },
  { id: 'design', label: 'Design', short: 'Design', icon: Palette },
  { id: 'analysis', label: 'Analysis', short: 'Analysis', icon: Gauge },
  { id: 'cover', label: 'Cover letter', short: 'Letter', icon: Mail },
]

function PanelBody({ panel }: { panel: EditorPanel }) {
  switch (panel) {
    case 'design':
      return <DesignPanel />
    case 'analysis':
      return <AnalysisPanel />
    case 'cover':
      return <CoverLetterEditor />
    default:
      return <ContentEditor />
  }
}

function PanelFallback() {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800" />
      ))}
    </div>
  )
}

export function EditorScreen() {
  const doc = useActiveDoc()
  const panel = useUiStore((s) => s.panel)
  const mobileTab = useUiStore((s) => s.mobileTab)
  const wide = useMediaQuery('(min-width: 1024px)')
  const tabs = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  useEditorShortcuts(true)
  usePrintSource({ target: panel === 'cover' ? 'letter' : 'resume' })
  useDocumentTitle(doc ? `${doc.name || doc.data.basics.name || 'Resume'} — ResumeForge` : 'ResumeForge — Resume Builder')

  useEffect(() => {
    const t = setTimeout(prefetchFeatures, 1500)
    return () => clearTimeout(t)
  }, [])

  // New panel → start at the top (unless a "jump to field" request is scrolling somewhere).
  useEffect(() => {
    if (!useUiStore.getState().focus) scroller.current?.scrollTo({ top: 0 })
  }, [panel])

  const onTabKey = (e: KeyboardEvent) => {
    const i = PANELS.findIndex((p) => p.id === panel)
    const next = e.key === 'ArrowRight' ? (i + 1) % PANELS.length : e.key === 'ArrowLeft' ? (i - 1 + PANELS.length) % PANELS.length : e.key === 'Home' ? 0 : e.key === 'End' ? PANELS.length - 1 : -1
    if (next < 0) return
    e.preventDefault()
    uiActions.setPanel(PANELS[next].id)
    requestAnimationFrame(() => tabs.current?.querySelector<HTMLButtonElement>('[aria-selected=true]')?.focus())
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-100 dark:bg-slate-950">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <aside
          id="editor-panel"
          tabIndex={-1}
          aria-label="Editor"
          className={cn('min-h-0 w-full flex-col border-slate-200 bg-slate-50 outline-none lg:flex lg:w-[480px] lg:border-r xl:w-[540px] dark:border-slate-800 dark:bg-slate-900/40', mobileTab === 'edit' ? 'flex' : 'hidden')}
        >
          <div ref={tabs} className="flex shrink-0 gap-0.5 border-b border-slate-200 bg-white px-1.5 pt-1.5 sm:gap-1 sm:px-2 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Editor panels" onKeyDown={onTabKey}>
            {PANELS.map((p, i) => {
              const on = panel === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  id={`tab-${p.id}`}
                  aria-selected={on}
                  aria-controls="editor-tabpanel"
                  tabIndex={on ? 0 : -1}
                  title={`${p.label} (${ALT}+${i + 1})`}
                  onClick={() => uiActions.setPanel(p.id)}
                  className={cn(
                    'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-t-lg border-b-2 px-1.5 py-2.5 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:flex-none sm:px-3 sm:text-sm',
                    on ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
                  )}
                >
                  <p.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate sm:hidden">{p.short}</span>
                  <span className="hidden truncate sm:inline">{p.label}</span>
                </button>
              )
            })}
          </div>
          <div ref={scroller} className="rf-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto" data-editor-scroll="" role="tabpanel" id="editor-tabpanel" aria-labelledby={`tab-${panel}`}>
            <Suspense fallback={<PanelFallback />}>
              <PanelBody panel={panel} />
            </Suspense>
          </div>
        </aside>
        <section className={cn('min-h-0 min-w-0 flex-1 bg-slate-200/70 lg:block dark:bg-slate-950', mobileTab === 'preview' ? 'block' : 'hidden')} aria-label="Preview">
          <PreviewPane hidden={mobileTab !== 'preview' && !wide} />
        </section>
      </div>
      <nav className="grid shrink-0 grid-cols-2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-slate-800 dark:bg-slate-900" aria-label="Edit or preview">
        {(
          [
            ['edit', 'Edit', PenLine],
            ['preview', 'Preview', Eye],
          ] as const
        ).map(([t, label, Icon]) => (
          <button
            key={t}
            type="button"
            aria-pressed={mobileTab === t}
            onClick={() => uiActions.setMobileTab(t)}
            className={cn('flex items-center justify-center gap-2 py-3 text-sm font-bold transition', mobileTab === t ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400')}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
