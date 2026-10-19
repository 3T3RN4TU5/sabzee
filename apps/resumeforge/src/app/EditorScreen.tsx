/**
 * #/edit — header, side panel (Content / Design / Analysis / Cover letter) and live preview.
 * Mobile: one column with an Edit / Preview switch. OWNER: shell agent.
 */
import { FileText, Gauge, Mail, Palette } from 'lucide-react'
import { Suspense, useEffect, type ComponentType } from 'react'
import { ContentEditor } from '../features/editor/ContentEditor.tsx'
import { DesignPanel } from '../features/design/DesignPanel.tsx'
import { uiActions, useActiveDoc, useUiStore, type EditorPanel } from '../store'
import { cn } from '../ui'
import { AppHeader } from './AppHeader.tsx'
import { useDocumentTitle, useEditorShortcuts, usePrintSource } from './hooks.ts'
import { AnalysisPanel, CoverLetterEditor, prefetchFeatures } from './lazy.ts'
import { PreviewPane } from './PreviewPane.tsx'

const PANELS: { id: EditorPanel; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'analysis', label: 'Analysis', icon: Gauge },
  { id: 'cover', label: 'Cover letter', icon: Mail },
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

export function EditorScreen() {
  const doc = useActiveDoc()
  const panel = useUiStore((s) => s.panel)
  const mobileTab = useUiStore((s) => s.mobileTab)
  useEditorShortcuts(true)
  usePrintSource({ target: panel === 'cover' ? 'letter' : 'resume' })
  useDocumentTitle(doc?.data.basics.name ? `${doc.data.basics.name} — ResumeForge` : 'ResumeForge — Resume Builder')

  useEffect(() => {
    const t = setTimeout(prefetchFeatures, 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-slate-100 dark:bg-slate-950">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <aside className={cn('flex min-h-0 w-full flex-col border-r border-slate-200 bg-slate-50 lg:flex lg:w-[480px] xl:w-[540px] dark:border-slate-800 dark:bg-slate-900/40', mobileTab === 'edit' ? 'flex' : 'hidden')}>
          <nav className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-2 pt-2 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Editor panels">
            {PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={panel === p.id}
                onClick={() => uiActions.setPanel(p.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition',
                  panel === p.id ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                <p.icon className="size-4" />
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto" data-editor-scroll="">
            <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
              <PanelBody panel={panel} />
            </Suspense>
          </div>
        </aside>
        <section className={cn('min-h-0 min-w-0 flex-1 bg-slate-200/70 lg:block dark:bg-slate-950', mobileTab === 'preview' ? 'block' : 'hidden')} aria-label="Preview">
          <PreviewPane />
        </section>
      </div>
      <div className="grid shrink-0 grid-cols-2 border-t border-slate-200 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-900">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} type="button" onClick={() => uiActions.setMobileTab(t)} className={cn('py-3 text-sm font-bold capitalize', mobileTab === t ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500')}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
