import { useEffect, useMemo, useState } from 'react'
import { Plus, SquareCode, Table2, X } from 'lucide-react'
import type { Table } from 'apache-arrow'
import type { Engine, TableMeta } from '../db/engine.ts'
import { AGGREGATIONS, type Aggregation } from '../lib/chartSql.ts'
import { formatDuration, formatNumber } from '../lib/format.ts'
import { buildPivotSql, type PivotSpec, type PivotValue } from '../lib/pivotSql.ts'
import { isNumeric } from '../lib/types.ts'
import { ResultsGrid } from './ResultsGrid.tsx'
import { cx, EmptyState, Field, Spinner, TypeBadge } from './ui.tsx'

export function PivotBuilder({
  engine,
  tables,
  spec,
  onSpec,
  onOpenSql,
  onCopy,
}: {
  engine: Engine | null
  tables: TableMeta[]
  spec: PivotSpec | null
  onSpec: (s: PivotSpec) => void
  onOpenSql: (sql: string) => void
  onCopy: (t: string) => void
}) {
  const [result, setResult] = useState<{ table: Table; ms: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = tables.find((t) => t.name === spec?.source)
  const sql = useMemo(() => (spec && meta ? buildPivotSql(spec) : null), [spec, meta])

  useEffect(() => {
    if (!engine || !sql) return
    let alive = true
    setBusy(true)
    setError(null)
    const t0 = performance.now()
    const id = setTimeout(() => {
      engine
        .q(sql)
        .then((t) => alive && setResult({ table: t, ms: performance.now() - t0 }))
        .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => alive && setBusy(false))
    }, 150)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [engine, sql])

  if (!spec || !meta)
    return (
      <EmptyState icon={<Table2 className="size-5" />} title="Nothing to pivot yet">
        Load a dataset to build group-by summaries and pivot tables without writing SQL.
      </EmptyState>
    )

  const set = (patch: Partial<PivotSpec>) => onSpec({ ...spec, ...patch })
  const cols = meta.columns
  const dims = cols.filter((c) => !['list', 'struct', 'blob'].includes(c.category))
  const toggleRow = (name: string) => set({ rows: spec.rows.includes(name) ? spec.rows.filter((r) => r !== name) : [...spec.rows, name] })
  const setValue = (i: number, v: PivotValue) => set({ values: spec.values.map((x, j) => (j === i ? v : x)) })

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="shrink-0 space-y-3 overflow-y-auto border-b border-white/[0.06] p-4 lg:w-80 lg:border-r lg:border-b-0">
        <Field label="Table">
          <select className="select font-mono" value={spec.source} onChange={(e) => onSpec({ source: e.target.value, rows: [], values: [{ agg: 'count' }] })} aria-label="Pivot source table">
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span className="eyebrow mb-1 block">Rows (group by)</span>
          <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto" role="group" aria-label="Row dimensions">
            {dims.map((c) => {
              const on = spec.rows.includes(c.name)
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRow(c.name)}
                  className={cx(
                    'inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11.5px] transition',
                    on ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200',
                  )}
                >
                  <TypeBadge category={c.category} /> {c.name}
                  {on && <span className="text-cyan-300">{spec.rows.indexOf(c.name) + 1}</span>}
                </button>
              )
            })}
          </div>
        </div>
        <Field label="Columns (pivot on)" hint="Distinct values become columns (top 12 by frequency).">
          <select className="select font-mono" value={spec.pivot ?? ''} onChange={(e) => set({ pivot: e.target.value || undefined })} aria-label="Pivot column">
            <option value="">None — plain GROUP BY</option>
            {dims
              .filter((c) => !spec.rows.includes(c.name))
              .map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <div>
          <span className="eyebrow mb-1 block">Values</span>
          <ul className="space-y-1.5">
            {spec.values.map((v, i) => (
              <li key={i} className="flex gap-1.5">
                <select className="select w-28 shrink-0" value={v.agg} onChange={(e) => setValue(i, { ...v, agg: e.target.value as Aggregation })} aria-label={`Aggregation ${i + 1}`}>
                  {AGGREGATIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <select
                  className="select min-w-0 font-mono"
                  value={v.column ?? ''}
                  disabled={v.agg === 'count'}
                  onChange={(e) => setValue(i, { ...v, column: e.target.value || undefined })}
                  aria-label={`Value column ${i + 1}`}
                >
                  <option value="">{v.agg === 'count' ? '(rows)' : 'Column…'}</option>
                  {(v.agg === 'count_distinct' || v.agg === 'min' || v.agg === 'max' ? dims : cols.filter((c) => isNumeric(c.category))).map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-ghost btn-icon shrink-0" aria-label={`Remove value ${i + 1}`} disabled={spec.values.length === 1} onClick={() => set({ values: spec.values.filter((_, j) => j !== i) })}>
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn mt-1.5 h-7 text-[12px]"
            onClick={() => set({ values: [...spec.values, { agg: 'sum', column: cols.find((c) => isNumeric(c.category))?.name }] })}
          >
            <Plus className="size-3.5" /> Add value
          </button>
        </div>
        <div className="space-y-1.5 text-[12.5px]">
          <label className={cx('flex items-center gap-2', spec.pivot && 'opacity-40')}>
            <input type="checkbox" className="accent-cyan-400" checked={!!spec.totals} disabled={!!spec.pivot} onChange={(e) => set({ totals: e.target.checked })} /> Subtotals &amp; grand total (ROLLUP)
          </label>
          <label className={cx('flex items-center gap-2', spec.pivot && 'opacity-40')}>
            <input type="checkbox" className="accent-cyan-400" checked={!!spec.sortByValue} disabled={!!spec.pivot} onChange={(e) => set({ sortByValue: e.target.checked })} /> Sort by first value, descending
          </label>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2 text-[12px] text-slate-400">
          {busy ? <Spinner className="size-3.5" /> : result && <span>{formatNumber(result.table.numRows)} rows · {result.table.numCols} cols · {formatDuration(result.ms)}</span>}
        </div>
        <div className="relative min-h-0 flex-1">
          {error ? (
            <div role="alert" className="m-4 rounded-xl border border-rose-400/25 bg-rose-500/[0.07] p-3 font-mono text-[12px] text-rose-200">
              {error}
            </div>
          ) : result ? (
            <ResultsGrid table={result.table} onCopy={onCopy} />
          ) : null}
        </div>
        {sql && (
          <div className="border-t border-white/[0.06]">
            <div className="flex items-center gap-2 px-4 py-2 text-[12px] text-slate-400">
              <SquareCode className="size-3.5" /> Generated SQL
              <button type="button" className="btn ml-auto h-6 px-2 text-[11.5px]" onClick={() => onOpenSql(sql)}>
                Open in editor →
              </button>
            </div>
            <pre className="max-h-40 overflow-auto px-4 pb-3 font-mono text-[11.5px] leading-relaxed text-slate-300">{sql}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
