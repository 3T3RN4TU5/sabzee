import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Code2, Keyboard, Lock, Menu, ScanSearch, Table2, UploadCloud } from 'lucide-react'
import type { TableMeta } from './db/engine.ts'
import { cellValue } from './db/arrow.ts'
import { bestDimensions, bestMeasures, suggestChart, type ChartSpec } from './lib/chartSql.ts'
import { csvChunks, jsonChunks } from './lib/csv.ts'
import { copyText, downloadBlob, downloadParts, timestampSlug } from './lib/download.ts'
import { formatBytes } from './lib/format.ts'
import type { PivotSpec } from './lib/pivotSql.ts'
import { decodeShare, encodeShare, referencedTables } from './lib/share.ts'
import { isQueryStatement, quoteIdent, stripTrailingSemicolons } from './lib/sql.ts'
import { KEYS, parseHistory, parseLayout, parseSaved, pushHistory, queryTitle, read, upsertSaved, write, type HistoryEntry, type Layout, type SavedQuery } from './lib/workspace.ts'
import { DEFAULT_SQL, SAMPLES, type Sample } from './samples.ts'
import { useEngine } from './state/useEngine.ts'
import type { GridHandle } from './components/ResultsGrid.tsx'
import { QueryPanel, type ExportFormat, type QueryState } from './components/QueryPanel.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { Splitter } from './components/Splitter.tsx'
import type { EditorApi } from './components/SqlEditor.tsx'
import { Dialog, Kbd, Spinner, Toasts, type Toast } from './components/ui.tsx'
import { cx, MOD } from './lib/cx.ts'

const ProfileView = lazy(() => import('./components/ProfileView.tsx').then((m) => ({ default: m.ProfileView })))
const ChartBuilder = lazy(() => import('./components/ChartBuilder.tsx').then((m) => ({ default: m.ChartBuilder })))
const PivotBuilder = lazy(() => import('./components/PivotBuilder.tsx').then((m) => ({ default: m.PivotBuilder })))

type Tab = 'query' | 'profile' | 'chart' | 'pivot'
const TABS: { id: Tab; label: string; icon: typeof Code2 }[] = [
  { id: 'query', label: 'SQL', icon: Code2 },
  { id: 'profile', label: 'Profile', icon: ScanSearch },
  { id: 'chart', label: 'Chart', icon: BarChart3 },
  { id: 'pivot', label: 'Pivot', icon: Table2 },
]

const REPO_URL = 'https://github.com/Jeevan2410/datalens-eda'

