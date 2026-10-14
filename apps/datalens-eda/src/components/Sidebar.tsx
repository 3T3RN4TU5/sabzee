import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { BarChart3, ChevronRight, Clock, Database, FileUp, Play, ScanSearch, Star, Table2, Trash2, Upload } from 'lucide-react'
import type { TableMeta } from '../db/engine.ts'
import { formatDuration, formatNumber } from '../lib/format.ts'
import { queryTitle, type HistoryEntry, type SavedQuery } from '../lib/workspace.ts'
import { SAMPLES, type Sample } from '../samples.ts'
import { cx, Spinner, TypeBadge } from './ui.tsx'

export const FILE_ACCEPT = '.csv,.tsv,.tab,.txt,.json,.jsonl,.ndjson,.parquet,.pq'

export function Sidebar({
  ready,
  tables,
  loading,
  history,
  saved,
  onFiles,
  onSample,
  onQueryTable,
  onProfile,
  onChart,
  onDrop,
  onOpenSql,
  onDeleteSaved,
  onClearHistory,
  fileInputRef,
}: {
  ready: boolean
  tables: TableMeta[]
  loading: string[]
  history: HistoryEntry[]
  saved: SavedQuery[]
  onFiles: (files: File[]) => void
  onSample: (s: Sample) => void
  onQueryTable: (t: TableMeta) => void
  onProfile: (t: TableMeta) => void
  onChart: (t: TableMeta) => void
  onDrop: (t: TableMeta) => void
  onOpenSql: (sql: string) => void
  onDeleteSaved: (id: string) => void
  onClearHistory: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'saved' | 'history'>('saved')
  const loaded = new Set(tables.map((t) => t.name))
  const listRef = useRef<HTMLDivElement>(null)

  return (
    <aside className="flex h-full min-h-0 flex-col bg-slate-950/60" aria-label="Data sources and queries">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="eyebrow flex items-center gap-1.5">
          <Database className="size-3.5" /> Tables
        </h2>
        <button type="button" className="btn h-7 px-2 text-[12px]" disabled={!ready} onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-3.5" /> Add files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          className="sr-only"
          data-testid="file-input"
          aria-label="Upload data files"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            if (files.length) onFiles(files)
          }}
        />
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {tables.length === 0 && loading.length === 0 && (
          <button
            type="button"
            disabled={!ready}
            onClick={() => fileInputRef.current?.click()}
            className="mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-[12.5px] text-slate-400 transition hover:border-cyan-400/50 hover:text-slate-200 disabled:cursor-wait"
          >
            <FileUp className="size-5 text-cyan-300" />
            <span>
              <span className="font-medium text-slate-200">Drop files anywhere</span> or click to browse
              <br />
              CSV · TSV · JSON · Parquet
            </span>
          </button>
        )}
        <ul className="space-y-0.5">
          {tables.map((t) => {
            const isOpen = open[t.name] ?? false
            return (
              <li key={t.name}>
                <div className="group flex items-center gap-1 rounded-lg pr-1 hover:bg-white/[0.04]">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pl-1.5 text-left"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [t.name]: !isOpen }))}
                    title={t.source ? `Loaded from ${t.source}` : t.name}
                  >
                    <ChevronRight className={cx('size-3.5 shrink-0 text-slate-500 transition', isOpen && 'rotate-90')} />
                    <Table2 className="size-3.5 shrink-0 text-cyan-300" />
                    <span className="min-w-0 truncate font-mono text-[12.5px] text-slate-100">{t.name}</span>
                    <span className="ml-auto shrink-0 pl-1 text-[11px] text-slate-500 tabular-nums">{formatNumber(t.rows)}</span>
                  </button>
                  <div className="flex shrink-0 opacity-60 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconBtn label={`Query ${t.name}`} onClick={() => onQueryTable(t)}>
                      <Play className="size-3.5" />
                    </IconBtn>
                    <IconBtn label={`Profile ${t.name}`} onClick={() => onProfile(t)}>
                      <ScanSearch className="size-3.5" />
                    </IconBtn>
                    <IconBtn label={`Chart ${t.name}`} onClick={() => onChart(t)}>
                      <BarChart3 className="size-3.5" />
                    </IconBtn>
                    <IconBtn label={`Drop ${t.name}`} onClick={() => onDrop(t)}>
                      <Trash2 className="size-3.5" />
                    </IconBtn>
                  </div>
                </div>
                {isOpen && (
                  <ul className="mb-1 ml-6 border-l border-white/[0.06] pl-2">
                    {t.columns.map((c) => (
                      <li key={c.name} className="flex items-center gap-1.5 py-0.5 text-[12px]" title={c.type}>
                        <TypeBadge category={c.category} title={c.type} />
                        <span className="min-w-0 truncate font-mono text-slate-300">{c.name}</span>
                        <span className="ml-auto shrink-0 truncate pl-1 text-[10.5px] text-slate-600 uppercase">{c.type.length > 14 ? `${c.type.slice(0, 13)}…` : c.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
          {loading.map((l) => (
            <li key={l} className="flex items-center gap-2 px-2 py-1.5 text-[12.5px] text-slate-400">
              <Spinner className="size-3.5" /> Loading {l}…
            </li>
          ))}
        </ul>

        <h2 className="eyebrow mt-5 mb-2 px-1">Sample datasets</h2>
        <ul className="space-y-1.5">
          {SAMPLES.map((s) => {
            const isLoaded = loaded.has(s.table)
            const isLoading = loading.includes(s.file)
            return (
              <li key={s.table}>
                <button
                  type="button"
                  disabled={!ready || isLoading}
                  onClick={() => onSample(s)}
                  className="w-full cursor-pointer rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-left transition hover:border-cyan-400/40 hover:bg-white/[0.05] disabled:cursor-wait disabled:opacity-60"
                  aria-label={`${isLoaded ? 'Query' : 'Load'} sample: ${s.title}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-slate-100">{s.title}</span>
                    <span className="ml-auto rounded bg-white/5 px-1.5 text-[10px] font-medium text-slate-400">
                      {s.format} · {s.rows}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-snug text-slate-400">{s.description}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-cyan-300">{isLoading ? 'Loading…' : isLoaded ? 'Loaded — open example query →' : 'Load & run example →'}</p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex max-h-[38%] min-h-0 flex-col border-t border-white/[0.07]">
        <div className="flex items-center gap-1 px-2 pt-1.5" role="tablist" aria-label="Query library">
          {(['saved', 'history'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className="tab h-8 px-2 text-[12px]" onClick={() => setTab(k)}>
              {k === 'saved' ? <Star className="size-3.5" /> : <Clock className="size-3.5" />}
              {k === 'saved' ? `Saved (${saved.length})` : `History (${history.length})`}
            </button>
          ))}
          {tab === 'history' && history.length > 0 && (
            <button type="button" className="ml-auto text-[11px] text-slate-500 hover:text-slate-200" onClick={onClearHistory}>
              Clear
            </button>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" role="tabpanel">
          {tab === 'saved' &&
            (saved.length === 0 ? (
              <li className="px-2 py-3 text-[12px] text-slate-500">Save the editor's query with the star button or {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S.</li>
            ) : (
              saved.map((s) => (
                <li key={s.id} className="group flex items-center rounded-md hover:bg-white/[0.04]">
                  <button type="button" className="min-w-0 flex-1 px-2 py-1.5 text-left" onClick={() => onOpenSql(s.sql)} title={s.sql}>
                    <span className="block truncate text-[12.5px] text-slate-200">{s.name}</span>
                    <span className="block truncate font-mono text-[10.5px] text-slate-500">{queryTitle(s.sql, 48)}</span>
                  </button>
                  <IconBtn label={`Delete saved query ${s.name}`} onClick={() => onDeleteSaved(s.id)}>
                    <Trash2 className="size-3.5" />
                  </IconBtn>
                </li>
              ))
            ))}
          {tab === 'history' &&
            (history.length === 0 ? (
              <li className="px-2 py-3 text-[12px] text-slate-500">Queries you run appear here.</li>
            ) : (
              history.map((h) => (
                <li key={h.at}>
                  <button type="button" className="w-full rounded-md px-2 py-1.5 text-left hover:bg-white/[0.04]" onClick={() => onOpenSql(h.sql)} title={h.sql}>
                    <span className={cx('block truncate font-mono text-[11.5px]', h.error ? 'text-rose-300' : 'text-slate-200')}>{queryTitle(h.sql, 56)}</span>
                    <span className="block text-[10.5px] text-slate-500">
                      {new Date(h.at).toLocaleTimeString()} · {h.error ? 'error' : `${formatNumber(h.rows ?? 0)} rows · ${formatDuration(h.ms ?? 0)}`}
                    </span>
                  </button>
                </li>
              ))
            ))}
        </ul>
      </div>
    </aside>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="grid size-6 cursor-pointer place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}
