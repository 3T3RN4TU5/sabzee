import { useEffect, useState } from 'react'
import { AlertOctagon, AlertTriangle, Info, RefreshCw, ScanSearch, SearchCode } from 'lucide-react'
import type { Engine, TableMeta } from '../db/engine.ts'
import { profileTable, type ColumnProfile, type TableProfile } from '../db/profile.ts'
import { formatCompact, formatDate, formatDuration, formatFloat, formatNumber, formatPercent, formatTimestamp } from '../lib/format.ts'
import { outlierRowsSql, type Severity } from '../lib/profileSql.ts'
import { diverging, SERIES_COLORS } from '../lib/scale.ts'
import { isNumeric, isTemporal } from '../lib/types.ts'
import { EmptyState, Spinner, TypeBadge } from './ui.tsx'
import { cx } from '../lib/cx.ts'

const cache = new Map<string, TableProfile>()

export function ProfileView({
  engine,
  tables,
  table,
  onTable,
  onOpenSql,
}: {
  engine: Engine | null
  tables: TableMeta[]
  table: string | null
  onTable: (name: string) => void
  onOpenSql: (sql: string) => void
}) {
  const meta = tables.find((t) => t.name === table) ?? null
  const key = meta ? `${meta.name}:${meta.rows}:${meta.columns.length}` : null
  const [nonce, setNonce] = useState(0)
  const [done, setDone] = useState<{ key: string; nonce: number; profile?: TableProfile; error?: string } | null>(null)
  const [step, setStep] = useState<string | null>(null)

  useEffect(() => {
    if (!engine || !meta || !key || cache.has(key)) return
    let alive = true
    profileTable(engine, meta, (s) => alive && setStep(s))
      .then((p) => {
        cache.set(key, p)
        if (alive) setDone({ key, nonce, profile: p })
      })
      .catch((e: unknown) => alive && setDone({ key, nonce, error: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [engine, meta, key, nonce])

  const profile = key ? (cache.get(key) ?? null) : null
  const error = done && done.key === key && done.nonce === nonce ? (done.error ?? null) : null
  const running = !!meta && !profile && !error
  const rerun = () => {
    if (key) cache.delete(key)
    setNonce((n) => n + 1)
  }

  if (!tables.length)
    return (
      <EmptyState icon={<ScanSearch className="size-5" />} title="Nothing to profile yet">
        Load a sample dataset or drop a CSV, JSON or Parquet file to get an automatic profile of every column.
      </EmptyState>
    )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1400px] space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block w-64">
            <span className="eyebrow mb-1 block">Table</span>
            <select className="select font-mono" value={table ?? ''} onChange={(e) => onTable(e.target.value)} aria-label="Table to profile">
              {!table && <option value="">Choose a table…</option>}
              {tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" disabled={running || !meta} onClick={rerun}>
            <RefreshCw className="size-3.5" /> Re-run
          </button>
          {profile && (
            <p className="text-[12px] text-slate-500">
              Profiled in {formatDuration(profile.ms)} with {profile.queries} DuckDB queries (SUMMARIZE + set-based SQL, no JS row loops).
            </p>
          )}
        </div>

        {!meta && <EmptyState title="Pick a table to profile" />}
        {error && (
          <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/[0.07] p-4 text-[13px] text-rose-200">
            Profiling failed: {error}
          </div>
        )}
        {running && (
          <div className="card flex items-center gap-3 p-4 text-[13px] text-slate-300" aria-live="polite">
            <Spinner /> {step ?? 'Starting'}…
          </div>
        )}
        {profile && meta && <ProfileBody p={profile} onOpenSql={onOpenSql} />}
      </div>
    </div>
  )
}

function ProfileBody({ p, onOpenSql }: { p: TableProfile; onOpenSql: (sql: string) => void }) {
  const cells = p.rowCount * p.columns.length
  const missing = p.columns.reduce((a, c) => a + c.nulls, 0)
  const numeric = p.columns.filter((c) => isNumeric(c.category)).length
  const temporal = p.columns.filter((c) => isTemporal(c.category)).length
  return (
    <div className="fade-in space-y-4" data-testid="profile">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Rows" value={formatNumber(p.rowCount)} />
        <Stat label="Columns" value={String(p.columns.length)} sub={`${numeric} numeric · ${temporal} temporal · ${p.columns.length - numeric - temporal} other`} />
        <Stat label="Missing cells" value={formatPercent(cells ? missing / cells : 0)} sub={`${formatNumber(missing)} NULLs`} />
        <Stat label="Duplicate rows" value={formatNumber(p.duplicateRows)} sub={p.rowCount ? formatPercent(p.duplicateRows / p.rowCount) : undefined} tone={p.duplicateRows ? 'warn' : undefined} />
        <Stat label="Warnings" value={String(p.warnings.length)} sub={`${p.warnings.filter((w) => w.severity === 'high').length} high severity`} tone={p.warnings.some((w) => w.severity === 'high') ? 'bad' : undefined} />
        <Stat label="Outlier cells (IQR)" value={formatNumber(p.columns.reduce((a, c) => a + (c.numeric?.iqrOutliers ?? 0), 0))} />
      </div>

      {p.warnings.length > 0 && (
        <section className="card p-4" aria-labelledby="dq-title">
          <h3 id="dq-title" className="eyebrow mb-2">
            Data-quality warnings
          </h3>
          <ul className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
            {p.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <SeverityIcon s={w.severity} />
                <span className="min-w-0">
                  {w.column && <span className="mr-1.5 font-mono text-slate-100">{w.column}</span>}
                  <span className="text-slate-300">{w.message}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {p.columns.map((c) => (
          <ColumnCard key={c.name} c={c} rowCount={p.rowCount} onOutliers={() => c.numeric && onOpenSql(outlierRowsSql(p.table, c.name, round(c.numeric.lowerFence), round(c.numeric.upperFence)))} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {p.correlation && <CorrelationMatrix corr={p.correlation} />}
        {p.missing && <MissingMatrix missing={p.missing} rowCount={p.rowCount} />}
      </div>
    </div>
  )
}

const round = (v: number) => Number(v.toPrecision(10))

function SeverityIcon({ s }: { s: Severity }) {
  if (s === 'high') return <AlertOctagon className="mt-0.5 size-3.5 shrink-0 text-rose-400" aria-label="High severity" />
  if (s === 'medium') return <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-label="Medium severity" />
  return <Info className="mt-0.5 size-3.5 shrink-0 text-sky-300" aria-label="Low severity" />
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className="card px-3.5 py-3">
      <div className="eyebrow">{label}</div>
      <div className={cx('mt-1 text-xl font-semibold tabular-nums', tone === 'bad' ? 'text-rose-300' : tone === 'warn' ? 'text-amber-200' : 'text-white')}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
}

function fmtStat(c: ColumnProfile, v: number): string {
  if (c.category === 'date') return formatDate(v)
  if (c.category === 'timestamp') return formatTimestamp(v)
  return formatFloat(v, 3)
}

function ColumnCard({ c, rowCount, onOutliers }: { c: ColumnProfile; rowCount: number; onOutliers: () => void }) {
  const n = c.numeric
  return (
    <section className="card flex flex-col gap-3 p-4" aria-label={`Profile of column ${c.name}`}>
      <header className="flex items-center gap-2">
        <TypeBadge category={c.category} title={c.type} />
        <h3 className="min-w-0 truncate font-mono text-[13.5px] font-semibold text-white">{c.name}</h3>
        <span className="ml-auto shrink-0 text-[11px] text-slate-500 uppercase">{c.type}</span>
      </header>
      <dl className="grid grid-cols-3 gap-2 text-[12px]">
        <Kv k="Missing" v={formatPercent(c.nullFrac)} warn={c.nullFrac >= 0.05} />
        <Kv k="Distinct" v={formatNumber(c.distinct)} />
        <Kv k="Unique %" v={c.nonNull ? formatPercent(c.distinct / c.nonNull) : '—'} />
        {n && (
          <>
            <Kv k="Mean" v={formatFloat(n.mean, 3)} />
            <Kv k="Std dev" v={n.std == null ? '—' : formatFloat(n.std, 3)} />
            <Kv k="Median" v={formatFloat(n.q[3], 3)} />
            <Kv k="Min" v={formatFloat(n.min, 3)} />
            <Kv k="P25 / P75" v={`${formatCompact(n.q[2])} / ${formatCompact(n.q[4])}`} />
            <Kv k="Max" v={formatFloat(n.max, 3)} />
            <Kv k="Skewness" v={n.skew == null ? '—' : n.skew.toFixed(2)} warn={n.skew != null && Math.abs(n.skew) > 2} />
            <Kv k="Kurtosis" v={n.kurt == null ? '—' : n.kurt.toFixed(2)} />
            <Kv k="MAD" v={n.mad == null ? '—' : formatFloat(n.mad, 3)} />
          </>
        )}
        {!n && isTemporal(c.category) && c.histogram && (
          <>
            <Kv k="From" v={fmtStat(c, c.histogram.lo)} wide />
            <Kv k="To" v={fmtStat(c, c.histogram.hi)} wide />
          </>
        )}
        {c.text && (
          <>
            <Kv k="Length" v={c.text.minLen == null ? '—' : `${c.text.minLen}–${c.text.maxLen}`} />
            <Kv k="Numeric-like" v={c.nonNull ? formatPercent(c.text.numericLike / c.nonNull) : '—'} warn={c.text.numericLike > 0} />
            <Kv k="Date-like" v={c.nonNull ? formatPercent(c.text.dateLike / c.nonNull) : '—'} />
          </>
        )}
      </dl>
      {c.histogram && <MiniHistogram c={c} />}
      {n && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-slate-400">
          <span>Outliers:</span>
          <span title="Tukey fences: outside Q1 − 1.5·IQR … Q3 + 1.5·IQR">
            IQR <b className="font-mono text-slate-100">{formatNumber(n.iqrOutliers)}</b>
          </span>
          <span title="|z| > 3">
            z-score <b className="font-mono text-slate-100">{formatNumber(n.zOutliers)}</b>
          </span>
          <span title="Modified z-score > 3.5 (median / MAD based)">
            MAD <b className="font-mono text-slate-100">{formatNumber(n.madOutliers)}</b>
          </span>
          {n.iqrOutliers > 0 && (
            <button type="button" className="ml-auto inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200" onClick={onOutliers}>
              <SearchCode className="size-3.5" /> Show rows
            </button>
          )}
        </div>
      )}
      {!n && !isTemporal(c.category) && c.top.length > 0 && <TopValues c={c} rowCount={rowCount} />}
    </section>
  )
}

function Kv({ k, v, warn, wide }: { k: string; v: string; warn?: boolean; wide?: boolean }) {
  return (
    <div className={cx('min-w-0', wide && 'col-span-3 sm:col-span-1')}>
      <dt className="text-[10.5px] text-slate-500">{k}</dt>
      <dd className={cx('truncate font-mono tabular-nums', warn ? 'text-amber-200' : 'text-slate-100')} title={v}>
        {v}
      </dd>
    </div>
  )
}

function MiniHistogram({ c }: { c: ColumnProfile }) {
  const h = c.histogram!
  const max = Math.max(1, ...h.counts)
  const W = 300
  const H = 64
  const bw = W / h.counts.length
  const fmt = (v: number) => (isTemporal(c.category) ? formatDate(v) : formatCompact(v))
  const n = c.numeric
  const fence = (v: number) => ((v - h.lo) / (h.hi - h.lo || 1)) * W
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="h-auto w-full" role="img" aria-label={`Histogram of ${c.name}, range ${fmt(h.lo)} to ${fmt(h.hi)}`}>
        {h.counts.map((v, i) => {
          const bh = v ? Math.max(1.5, (v / max) * H) : 0
          return (
            <rect key={i} x={i * bw + 1} y={H - bh} width={Math.max(1, bw - 2)} height={bh} rx={1.5} fill={SERIES_COLORS[0]}>
              <title>{`${fmt(h.lo + ((h.hi - h.lo) * i) / h.counts.length)} – ${fmt(h.lo + ((h.hi - h.lo) * (i + 1)) / h.counts.length)}: ${formatNumber(v)} rows`}</title>
            </rect>
          )
        })}
        {n && n.upperFence < h.hi && (
          <line x1={fence(n.upperFence)} x2={fence(n.upperFence)} y1={0} y2={H} stroke="#fbbf24" strokeDasharray="3 2" strokeWidth={1}>
            <title>Upper IQR fence {formatFloat(n.upperFence, 3)}</title>
          </line>
        )}
        <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} stroke="var(--chart-axis)" />
        <text x={0} y={H + 12} fontSize={9.5} fill="var(--chart-muted)">
          {fmt(h.lo)}
        </text>
        <text x={W} y={H + 12} fontSize={9.5} fill="var(--chart-muted)" textAnchor="end">
          {fmt(h.hi)}
        </text>
      </svg>
    </figure>
  )
}

function TopValues({ c, rowCount }: { c: ColumnProfile; rowCount: number }) {
  const max = Math.max(1, ...c.top.map((t) => t.count))
  const shown = c.top.slice(0, 6)
  const rest = c.distinct - shown.length
  return (
    <ul className="space-y-1" aria-label={`Most frequent values of ${c.name}`}>
      {shown.map((t) => (
        <li key={t.value} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11.5px]">
          <div className="relative h-5 overflow-hidden rounded bg-white/[0.03]">
            <div className="absolute inset-y-0 left-0 rounded bg-sky-500/25" style={{ width: `${(t.count / max) * 100}%` }} />
            <span className="relative block truncate px-1.5 leading-5 font-mono text-slate-200" title={t.value}>
              {t.value === '' ? '(empty)' : t.value}
            </span>
          </div>
          <span className="w-20 text-right font-mono text-slate-400 tabular-nums">
            {formatCompact(t.count)} · {formatPercent(t.count / Math.max(1, rowCount), 0)}
          </span>
        </li>
      ))}
      {rest > 0 && <li className="text-[11px] text-slate-500">+ {formatNumber(rest)} more distinct values</li>}
    </ul>
  )
}

function CorrelationMatrix({ corr }: { corr: NonNullable<TableProfile['correlation']> }) {
  const n = corr.columns.length
  const label = 150
  const cell = Math.max(22, Math.min(46, Math.floor(520 / n)))
  const W = label + n * cell
  const H = label * 0.75 + n * cell
  const top = label * 0.75
  return (
    <section className="card p-4" aria-labelledby="corr-title">
      <div className="mb-2 flex items-center justify-between">
        <h3 id="corr-title" className="eyebrow">
          Correlation matrix (Pearson r)
        </h3>
        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
          −1
          <span className="h-2 w-24 rounded" style={{ background: `linear-gradient(90deg, ${diverging(-1)}, ${diverging(0)}, ${diverging(1)})` }} />
          +1
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg width={W} height={H} role="img" aria-label="Correlation heatmap of numeric columns" data-testid="correlation">
          {corr.columns.map((c, i) => (
            <g key={c}>
              <text x={label - 6} y={top + i * cell + cell / 2} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--chart-muted)" fontFamily="var(--font-mono)">
                {c.length > 20 ? `${c.slice(0, 19)}…` : c}
              </text>
              <text
                x={label + i * cell + cell / 2}
                y={top - 6}
                fontSize={11}
                fill="var(--chart-muted)"
                fontFamily="var(--font-mono)"
                transform={`rotate(-45 ${label + i * cell + cell / 2} ${top - 6})`}
              >
                {c.length > 16 ? `${c.slice(0, 15)}…` : c}
              </text>
            </g>
          ))}
          {corr.matrix.map((row, i) =>
            row.map((r, j) => (
              <g key={`${i}-${j}`}>
                <rect x={label + j * cell + 1} y={top + i * cell + 1} width={cell - 2} height={cell - 2} rx={3} fill={r == null ? '#1e2433' : diverging(r)}>
                  <title>{`${corr.columns[i]} × ${corr.columns[j]}: r = ${r == null ? 'n/a' : r.toFixed(3)}`}</title>
                </rect>
                {cell >= 34 && r != null && (
                  <text x={label + j * cell + cell / 2} y={top + i * cell + cell / 2} dy="0.35em" textAnchor="middle" fontSize={10} fill={Math.abs(r) > 0.6 ? '#f8fafc' : '#cbd5e1'} pointerEvents="none">
                    {r.toFixed(2)}
                  </text>
                )}
              </g>
            )),
          )}
        </svg>
      </div>
    </section>
  )
}

function MissingMatrix({ missing, rowCount }: { missing: NonNullable<TableProfile['missing']>; rowCount: number }) {
  const cols = missing.columns
  const cw = Math.max(18, Math.min(36, Math.floor(420 / cols.length)))
  const label = 120
  const rh = 20
  const W = cols.length * cw + 70
  return (
    <section className="card p-4" aria-labelledby="missing-title">
      <h3 id="missing-title" className="eyebrow mb-1">
        Missing-value patterns
      </h3>
      <p className="mb-2 text-[11.5px] text-slate-500">Each row is a combination of columns that are NULL together; filled cells are missing.</p>
      <div className="overflow-x-auto">
        <svg width={W} height={label + missing.patterns.length * rh + 4} role="img" aria-label="Missing value pattern matrix">
          {cols.map((c, i) => (
            <text key={c} x={i * cw + cw / 2} y={label - 6} fontSize={11} fill="var(--chart-muted)" fontFamily="var(--font-mono)" transform={`rotate(-50 ${i * cw + cw / 2} ${label - 6})`}>
              {c.length > 16 ? `${c.slice(0, 15)}…` : c}
            </text>
          ))}
          {missing.patterns.map((p, r) => (
            <g key={r}>
              {p.flags.map((f, i) => (
                <rect key={i} x={i * cw + 1} y={label + r * rh + 1} width={cw - 2} height={rh - 2} rx={2} fill={f ? '#e66767' : 'rgb(255 255 255 / 0.05)'}>
                  <title>{`${cols[i]}: ${f ? 'missing' : 'present'}`}</title>
                </rect>
              ))}
              <text x={cols.length * cw + 8} y={label + r * rh + rh / 2} dy="0.35em" fontSize={10.5} fill="var(--chart-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatPercent(p.count / Math.max(1, rowCount))}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