export default function App() {
  const eng = useEngine()
  const { engine, tables } = eng
  const [tab, setTab] = useState<Tab>('query')
  const [sql, setSql] = useState<string>(() => read(KEYS.editor, (r) => (typeof r === 'string' ? r : null)) ?? DEFAULT_SQL)
  const [history, setHistory] = useState<HistoryEntry[]>(() => read(KEYS.history, parseHistory) ?? [])
  const [saved, setSaved] = useState<SavedQuery[]>(() => read(KEYS.saved, parseSaved) ?? [])
  const [layout, setLayout] = useState<Layout>(() => read(KEYS.layout, parseLayout) ?? { sidebar: 300, editor: 0.42 })
  const [query, setQuery] = useState<QueryState>({ status: 'idle' })
  const [plan, setPlan] = useState<{ sql: string; text: string } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [profileTable, setProfileTable] = useState<string | null>(null)
  const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null)
  const [pivotSpec, setPivotSpec] = useState<PivotSpec | null>(null)
  const [dragging, setDragging] = useState(false)
  const [help, setHelp] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const editorApi = useRef<EditorApi | null>(null)
  const gridHandle = useRef<GridHandle | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const bootstrapped = useRef(false)
  const setGridHandle = useCallback((h: GridHandle) => {
    gridHandle.current = h
  }, [])

  useEffect(() => write(KEYS.editor, sql), [sql])
  useEffect(() => write(KEYS.history, history), [history])
  useEffect(() => write(KEYS.saved, saved), [saved])
  useEffect(() => write(KEYS.layout, layout), [layout])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500)
  }, [])

  const schema = useMemo(() => Object.fromEntries(tables.map((t) => [t.name, t.columns.map((c) => c.name)])), [tables])

  // ─── Query execution ──────────────────────────────────────────────────────
  const run = useCallback(
    async (text: string) => {
      if (!engine) return notify('DuckDB is still starting…')
      const q = text.trim()
      if (!q) return
      if (engine.isRunning) return notify('A query is already running — press Esc to cancel it.')
      setPlan(null)
      setTab('query')
      setQuery({ status: 'running', sql: q, started: performance.now() })
      try {
        const result = await engine.run(q)
        setQuery({ status: 'done', sql: q, result })
        setHistory((h) => pushHistory(h, { sql: q, at: Date.now(), ms: result.ms, rows: result.rowCount }))
        if (result.truncated) notify(`Showing the first ${result.rowCount.toLocaleString('en-US')} rows — add a LIMIT or aggregate to see everything.`)
        // DDL may have created or dropped tables.
        if (!isQueryStatement(q)) void eng.refresh()
      } catch (err) {
        const name = err instanceof Error ? err.name : ''
        if (name === 'QueryCancelledError') {
          setQuery({ status: 'cancelled', sql: q })
          notify('Query cancelled')
        } else {
          const message = err instanceof Error ? err.message : String(err)
          setQuery({ status: 'error', sql: q, error: message })
          setHistory((h) => pushHistory(h, { sql: q, at: Date.now(), error: message }))
        }
      }
    },
    [engine, notify, eng],
  )

  const explain = useCallback(
    async (text: string) => {
      if (!engine) return
      try {
        setPlan({ sql: text, text: await engine.explain(text) })
        setTab('query')
      } catch (err) {
        setQuery({ status: 'error', sql: text, error: err instanceof Error ? err.message : String(err) })
      }
    },
    [engine],
  )

  const cancel = useCallback(() => {
    void engine?.cancel()
  }, [engine])

  const openSql = useCallback(
    (text: string, autorun = true) => {
      setSql(text)
      editorApi.current?.setValue(text)
      setTab('query')
      setDrawer(false)
      if (autorun) void run(text)
    },
    [run],
  )

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadSample = useCallback(
    async (s: Sample, open = true) => {
      try {
        if (!tables.some((t) => t.name === s.table)) await eng.loadSample(s)
        if (open) openSql(s.query)
      } catch (err) {
        notify(err instanceof Error ? err.message : String(err), 'error')
      }
    },
    [eng, tables, openSql, notify],
  )

  const loadFiles = useCallback(
    async (files: File[]) => {
      const { names, errors } = await eng.loadFiles(files)
      errors.forEach((e) => notify(e, 'error'))
      if (names.length) {
        const total = files.reduce((a, f) => a + f.size, 0)
        notify(`Loaded ${names.join(', ')} (${formatBytes(total)}) — the file never left your browser.`, 'success')
        openSql(`SELECT *\nFROM ${quoteIdent(names[0])}\nLIMIT 1000;`)
        setProfileTable(names[0])
      }
    },
    [eng, notify, openSql],
  )

  // First boot: restore a shared link, or load the default sample so the app is never empty.
  useEffect(() => {
    if (eng.status !== 'ready' || bootstrapped.current) return
    bootstrapped.current = true
    const shared = decodeShare(window.location.hash)
    void (async () => {
      if (shared) {
        const needed = SAMPLES.filter((s) => shared.samples.includes(s.table) || referencedTables(shared.sql, [s.table]).length)
        for (const s of needed) await eng.loadSample(s).catch(() => null)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        openSql(shared.sql)
        notify('Opened shared query', 'success')
        return
      }
      const existing = await eng.refresh()
      if (existing.length === 0) {
        await eng.loadSample(SAMPLES[0]).catch((e: unknown) => notify(String(e), 'error'))
        if (sql.trim() === DEFAULT_SQL.trim()) void run(sql)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.status])

  // Keep builder state pointing at existing tables.
  useEffect(() => {
    if (!tables.length) return
    if (!profileTable || !tables.some((t) => t.name === profileTable)) setProfileTable(tables[0].name)
    if (!chartSpec || (!tables.some((t) => t.name === chartSpec.source) && !/^\s*(select|with|from)\b/i.test(chartSpec.source))) {
      setChartSpec(suggestChart(tables[0].name, tables[0].columns))
    }
    if (!pivotSpec || !tables.some((t) => t.name === pivotSpec.source)) setPivotSpec(defaultPivot(tables[0]))
  }, [tables]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Workspace actions ────────────────────────────────────────────────────
  const share = useCallback(async () => {
    const text = editorApi.current?.getRunnable() ?? sql
    const samples = referencedTables(
      text,
      SAMPLES.map((s) => s.table),
    )
    const url = `${window.location.origin}${window.location.pathname}${encodeShare({ sql: text, samples })}`
    const ok = await copyText(url)
    notify(ok ? 'Share link copied — it carries the SQL in the URL (no data).' : url, ok ? 'success' : 'info')
    const uploaded = tables.filter((t) => !SAMPLES.some((s) => s.table === t.name)).map((t) => t.name)
    if (referencedTables(text, uploaded).length) notify('Note: the link references uploaded tables, which the recipient must load themselves.')
  }, [sql, notify, tables])

  const exportResult = useCallback(
    async (fmt: ExportFormat) => {
      if (query.status !== 'done') return
      const name = `datalens-${timestampSlug()}`
      try {
        if (fmt === 'parquet') {
          if (!engine || !isQueryStatement(query.sql)) return notify('Parquet export needs a single SELECT query.', 'error')
          const bytes = await engine.exportParquet(stripTrailingSemicolons(query.sql))
          downloadBlob(new Blob([bytes as BlobPart], { type: 'application/vnd.apache.parquet' }), `${name}.parquet`)
          return notify(`Exported ${name}.parquet (${formatBytes(bytes.byteLength)})`, 'success')
        }
        const h = gridHandle.current
        if (!h) return
        const header = h.columns.map((c) => c.name)
        const getRow = (i: number) => {
          const r = h.rowAt(i)
          return h.columns.map((c) => cellValue(c, r))
        }
        // Dates/timestamps arrive as epoch ms; write them as ISO strings.
        const tidy = (i: number) =>
          getRow(i).map((v, j) => {
            const cat = h.columns[j].category
            if (v != null && (cat === 'date' || cat === 'timestamp') && typeof v === 'number') {
              const iso = new Date(v).toISOString()
              return cat === 'date' ? iso.slice(0, 10) : iso.replace('T', ' ').replace('Z', '')
            }
            return v
          })
        if (fmt === 'csv') downloadParts(csvChunks(header, h.rowCount, tidy), `${name}.csv`, 'text/csv')
        else downloadParts(jsonChunks(header, h.rowCount, tidy), `${name}.json`, 'application/json')
        notify(`Exported ${h.rowCount.toLocaleString('en-US')} rows as ${fmt.toUpperCase()}`, 'success')
      } catch (err) {
        notify(err instanceof Error ? err.message : String(err), 'error')
      }
    },
    [query, engine, notify],
  )

  const chartResult = useCallback(() => {
    if (query.status !== 'done' || !isQueryStatement(query.sql)) return notify('Only SELECT results can be charted.', 'error')
    const cols = query.result.table.schema.fields.map((f, i) => ({ name: f.name, category: gridHandle.current?.columns[i]?.category ?? 'other' }))
    setChartSpec(suggestChart(stripTrailingSemicolons(query.sql), cols))
    setTab('chart')
  }, [query, notify])

  const copyCell = useCallback(
    async (text: string) => {
      const ok = await copyText(text)
      notify(ok ? `Copied “${text.length > 40 ? `${text.slice(0, 40)}…` : text}”` : 'Copy failed', ok ? 'success' : 'error')
    },
    [notify],
  )

  // ─── Global shortcuts & drag-and-drop ─────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.closest('input, textarea, select, .cm-editor') != null
      if (e.key === 'Escape' && engine?.isRunning) {
        e.preventDefault()
        cancel()
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-4]$/.test(e.code)) {
        e.preventDefault()
        setTab(TABS[Number(e.code.slice(5)) - 1].id)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        fileInput.current?.click()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !typing) {
        e.preventDefault()
        setSaveOpen(true)
      } else if (e.key === '?' && !typing) {
        e.preventDefault()
        setHelp(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine, cancel])

  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const files = [...(e.dataTransfer?.files ?? [])]
      if (files.length) void loadFiles(files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [loadFiles])

  const ready = eng.status === 'ready'
  const sidebar = (
    <Sidebar
      ready={ready}
      tables={tables}
      loading={eng.loading}
      history={history}
      saved={saved}
      fileInputRef={fileInput}
      onFiles={(f) => void loadFiles(f)}
      onSample={(s) => void loadSample(s)}
      onQueryTable={(t) => openSql(`SELECT *\nFROM ${quoteIdent(t.name)}\nLIMIT 1000;`)}
      onProfile={(t) => {
        setProfileTable(t.name)
        setTab('profile')
        setDrawer(false)
      }}
      onChart={(t) => {
        setChartSpec(suggestChart(t.name, t.columns))
        setTab('chart')
        setDrawer(false)
      }}
      onDrop={(t) => {
        if (window.confirm(`Drop ${t.kind} "${t.name}"? This only affects your browser session.`)) void eng.dropTable(t)
      }}
      onOpenSql={(s) => openSql(s, false)}
      onDeleteSaved={(id) => setSaved((s) => s.filter((x) => x.id !== id))}
      onClearHistory={() => setHistory([])}
    />
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3">
        <button type="button" className="btn btn-ghost btn-icon md:hidden" aria-label="Toggle data panel" aria-expanded={drawer} onClick={() => setDrawer((d) => !d)}>
          <Menu className="size-4" />
        </button>
        <a href="/" className="flex items-center gap-2" aria-label="DataLens home">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="text-[15px] font-bold tracking-tight text-white">DataLens</span>
        </a>
        <span className="hidden items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-0.5 text-[11px] text-emerald-200 lg:inline-flex" title="DuckDB runs in a Web Worker in this tab. No server ever sees your data.">
          <Lock className="size-3" /> 100% in-browser · data never leaves your device
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <EnginePill status={eng.status} progress={eng.progress} version={engine?.version} error={eng.error} />
          <button type="button" className="btn hidden sm:inline-flex" disabled={!ready} onClick={() => fileInput.current?.click()}>
            <UploadCloud className="size-3.5" /> Open file
          </button>
          <button type="button" className="btn btn-icon" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={() => setHelp(true)}>
            <Keyboard className="size-4" />
          </button>
          <a className="btn btn-icon" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Source code on GitHub" title="Source on GitHub">
            <GithubIcon />
          </a>
        </div>
      </header>
      {eng.status === 'loading' && <LoadBar progress={eng.progress} />}

      <div className="flex min-h-0 flex-1">
        <div className="hidden min-h-0 md:flex" style={{ width: layout.sidebar }}>
          <div className="min-w-0 flex-1">{sidebar}</div>
        </div>
        <div className="hidden md:flex">
          <Splitter
            orientation="vertical"
            label="Resize data panel"
            value={layout.sidebar}
            min={200}
            max={520}
            step={16}
            onChange={(v) => setLayout((l) => ({ ...l, sidebar: v }))}
            toValue={(x) => x}
          />
        </div>
        {drawer && (
          <div className="fixed inset-0 top-12 z-30 md:hidden">
            <div className="absolute inset-0 bg-slate-950/70" onClick={() => setDrawer(false)} />
            <div className="relative h-full w-[min(20rem,88vw)] border-r border-white/10 bg-slate-950">{sidebar}</div>
          </div>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <nav className="flex shrink-0 items-center overflow-x-auto border-b border-white/[0.07] px-2" role="tablist" aria-label="Workspace">
            {TABS.map((t, i) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)} title={`Alt+${i + 1}`}>
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </nav>
          <div className="relative min-h-0 flex-1" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            <div className={cx('h-full', tab !== 'query' && 'hidden')}>
              <QueryPanel
                sql={sql}
                onSqlChange={setSql}
                schema={schema}
                ready={ready}
                state={query}
                plan={plan}
                editorFrac={layout.editor}
                onEditorFrac={(f) => setLayout((l) => ({ ...l, editor: f }))}
                onRun={(s) => void run(s)}
                onExplain={(s) => void explain(s)}
                onCancel={cancel}
                onSave={() => setSaveOpen(true)}
                onShare={() => void share()}
                onExport={(f) => void exportResult(f)}
                onChartResult={chartResult}
                onCopy={(t) => void copyCell(t)}
                editorApi={editorApi}
                onGridHandle={setGridHandle}
              />
            </div>
            <Suspense
              fallback={
                <div className="grid h-full place-items-center">
                  <Spinner className="size-5" />
                </div>
              }
            >
              {tab === 'profile' && <ProfileView engine={engine} tables={tables} table={profileTable} onTable={setProfileTable} onOpenSql={openSql} />}
              {tab === 'chart' && (
                <ChartBuilder
                  engine={engine}
                  tables={tables}
                  spec={chartSpec}
                  onSpec={setChartSpec}
                  lastQuery={query.status === 'done' && isQueryStatement(query.sql) ? stripTrailingSemicolons(query.sql) : null}
                  onOpenSql={openSql}
                  notify={notify}
                />
              )}
              {tab === 'pivot' && <PivotBuilder engine={engine} tables={tables} spec={pivotSpec} onSpec={setPivotSpec} onOpenSql={openSql} onCopy={(t) => void copyCell(t)} />}
            </Suspense>
            {eng.status === 'error' && (
              <div role="alert" className="absolute inset-x-4 top-4 rounded-xl border border-rose-400/30 bg-rose-950/90 p-4 text-[13px] text-rose-100">
                <b>DuckDB failed to start.</b> {eng.error} — DataLens needs a browser with WebAssembly and Web Worker support.
              </div>
            )}
          </div>
        </main>
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-slate-950/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-cyan-400/70 px-12 py-10 text-center">
            <UploadCloud className="mx-auto size-10 text-cyan-300" />
            <p className="mt-3 text-lg font-semibold text-white">Drop to load into DuckDB</p>
            <p className="mt-1 text-sm text-slate-400">CSV · TSV · JSON / NDJSON · Parquet — processed locally</p>
          </div>
        </div>
      )}

      <SaveDialog
        key={saveOpen ? 'open' : 'closed'}
        open={saveOpen}
        sql={sql}
        onClose={() => setSaveOpen(false)}
        onSave={(name) => {
          setSaved((s) => upsertSaved(s, name, sql))
          setSaveOpen(false)
          notify(`Saved “${name}”`, 'success')
        }}
      />
      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  )
}

function defaultPivot(t: TableMeta): PivotSpec {
  const dim = bestDimensions(t.columns)[0]
  const measure = bestMeasures(t.columns)[0]
  return {
    source: t.name,
    rows: dim ? [dim] : [],
    values: measure ? [{ agg: 'count' }, { agg: 'sum', column: measure }, { agg: 'avg', column: measure }] : [{ agg: 'count' }],
    sortByValue: true,
  }
}

function EnginePill({ status, progress, version, error }: { status: string; progress: { stage: string; loaded?: number; total?: number }; version?: string; error: string | null }) {
  if (status === 'ready')
    return (
      <span className="hidden items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-slate-400 ring-1 ring-white/10 sm:inline-flex" data-testid="engine-ready">
        <span className="size-1.5 rounded-full bg-emerald-400" /> DuckDB {version}
      </span>
    )
  if (status === 'error')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200" title={error ?? ''}>
        <span className="size-1.5 rounded-full bg-rose-400" /> Engine error
      </span>
    )
  const pct = progress.total ? Math.round(((progress.loaded ?? 0) / progress.total) * 100) : null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300 ring-1 ring-white/10" aria-live="polite">
      <Spinner className="size-3" /> {progress.stage === 'instantiate' ? 'Starting DuckDB…' : `Loading DuckDB${pct != null ? ` ${pct}%` : '…'}`}
    </span>
  )
}

