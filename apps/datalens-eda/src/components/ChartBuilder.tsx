import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, BoxSelect, Copy, Grid3x3, ImageDown, LineChart, ScatterChart, SquareCode, BarChartHorizontal } from 'lucide-react'
import type { Engine, TableMeta } from '../db/engine.ts'
import { toObjects } from '../db/arrow.ts'
import { AGGREGATIONS, aggLabel, buildChartSql, validateSpec, type Aggregation, type ChartSpec, type ChartType, type TimeGrain } from '../lib/chartSql.ts'
import { downloadBlob, svgToPng, svgToString, timestampSlug } from '../lib/download.ts'
import { formatDuration, formatNumber } from '../lib/format.ts'
import { isQueryStatement, stripTrailingSemicolons } from '../lib/sql.ts'
import { categoryFromDuckType, isNumeric, isTemporal, type TypeCategory } from '../lib/types.ts'
import { Chart, CSS_VARS, scatterSvgPoints, type Row } from './charts/Chart.tsx'
import { cx, EmptyState, Field, Spinner, TypeBadge } from './ui.tsx'

const TYPES: { value: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChart },
  { value: 'scatter', label: 'Scatter', icon: ScatterChart },
  { value: 'histogram', label: 'Histogram', icon: BarChartHorizontal },
  { value: 'box', label: 'Box', icon: BoxSelect },
  { value: 'heatmap', label: 'Heatmap', icon: Grid3x3 },
]

const GRAINS: TimeGrain[] = ['none', 'hour', 'day', 'week', 'month', 'quarter', 'year']

interface Col {
  name: string
  category: TypeCategory
}

