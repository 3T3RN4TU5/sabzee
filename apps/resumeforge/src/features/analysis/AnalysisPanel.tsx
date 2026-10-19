/**
 * Analysis side-panel tab: "ATS check" (lib/analysis.ts) and "Job match" (lib/keywords.ts).
 * Issues jump to the offending field with `focusField(issue.target)`.
 * OWNER: analysis agent (working baseline).
 */
import { ArrowRight } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { analyse } from '../../lib/analysis.ts'
import { matchResume } from '../../lib/keywords.ts'
import { focusField, resumeActions, uiActions, useActiveDoc, useUiStore } from '../../store'
import { cn, TextArea } from '../../ui'

export function AnalysisPanel() {
  const tab = useUiStore((s) => s.analysisTab)
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {(
          [
            ['ats', 'ATS check'],
            ['jd', 'Job match'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => uiActions.setAnalysisTab(id)}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400')}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'ats' ? <AtsCheck /> : <JobMatch />}
    </div>
  )
}

function AtsCheck() {
  const doc = useActiveDoc()
  const pages = useUiStore((s) => s.pageCount)
  const data = useDeferredValue(doc?.data)
  const result = useMemo(() => (data ? analyse(data, { pages }) : null), [data, pages])
  if (!result) return null
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="grid size-16 place-items-center rounded-full bg-indigo-50 text-2xl font-extrabold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">{result.score}</div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{result.grade}</p>
          <p className="text-sm text-slate-500">{result.issues.length} suggestions</p>
        </div>
      </div>
      <ul className="space-y-2">
        {result.issues.map((i) => (
          <li key={i.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start gap-2">
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', i.severity === 'error' ? 'bg-rose-500' : i.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500')} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{i.message}</p>
                {i.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{i.detail}</p>}
              </div>
              {i.target && (
                <button type="button" onClick={() => focusField(i.target!)} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                  Fix <ArrowRight className="size-3" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function JobMatch() {
  const doc = useActiveDoc()
  const jd = doc?.jobDescription ?? ''
  const deferred = useDeferredValue(jd)
  const result = useMemo(() => (doc && deferred.trim() ? matchResume(doc.data, deferred) : null), [doc, deferred])
  return (
    <div className="space-y-4">
      <TextArea label="Job description" rows={8} value={jd} onValue={(v) => resumeActions.setJobDescription(v)} placeholder="Paste the job posting here…" data-native-undo="" />
      {result && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="font-bold text-slate-900 dark:text-white">
            {result.score}% keyword match · {result.matched} found, {result.missing} missing
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.keywords.map((k) => (
              <span key={k.key} title={k.suggestion || `Found in ${k.foundIn.join(', ')}`} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', k.matched ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300')}>
                {k.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