function LoadBar({ progress }: { progress: { stage: string; loaded?: number; total?: number } }) {
  const pct = progress.stage === 'instantiate' ? 100 : progress.total ? ((progress.loaded ?? 0) / progress.total) * 100 : 8
  return (
    <div className="h-0.5 w-full bg-white/5" role="progressbar" aria-label="Loading DuckDB-WASM" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-300" style={{ width: `${Math.max(4, pct)}%` }} />
    </div>
  )
}

function SaveDialog({ open, sql, onClose, onSave }: { open: boolean; sql: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(() => queryTitle(sql, 40).replace(/^--\s*/, ''))
  return (
    <Dialog open={open} onClose={onClose} title="Save query">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onSave(name.trim())
        }}
        className="space-y-3"
      >
        <label className="block">
          <span className="eyebrow mb-1 block">Name</span>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </label>
        <pre className="max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11.5px] text-slate-400">{sql}</pre>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: [string[], string][] = [
    [[MOD, 'Enter'], 'Run query (or the selected text)'],
    [['Shift', 'Enter'], 'Run query'],
    [[MOD, 'Shift', 'E'], 'EXPLAIN query plan'],
    [['Esc'], 'Cancel running query'],
    [[MOD, 'S'], 'Save query'],
    [[MOD, 'O'], 'Open a data file'],
    [['Ctrl', 'Space'], 'Autocomplete tables, columns, functions'],
    [[MOD, '/'], 'Toggle comment'],
    [['Alt', '1–4'], 'Switch tab: SQL, Profile, Chart, Pivot'],
    [['↑ ↓ ← →'], 'Move the selected cell in the grid'],
    [[MOD, 'C'], 'Copy the selected cell (or double-click it)'],
    [['?'], 'Show this help'],
  ]
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts">
      <dl className="divide-y divide-white/[0.06]">
        {rows.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2 text-[13px]">
            <dt className="text-slate-300">{label}</dt>
            <dd className="flex shrink-0 gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}