/** Source is a table name, or a query (any text starting with SELECT/WITH/FROM). */
export function ChartBuilder({
  engine,
  tables,
  spec,
  onSpec,
  lastQuery,
  onOpenSql,
  notify,
}: {
  engine: Engine | null
  tables: TableMeta[]
  spec: ChartSpec | null
  onSpec: (s: ChartSpec) => void
  lastQuery: string | null
  onOpenSql: (sql: string) => void
  notify: (msg: string, tone?: 'info' | 'success' | 'error') => void
}) {
  const [cols, setCols] = useState<Col[]>([])
  const [rows, setRows] = useState<Row[] | null>(null)
  const [ms, setMs] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 420 })

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: Math.max(280, el.clientWidth), h: Math.max(260, Math.min(560, el.clientHeight)) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [spec != null])

  const isQuerySource = spec ? !tables.some((t) => t.name === spec.source) : false

  // Columns of the source (table metadata, or DESCRIBE of the query).
  useEffect(() => {
    if (!spec || !engine) return
    const t = tables.find((x) => x.name === spec.source)
    if (t) {
      setCols(t.columns.map((c) => ({ name: c.name, category: c.category })))
      return
    }
    let alive = true
    engine
      .rows<{ column_name: string; column_type: string }>(`DESCRIBE ${stripTrailingSemicolons(spec.source)}`)
      .then((r) => alive && setCols(r.map((c) => ({ name: c.column_name, category: categoryFromDuckType(c.column_type) }))))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [spec?.source, engine, tables]) // eslint-disable-line react-hooks/exhaustive-deps

  const types = useMemo(() => Object.fromEntries(cols.map((c) => [c.name, c.category])), [cols])
  const validation = spec ? validateSpec(spec, types) : { ok: false }
  const sql = useMemo(() => {
    if (!spec || !validation.ok || !cols.length) return null
    try {
      return buildChartSql(spec, types)
    } catch {
      return null
    }
  }, [spec, types, validation.ok, cols.length])

  useEffect(() => {
    if (!engine || !sql) {
      setRows(null)
      return
    }
    let alive = true
    setBusy(true)
    setError(null)
    const t0 = performance.now()
    engine
      .q(sql)
      .then((t) => {
        if (!alive) return
        setRows(toObjects(t))
        setMs(performance.now() - t0)
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setBusy(false))
    return () => {
      alive = false
    }
  }, [engine, sql])

  if (!spec)
    return (
      <EmptyState icon={<BarChart3 className="size-5" />} title="No data to chart yet">
        Load a dataset, then pick a table here or press <b>Chart</b> on a query result.
      </EmptyState>
    )

  const set = (patch: Partial<ChartSpec>) => onSpec({ ...spec, ...patch })
  const dims = cols
  const measures = cols.filter((c) => isNumeric(c.category))
  const xCat = spec.x ? types[spec.x] : undefined
  const temporalX = xCat ? isTemporal(xCat) : false
  const needsY = spec.type !== 'histogram' && spec.type !== 'heatmap'
  const yLabel = spec.type === 'bar' || spec.type === 'line' ? aggLabel(spec.agg, spec.y) : spec.type === 'heatmap' ? aggLabel(spec.agg, spec.color) : (spec.y ?? '')
  const xLabel = spec.type === 'box' ? (spec.color ?? '') : (spec.x ?? '')

  const exportSvgText = () => {
    const svg = svgRef.current
    if (!svg) return null
    let text = svgToString(svg)
    for (const [k, v] of Object.entries(CSS_VARS)) text = text.replaceAll(k, v)
    if (spec.type === 'scatter' && rows) text = text.replace(/<\/svg>\s*$/, `${scatterSvgPoints(rows, size.w, size.h, xCat)}</svg>`)
    return text
  }
  const exportFile = async (fmt: 'svg' | 'png') => {
    const text = exportSvgText()
    if (!text) return
    const name = `datalens-${spec.type}-${timestampSlug()}.${fmt}`
    if (fmt === 'svg') downloadBlob(new Blob([text], { type: 'image/svg+xml' }), name)
    else downloadBlob(await svgToPng(text, size.w, size.h, 2), name)
    notify(`Exported ${name}`, 'success')
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="shrink-0 space-y-3 overflow-y-auto border-b border-white/[0.06] p-4 lg:w-72 lg:border-r lg:border-b-0">
        <div role="radiogroup" aria-label="Chart type" className="grid grid-cols-3 gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={spec.type === t.value}
              onClick={() => set({ type: t.value })}
              className={cx(
                'flex cursor-pointer flex-col items-center gap-1 rounded-lg border py-2 text-[11.5px] transition',
                spec.type === t.value ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200',
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
        <Field label="Source">
          <select className="select font-mono" value={isQuerySource ? '__query__' : spec.source} onChange={(e) => set({ source: e.target.value === '__query__' && lastQuery ? lastQuery : e.target.value, x: undefined, y: undefined, color: undefined })} aria-label="Source">
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
            {(isQuerySource || (lastQuery && isQueryStatement(lastQuery))) && <option value="__query__">Last query result</option>}
          </select>
        </Field>
        {spec.type === 'box' ? (
          <>
            <ColSelect label="Y (value)" value={spec.y} onChange={(v) => set({ y: v })} options={measures} />
            <ColSelect label="Group by" value={spec.color} onChange={(v) => set({ color: v })} options={dims.filter((c) => !isNumeric(c.category) || c.category === 'integer')} allowNone="No grouping" />
          </>
        ) : (
          <>
            <ColSelect label={spec.type === 'histogram' ? 'Column' : 'X'} value={spec.x} onChange={(v) => set({ x: v })} options={spec.type === 'histogram' || spec.type === 'scatter' ? cols.filter((c) => isNumeric(c.category) || (spec.type === 'scatter' && isTemporal(c.category))) : dims} />
            {spec.type === 'heatmap' && <ColSelect label="Y (category)" value={spec.y} onChange={(v) => set({ y: v })} options={dims} />}
            {needsY && <ColSelect label={spec.type === 'scatter' ? 'Y' : 'Y (measure)'} value={spec.y} onChange={(v) => set({ y: v })} options={spec.agg === 'count_distinct' && spec.type !== 'scatter' ? cols : measures} allowNone={spec.type === 'scatter' ? undefined : '— (count rows)'} />}
            {(spec.type === 'bar' || spec.type === 'line' || spec.type === 'heatmap') && (
              <Field label="Aggregation">
                <select className="select" value={spec.agg} onChange={(e) => set({ agg: e.target.value as Aggregation })} aria-label="Aggregation">
                  {AGGREGATIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {spec.type !== 'histogram' && (
              <ColSelect
                label={spec.type === 'heatmap' ? 'Color (value)' : 'Color (series)'}
                value={spec.color}
                onChange={(v) => set({ color: v })}
                options={spec.type === 'heatmap' ? measures : dims.filter((c) => c.category === 'string' || c.category === 'boolean' || c.category === 'integer')}
                allowNone={spec.type === 'heatmap' ? '— (count rows)' : 'None'}
              />
            )}
          </>
        )}
        {temporalX && (spec.type === 'bar' || spec.type === 'line' || spec.type === 'heatmap') && (
          <Field label="Time grain">
            <select className="select" value={spec.timeGrain ?? 'none'} onChange={(e) => set({ timeGrain: e.target.value as TimeGrain })} aria-label="Time grain">
              {GRAINS.map((g) => (
                <option key={g} value={g}>
                  {g === 'none' ? 'Exact value' : g}
                </option>
              ))}
            </select>
          </Field>
        )}
        {spec.type === 'histogram' && (
          <Field label={`Bins: ${spec.bins ?? 30}`}>
            <input type="range" min={5} max={100} value={spec.bins ?? 30} onChange={(e) => set({ bins: Number(e.target.value) })} className="w-full accent-cyan-400" aria-label="Number of bins" />
          </Field>
        )}
        {(spec.type === 'bar' || spec.type === 'heatmap' || spec.type === 'box') && (
          <Field label={`Max categories: ${spec.limit ?? 30}`}>
            <input type="range" min={3} max={60} value={spec.limit ?? 30} onChange={(e) => set({ limit: Number(e.target.value) })} className="w-full accent-cyan-400" aria-label="Maximum categories" />
          </Field>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {cols.slice(0, 40).map((c) => (
            <span key={c.name} className="inline-flex items-center gap-1 rounded bg-white/[0.03] px-1 py-0.5 font-mono text-[10.5px] text-slate-400">
              <TypeBadge category={c.category} /> {c.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-2">
          <h2 className="min-w-0 truncate text-[13.5px] font-semibold text-white">
            {spec.type === 'histogram' ? `Distribution of ${spec.x ?? '…'}` : spec.type === 'box' ? `${spec.y ?? '…'}${spec.color ? ` by ${spec.color}` : ''}` : `${yLabel} by ${spec.x ?? '…'}${spec.color && spec.type !== 'heatmap' ? `, per ${spec.color}` : ''}`}
          </h2>
          {rows && !busy && (
            <span className="text-[11.5px] text-slate-500">
              {formatNumber(rows.length)} {spec.type === 'scatter' ? 'points' : 'rows'} · {formatDuration(ms)}
            </span>
          )}
          {busy && <Spinner className="size-3.5" />}
          <div className="ml-auto flex gap-1.5">
            <button type="button" className="btn h-7 text-[12px]" disabled={!rows?.length} onClick={() => void exportFile('png')}>
              <ImageDown className="size-3.5" /> PNG
            </button>
            <button type="button" className="btn h-7 text-[12px]" disabled={!rows?.length} onClick={() => void exportFile('svg')}>
              <ImageDown className="size-3.5" /> SVG
            </button>
          </div>
        </div>
        <div ref={box} className="relative min-h-[280px] flex-1 overflow-hidden px-2 pt-3" data-testid="chart-area">
          {!validation.ok && <EmptyState title="Configure the chart">{validation.message}</EmptyState>}
          {validation.ok && error && (
            <div role="alert" className="m-4 rounded-xl border border-rose-400/25 bg-rose-500/[0.07] p-3 font-mono text-[12px] text-rose-200">
              {error}
            </div>
          )}
          {validation.ok && !error && rows && rows.length === 0 && <EmptyState title="The query returned no rows" />}
          {validation.ok && !error && rows && rows.length > 0 && (
            <Chart kind={spec.type} rows={rows} xCat={xCat} yCat={spec.y ? types[spec.y] : undefined} xLabel={xLabel} yLabel={yLabel} width={size.w - 16} height={size.h - 16} svgRef={svgRef} canvasRef={canvasRef} />
          )}
        </div>
        {sql && (
          <details className="group border-t border-white/[0.06]" open>
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-2 text-[12px] text-slate-400 select-none hover:text-slate-200">
              <SquareCode className="size-3.5" /> Generated SQL
              <span className="ml-auto flex gap-1.5" onClick={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="btn h-6 px-2 text-[11.5px]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(sql)
                    notify('SQL copied', 'success')
                  }}
                >
                  <Copy className="size-3" /> Copy
                </button>
                <button type="button" className="btn h-6 px-2 text-[11.5px]" onClick={() => onOpenSql(sql)}>
                  Open in editor →
                </button>
              </span>
            </summary>
            <pre className="max-h-40 overflow-auto px-4 pb-3 font-mono text-[11.5px] leading-relaxed text-slate-300">{sql}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

function ColSelect({ label, value, onChange, options, allowNone }: { label: string; value?: string; onChange: (v?: string) => void; options: Col[]; allowNone?: string }) {
  return (
    <Field label={label}>
      <select className="select font-mono" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} aria-label={label}>
        {allowNone ? <option value="">{allowNone}</option> : <option value="">Choose…</option>}
        {options.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  )
}
