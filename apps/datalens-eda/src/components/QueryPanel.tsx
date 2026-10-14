import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react'
import { AlertTriangle, BarChart3, Braces, Download, FileSpreadsheet, ListTree, Play, Share2, Square, Star, TableProperties } from 'lucide-react'
import type { QueryResult } from '../db/engine.ts'
import { formatDuration, formatNumber } from '../lib/format.ts'
import { ResultsGrid, type GridHandle } from './ResultsGrid.tsx'
import { Splitter } from './Splitter.tsx'
import type { EditorApi } from './SqlEditor.tsx'
import { cx, EmptyState, MOD, Spinner } from './ui.tsx'

const SqlEditor = lazy(() => import('./SqlEditor.tsx'))

export type QueryState =
  | { status: 'idle' }
  | { status: 'running'; sql: string; started: number }
  | { status: 'done'; sql: string; result: QueryResult }
  | { status: 'error'; sql: string; error: string }
  | { status: 'cancelled'; sql: string }

export type ExportFormat = 'csv' | 'json' | 'parquet'

export function QueryPanel({
  sql,
  onSqlChange,
  schema,
  ready,
  state,
  plan,
  editorFrac,
  onEditorFrac,
  onRun,
  onExplain,
  onCancel,
  onSave,
  onShare,
  onExport,
  onChartResult,
  onCopy,
  editorApi,
  gridHandle,
}: {
  sql: string
  onSqlChange: (v: string) => void
  schema: Record<string, string[]>
  ready: boolean
  state: QueryState
  plan: { sql: string; text: string } | null
  editorFrac: number
  onEditorFrac: (f: number) => void
  onRun: (sql: string) => void
  onExplain: (sql: string) => void
  onCancel: () => void
  onSave: () => void
  onShare: () => void
  onExport: (f: ExportFormat) => void
  onChartResult: () => void
  onCopy: (text: string) => void
  editorApi: RefObject<EditorApi | null>
  gridHandle: RefObject<GridHandle | null>
}) {
  const container = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'results' | 'plan'>('results')
  const [exportOpen, setExportOpen] = useState(false)
  useEffect(() => setView(plan ? 'plan' : 'results'), [plan])
  useEffect(() => {
    if (state.status === 'running' || state.status === 'done') setView('results')
  }, [state.status])

  const runnable = () => editorApi.current?.getRunnable() ?? sql
  const running = state.status === 'running'

  return (
    <div ref={container} className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-col" style={{ height: `${editorFrac * 100}%` }}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-3 py-1.5">
          {running ? (
            <button type="button" className="btn btn-danger" onClick={onCancel} title="Cancel query (Esc)">
              <Square className="size-3.5 fill-current" /> Cancel
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => onRun(runnable())} title={`Run query (${MOD}+Enter)`}>
              <Play className="size-3.5 fill-current" /> Run
              <span className="ml-0.5 hidden text-[11px] font-normal text-slate-800 sm:inline">{MOD}+↵</span>
            </button>
          )}
          <button type="button" className="btn" disabled={!ready || running} onClick={() => onExplain(runnable())} title={`EXPLAIN the query plan (${MOD}+Shift+E)`}>
            <ListTree className="size-3.5" /> Explain
          </button>
          <button type="button" className="btn btn-icon" onClick={onSave} title={`Save query (${MOD}+S)`} aria-label="Save query">
            <Star className="size-3.5" />
          </button>
          <button type="button" className="btn btn-icon" onClick={onShare} title="Copy a shareable link to this query" aria-label="Copy share link">
            <Share2 className="size-3.5" />
          </button>
          <span className="ml-auto hidden text-[11px] text-slate-500 md:inline">
            Run selection with {MOD}+↵ · Autocomplete with Ctrl+Space
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <Suspense
            fallback={
              <div className="space-y-2 p-4" aria-label="Loading editor">
                {[70, 45, 60, 30].map((w, i) => (
                  <div key={i} className="shimmer h-3.5 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            }
          >
            <SqlEditor value={sql} onChange={onSqlChange} schema={schema} onRun={onRun} onExplain={onExplain} onSave={onSave} apiRef={editorApi} />
          </Suspense>
        </div>
      </div>

      <Splitter
        orientation="horizontal"
        label="Resize editor and results"
        value={editorFrac}
        min={0.15}
        max={0.85}
        step={0.05}
        onChange={onEditorFrac}
        toValue={(_x, y) => {
          const r = container.current!.getBoundingClientRect()
          return (y - r.top) / r.height
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-1">
          <div role="tablist" aria-label="Result view" className="flex">
            <button type="button" role="tab" aria-selected={view === 'results'} className="tab h-8 px-2 text-[12.5px]" onClick={() => setView('results')}>
              <TableProperties className="size-3.5" /> Results
            </button>
            {plan && (
              <button type="button" role="tab" aria-selected={view === 'plan'} className="tab h-8 px-2 text-[12.5px]" onClick={() => setView('plan')}>
                <ListTree className="size-3.5" /> Plan
              </button>
            )}
          </div>
          <StatusLine state={state} />
          {state.status === 'done' && view === 'results' && (
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" className="btn h-7 text-[12px]" onClick={onChartResult} title="Open this result in the chart builder">
                <BarChart3 className="size-3.5" /> Chart
              </button>
              <div className="relative">
                <button type="button" className="btn h-7 text-[12px]" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen((o) => !o)}>
                  <Download className="size-3.5" /> Export
                </button>
                {exportOpen && (
                  <div
                    role="menu"
                    className="fade-in absolute right-0 z-20 mt-1 w-44 rounded-lg border border-white/10 bg-slate-900 p-1 shadow-xl shadow-black/50"
                    onMouseLeave={() => setExportOpen(false)}
                  >
                    {(
                      [
                        ['csv', 'CSV', FileSpreadsheet],
                        ['json', 'JSON', Braces],
                        ['parquet', 'Parquet', Download],
                      ] as const
                    ).map(([f, label, Icon]) => (
                      <button
                        key={f}
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-white/[0.06]"
                        onClick={() => {
                          setExportOpen(false)
                          onExport(f)
                        }}
                      >
                        <Icon className="size-3.5 text-slate-400" /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative min-h-0 flex-1">
          {view === 'plan' && plan ? (
            <pre className="h-full overflow-auto p-4 font-mono text-[11.5px] leading-snug text-slate-300">{plan.text}</pre>
          ) : (
            <ResultsBody state={state} ready={ready} onCopy={onCopy} gridHandle={gridHandle} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatusLine({ state }: { state: QueryState }) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [state.status])
  if (state.status === 'running')
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-slate-400" aria-live="polite">
        <Spinner className="size-3.5" /> Running… {formatDuration(Math.max(0, now - state.started))}
      </span>
    )
  if (state.status === 'done') {
    const r = state.result
    return (
      <span className="text-[12px] text-slate-400 tabular-nums" aria-live="polite" data-testid="query-status">
        <span className="font-medium text-slate-200">{formatNumber(r.rowCount)}</span> rows · {r.table.numCols} cols · {formatDuration(r.ms)}
        {r.truncated && <span className="ml-1.5 text-amber-300">(truncated)</span>}
      </span>
    )
  }
  if (state.status === 'error') return <span className="text-[12px] text-rose-300">Query failed</span>
  if (state.status === 'cancelled') return <span className="text-[12px] text-amber-300">Cancelled</span>
  return null
}

function ResultsBody({ state, ready, onCopy, gridHandle }: { state: QueryState; ready: boolean; onCopy: (t: string) => void; gridHandle: RefObject<GridHandle | null> }) {
  if (state.status === 'error')
    return (
      <div className="h-full overflow-auto p-4">
        <div className="flex gap-3 rounded-xl border border-rose-400/25 bg-rose-500/[0.07] p-4" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-200">DuckDB error</p>
            <pre className="mt-1 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-rose-100/90">{state.error}</pre>
          </div>
        </div>
      </div>
    )
  if (state.status === 'running')
    return (
      <div className="space-y-1.5 p-3" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="shimmer h-5 rounded" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    )
  if (state.status === 'done') {
    if (state.result.table.numCols === 0)
      return <EmptyState title="Statement executed">No rows returned — DDL or a write statement ran successfully.</EmptyState>
    return (
      <ResultsGrid
        table={state.result.table}
        onCopy={onCopy}
        onHandle={(h) => {
          gridHandle.current = h
        }}
      />
    )
  }
  if (state.status === 'cancelled') return <EmptyState title="Query cancelled">Edit the query and run it again.</EmptyState>
  return (
    <EmptyState icon={<Play className="size-5" />} title={ready ? 'Run a query to see results' : 'Starting DuckDB…'}>
      <span className={cx(!ready && 'opacity-70')}>
        Press <kbd className="kbd">{MOD}</kbd> + <kbd className="kbd">Enter</kbd> in the editor. Results stream from DuckDB as Arrow batches into a virtualized grid.
      </span>
    </EmptyState>
  )
}
