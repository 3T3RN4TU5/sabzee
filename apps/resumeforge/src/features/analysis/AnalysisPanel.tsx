/**
 * Analysis side-panel tab: "ATS check" (lib/analysis.ts + lib/atsReport.ts) and "Job match"
 * (lib/keywords.ts + lib/jobMatch.ts). Issues jump to the offending field with `focusField(target)`.
 * OWNER: analysis agent.
 */
import { FileSearch, Gauge } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { uiActions, useUiStore, type AnalysisTab } from '../../store'
import { cn } from '../../ui'
import { AtsCheck } from './AtsCheck.tsx'
import { JobMatch } from './JobMatch.tsx'

const TABS: { id: AnalysisTab; label: string; icon: typeof Gauge }[] = [
  { id: 'ats', label: 'ATS check', icon: Gauge },
  { id: 'jd', label: 'Job match', icon: FileSearch },
]

export function AnalysisPanel() {
  const tab = useUiStore((s) => s.analysisTab)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === tab)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
    uiActions.setAnalysisTab(TABS[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800" role="tablist" aria-label="Analysis" onKeyDown={onKey}>
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`rf-analysis-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls="rf-analysis-panel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => uiActions.setAnalysisTab(t.id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-500',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <div id="rf-analysis-panel" role="tabpanel" aria-labelledby={`rf-analysis-tab-${tab}`}>
        {tab === 'ats' ? <AtsCheck /> : <JobMatch />}
      </div>
    </div>
  )
}
