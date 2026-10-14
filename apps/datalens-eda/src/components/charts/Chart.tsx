/**
 * Hand-rolled SVG charts (canvas for dense scatter). Each renderer takes the fixed-shape rows
 * produced by `buildChartSql` — no aggregation happens in JavaScript.
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react'
import type { ChartType } from '../../lib/chartSql.ts'
import { formatCompact, formatFloat, formatNumber } from '../../lib/format.ts'
import { colorFor, formatX, isMidnight, POINT_R, scatterGeometry, seriesOf, toNum, type Row } from './chartUtils.ts'
import { formatTimeTick, linear, niceTicks, sequential, SERIES_COLORS, timeTicks } from '../../lib/scale.ts'
import { isNumeric, isTemporal, type TypeCategory } from '../../lib/types.ts'


export interface ChartProps {
  kind: ChartType
  rows: Row[]
  xCat?: TypeCategory
  yCat?: TypeCategory
  xLabel: string
  yLabel: string
  width: number
  height: number
  svgRef: RefObject<SVGSVGElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
}

const INK = 'var(--chart-ink)'
const MUTED = 'var(--chart-muted)'
const GRID = 'var(--chart-grid)'
const AXIS = 'var(--chart-axis)'
interface Tip {
  x: number
  y: number
  title: string
  lines: { color?: string; label: string; value: string }[]
}

function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null
  const left = tip.x > width - 220 ? tip.x - 14 : tip.x + 14
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-60 rounded-lg border border-white/10 bg-slate-950/95 px-2.5 py-2 text-[12px] shadow-xl shadow-black/50"
      style={{ left, top: Math.max(4, tip.y - 12), transform: tip.x > width - 220 ? 'translateX(-100%)' : undefined }}
    >
      <div className="mb-1 font-semibold text-slate-100">{tip.title}</div>
      {tip.lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2 text-slate-300">
          {l.color && <span className="size-2 shrink-0 rounded-full" style={{ background: l.color }} />}
          <span className="min-w-0 flex-1 truncate">{l.label}</span>
          <span className="font-mono text-slate-100 tabular-nums">{l.value}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ series, x, y }: { series: string[]; x: number; y: number }) {
  if (series.length < 2) return null
  const items = series.slice(0, SERIES_COLORS.length).map((s) => ({ s, label: s.length > 18 ? `${s.slice(0, 17)}…` : s }))
  const offsets = items.reduce<number[]>((acc, _it, i) => [...acc, i === 0 ? x : acc[i - 1] + 24 + items[i - 1].label.length * 6.4], [])
  return (
    <g transform={`translate(0 ${y})`}>
      {items.map(({ s, label }, i) => (
        <g key={s} transform={`translate(${offsets[i]} 0)`}>
          <rect width={10} height={10} rx={2} y={-9} fill={colorFor(series, s)} />
          <text x={14} fontSize={11} fill={MUTED}>
            {label}
          </text>
        </g>
      ))}
    </g>
  )
}

function YAxis({ ticks, scale, left, right, fmt = formatCompact }: { ticks: number[]; scale: (v: number) => number; left: number; right: number; fmt?: (v: number) => string }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={scale(t)} y2={scale(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth={1} />
          <text x={left - 8} y={scale(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(t)}
          </text>
        </g>
      ))}
    </g>
  )
}

function AxisTitle({ x, y, children, rotate }: { x: number; y: number; children: ReactNode; rotate?: boolean }) {
  return (
    <text x={x} y={y} fontSize={11.5} fontWeight={600} fill={MUTED} textAnchor="middle" transform={rotate ? `rotate(-90 ${x} ${y})` : undefined}>
      {children}
    </text>
  )
}

/** Band-axis labels, rotated when crowded and thinned when very crowded. */
function BandLabels({ labels, centers, y, band }: { labels: string[]; centers: number[]; y: number; band: number }) {
  const longest = Math.max(...labels.map((l) => l.length), 1)
  const rotate = longest * 6.5 > band
  const every = Math.max(1, Math.ceil((rotate ? 14 : longest * 6.5 + 8) / Math.max(1, band)))
  return (
    <g>
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text
            key={i}
            x={centers[i]}
            y={y}
            fontSize={11}
            fill={MUTED}
            textAnchor={rotate ? 'end' : 'middle'}
            transform={rotate ? `rotate(-40 ${centers[i]} ${y})` : undefined}
            dy={rotate ? '0.3em' : '0.9em'}
          >
            {l.length > 22 ? `${l.slice(0, 21)}…` : l}
          </text>
        ) : null,
      )}
    </g>
  )
}

function bottomMargin(labels: string[], band: number): number {
  const longest = Math.min(22, Math.max(...labels.map((l) => l.length), 1))
  return longest * 6.5 > band ? Math.min(110, 26 + longest * 4.4) : 40
}

// ─── Bar ──────────────────────────────────────────────────────────────────────

function BarChart({ rows, xCat, xLabel, yLabel, width, height, svgRef }: ChartProps) {
  const [tip, setTip] = useState<Tip | null>(null)
  const series = useMemo(() => seriesOf(rows), [rows])
  const xs = useMemo(() => {
    const seen = new Map<string, unknown>()
    for (const r of rows) {
      const k = String(r.x)
      if (!seen.has(k)) seen.set(k, r.x)
    }
    return [...seen.values()]
  }, [rows])
  const allMid = xCat && isTemporal(xCat) ? isMidnight(xs.map(toNum)) : false
  const labels = xs.map((x) => formatX(x, xCat, allMid))
  const lookup = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(`${String(r.x)}\u0000${r.series ?? ''}`, toNum(r.y))
    return m
  }, [rows])
  const ys = rows.map((r) => toNum(r.y)).filter(Number.isFinite)
  const { domain, ticks } = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys), 5)
  const top = series.length > 1 ? 34 : 14
  const left = 58
  const right = 12
  const innerW = Math.max(10, width - left - right)
  const band = innerW / Math.max(1, xs.length)
  const bottom = bottomMargin(labels, band) + 18
  const innerH = Math.max(10, height - top - bottom)
  const y = linear(domain, [top + innerH, top])
  const groups = Math.max(1, series.length)
  const groupW = band * (xs.length > 40 ? 0.92 : 0.78)
  const barW = Math.max(1, groupW / groups - (groups > 1 ? 2 : 0))
  const keys = series.length ? series : ['']
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <svg ref={svgRef} width={width} height={height} role="img" aria-label={`Bar chart of ${yLabel} by ${xLabel}`}>
        <Legend series={series} x={left} y={16} />
        <YAxis ticks={ticks} scale={y} left={left} right={width - right} />
        {xs.map((xv, i) => {
          const x0 = left + i * band + (band - groupW) / 2
          return (
            <g key={i}>
              {keys.map((s, j) => {
                const v = lookup.get(`${String(xv)}\u0000${s}`)
                if (v == null || !Number.isFinite(v)) return null
                const y0 = y(Math.max(0, v))
                const h = Math.max(1, Math.abs(y(v) - y(0)))
                const r = Math.min(4, barW / 2)
                const bx = x0 + j * (barW + (groups > 1 ? 2 : 0))
                // Rounded data end, square at the baseline.
                const path =
                  v >= 0
                    ? `M${bx},${y0 + h}V${y0 + r}Q${bx},${y0} ${bx + r},${y0}H${bx + barW - r}Q${bx + barW},${y0} ${bx + barW},${y0 + r}V${y0 + h}Z`
                    : `M${bx},${y0}V${y0 + h - r}Q${bx},${y0 + h} ${bx + r},${y0 + h}H${bx + barW - r}Q${bx + barW},${y0 + h} ${bx + barW},${y0 + h - r}V${y0}Z`
                return <path key={j} d={path} fill={colorFor(series, s || undefined)} />
              })}
              <rect
                data-export-ignore
                x={left + i * band}
                y={top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setTip({
                    x: e.clientX - box.left,
                    y: e.clientY - box.top,
                    title: labels[i],
                    lines: keys
                      .map((s) => ({ s, v: lookup.get(`${String(xv)}\u0000${s}`) }))
                      .filter((d) => d.v != null)
                      .map((d) => ({ color: colorFor(series, d.s || undefined), label: d.s || yLabel, value: formatNumber(d.v!) })),
                  })
                }}
              />
            </g>
          )
        })}
        <BandLabels labels={labels} centers={xs.map((_, i) => left + i * band + band / 2)} y={top + innerH + 6} band={band} />
        <AxisTitle x={14} y={top + innerH / 2} rotate>
          {yLabel}
        </AxisTitle>
        <AxisTitle x={left + innerW / 2} y={height - 6}>
          {xLabel}
        </AxisTitle>
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  )
}

// ─── Line ─────────────────────────────────────────────────────────────────────

function LineChart({ rows, xCat, xLabel, yLabel, width, height, svgRef }: ChartProps) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null)
  const series = useMemo(() => seriesOf(rows), [rows])
  const continuous = !!xCat && (isTemporal(xCat) || isNumeric(xCat))
  const xKeys = useMemo(() => {
    const seen = new Map<string, unknown>()
    for (const r of rows) if (!seen.has(String(r.x))) seen.set(String(r.x), r.x)
    const vals = [...seen.values()]
    if (continuous) vals.sort((a, b) => toNum(a) - toNum(b))
    return vals
  }, [rows, continuous])
  const xIndex = useMemo(() => new Map(xKeys.map((x, i) => [String(x), i])), [xKeys])
  const keys = useMemo(() => (series.length ? series : ['']), [series])
  const bySeries = useMemo(() => {
    const m = new Map<string, (number | null)[]>()
    for (const k of keys) m.set(k, new Array(xKeys.length).fill(null))
    for (const r of rows) {
      const arr = m.get(r.series == null ? '' : String(r.series))
      const i = xIndex.get(String(r.x))
      if (arr && i != null) arr[i] = toNum(r.y)
    }
    return m
  }, [rows, keys, xKeys, xIndex])
  const ys = rows.map((r) => toNum(r.y)).filter(Number.isFinite)
  const { domain, ticks } = niceTicks(Math.min(0, ...ys), Math.max(...ys, 0), 5)
  const top = series.length > 1 ? 34 : 14
  const left = 58
  const right = 16
  const bottom = 54
  const innerW = Math.max(10, width - left - right)
  const innerH = Math.max(10, height - top - bottom)
  const xNums = xKeys.map((x, i) => (continuous ? toNum(x) : i))
  const xMin = xNums[0] ?? 0
  const xMax = xNums[xNums.length - 1] ?? 1
  const x = linear(xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax], [left, left + innerW])
  const y = linear(domain, [top + innerH, top])
  const allMid = xCat && isTemporal(xCat) ? isMidnight(xNums) : false

  let xTicks: { v: number; label: string }[]
  if (xCat && isTemporal(xCat)) {
    const tt = timeTicks(xMin, xMax, Math.max(2, Math.floor(innerW / 90)))
    xTicks = tt.ticks.map((v) => ({ v, label: formatTimeTick(v, tt.unit) }))
  } else if (continuous) {
    xTicks = niceTicks(xMin, xMax, Math.max(2, Math.floor(innerW / 80))).ticks.filter((v) => v >= xMin && v <= xMax).map((v) => ({ v, label: formatCompact(v) }))
  } else {
    const every = Math.max(1, Math.ceil(xKeys.length / Math.max(2, Math.floor(innerW / 80))))
    xTicks = xKeys.map((k, i) => ({ v: i, label: formatX(k, xCat) })).filter((_, i) => i % every === 0)
  }
  const showDots = xKeys.length <= 60

  const paths = keys.map((k) => {
    const vals = bySeries.get(k)!
    let d = ''
    let pen = false
    vals.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(xNums[i]).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    return { k, d, vals }
  })

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const px = e.clientX - box.left
    // Nearest x by binary search over the sorted positions.
    let lo = 0
    let hi = xNums.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (x(xNums[mid]) < px) lo = mid
      else hi = mid
    }
    const i = Math.abs(x(xNums[lo]) - px) <= Math.abs(x(xNums[hi]) - px) ? lo : hi
    setHover({ i, px: x(xNums[i]), py: e.clientY - box.top })
  }

  const tip: Tip | null = hover
    ? {
        x: hover.px,
        y: hover.py,
        title: formatX(xKeys[hover.i], xCat, allMid),
        lines: paths
          .filter((p) => p.vals[hover.i] != null)
          .sort((a, b) => (b.vals[hover.i] ?? 0) - (a.vals[hover.i] ?? 0))
          .slice(0, 9)
          .map((p) => ({ color: colorFor(series, p.k || undefined), label: p.k || yLabel, value: formatNumber(p.vals[hover.i]!) })),
      }
    : null

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg ref={svgRef} width={width} height={height} role="img" aria-label={`Line chart of ${yLabel} over ${xLabel}`}>
        <Legend series={series} x={left} y={16} />
        <YAxis ticks={ticks} scale={y} left={left} right={width - right} />
        {xTicks.map((t) => (
          <text key={t.v} x={x(t.v)} y={top + innerH + 18} fontSize={11} fill={MUTED} textAnchor="middle">
            {t.label}
          </text>
        ))}
        {paths.map((p) => (
          <path key={p.k} d={p.d} fill="none" stroke={colorFor(series, p.k || undefined)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {showDots &&
          paths.map((p) =>
            p.vals.map((v, i) =>
              v == null ? null : <circle key={`${p.k}-${i}`} cx={x(xNums[i])} cy={y(v)} r={3} fill={colorFor(series, p.k || undefined)} stroke="#0b1120" strokeWidth={1.5} />,
            ),
          )}
        {hover && (
          <g data-export-ignore>
            <line x1={hover.px} x2={hover.px} y1={top} y2={top + innerH} stroke={MUTED} strokeDasharray="3 3" />
            {paths.map((p) =>
              p.vals[hover.i] == null ? null : (
                <circle key={p.k} cx={hover.px} cy={y(p.vals[hover.i]!)} r={4.5} fill={colorFor(series, p.k || undefined)} stroke="#0b1120" strokeWidth={2} />
              ),
            )}
          </g>
        )}
        <rect data-export-ignore x={left} y={top} width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} />
        <AxisTitle x={14} y={top + innerH / 2} rotate>
          {yLabel}
        </AxisTitle>
        <AxisTitle x={left + innerW / 2} y={height - 8}>
          {xLabel}
        </AxisTitle>
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  )
}

// ─── Histogram ────────────────────────────────────────────────────────────────

function Histogram({ rows, xLabel, width, height, svgRef }: ChartProps) {
  const [tip, setTip] = useState<Tip | null>(null)
  const bins = rows.map((r) => ({ a: toNum(r.bin_start), b: toNum(r.bin_end), n: toNum(r.count) }))
  const lo = bins[0]?.a ?? 0
  const hi = bins[bins.length - 1]?.b ?? 1
  const maxN = Math.max(1, ...bins.map((b) => b.n))
  const { domain, ticks } = niceTicks(0, maxN, 5)
  const top = 14
  const left = 58
  const right = 16
  const bottom = 50
  const innerW = Math.max(10, width - left - right)
  const innerH = Math.max(10, height - top - bottom)
  const x = linear(lo === hi ? [lo - 1, hi + 1] : [lo, hi], [left, left + innerW])
  const y = linear(domain, [top + innerH, top])
  const xt = niceTicks(lo, hi, Math.max(2, Math.floor(innerW / 80))).ticks.filter((t) => t >= lo && t <= hi)
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <svg ref={svgRef} width={width} height={height} role="img" aria-label={`Histogram of ${xLabel}`}>
        <YAxis ticks={ticks} scale={y} left={left} right={width - right} />
        {bins.map((b, i) => {
          const x0 = x(b.a) + 1
          const w = Math.max(1, x(b.b) - x(b.a) - 2)
          const h = y(0) - y(b.n)
          return (
            <g key={i}>
              <rect x={x0} y={y(b.n)} width={w} height={Math.max(0, h)} rx={Math.min(3, w / 2)} fill={SERIES_COLORS[0]} />
              <rect
                data-export-ignore
                x={x(b.a)}
                y={top}
                width={Math.max(1, x(b.b) - x(b.a))}
                height={innerH}
                fill="transparent"
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: `${formatFloat(b.a, 3)} – ${formatFloat(b.b, 3)}`, lines: [{ label: 'rows', value: formatNumber(b.n) }] })
                }}
              />
            </g>
          )
        })}
        {xt.map((t) => (
          <text key={t} x={x(t)} y={top + innerH + 18} fontSize={11} fill={MUTED} textAnchor="middle">
            {formatCompact(t)}
          </text>
        ))}
        <AxisTitle x={14} y={top + innerH / 2} rotate>
          rows
        </AxisTitle>
        <AxisTitle x={left + innerW / 2} y={height - 8}>
          {xLabel}
        </AxisTitle>
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  )
}

// ─── Box plot ─────────────────────────────────────────────────────────────────

function BoxPlot({ rows, xLabel, yLabel, width, height, svgRef }: ChartProps) {
  const [tip, setTip] = useState<Tip | null>(null)
  const boxes = rows.map((r) => ({
    g: String(r.grp ?? 'NULL'),
    q1: toNum(r.q1),
    med: toNum(r.median),
    q3: toNum(r.q3),
    lo: toNum(r.lo),
    hi: toNum(r.hi),
    out: toNum(r.outliers),
    n: toNum(r.n),
  }))
  const vals = boxes.flatMap((b) => [b.lo, b.hi, b.q1, b.q3]).filter(Number.isFinite)
  const { domain, ticks } = niceTicks(Math.min(...vals), Math.max(...vals), 5)
  const labels = boxes.map((b) => b.g)
  const top = 14
  const left = 58
  const right = 16
  const innerW = Math.max(10, width - left - right)
  const band = innerW / Math.max(1, boxes.length)
  const bottom = bottomMargin(labels, band) + 18
  const innerH = Math.max(10, height - top - bottom)
  const y = linear(domain, [top + innerH, top])
  const bw = Math.min(56, band * 0.5)
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <svg ref={svgRef} width={width} height={height} role="img" aria-label={`Box plot of ${yLabel}${xLabel ? ` by ${xLabel}` : ''}`}>
        <YAxis ticks={ticks} scale={y} left={left} right={width - right} />
        {boxes.map((b, i) => {
          const cx = left + i * band + band / 2
          const color = SERIES_COLORS[0]
          return (
            <g key={b.g}>
              <line x1={cx} x2={cx} y1={y(b.hi)} y2={y(b.q3)} stroke={color} strokeWidth={1.5} />
              <line x1={cx} x2={cx} y1={y(b.q1)} y2={y(b.lo)} stroke={color} strokeWidth={1.5} />
              <line x1={cx - bw / 4} x2={cx + bw / 4} y1={y(b.hi)} y2={y(b.hi)} stroke={color} strokeWidth={1.5} />
              <line x1={cx - bw / 4} x2={cx + bw / 4} y1={y(b.lo)} y2={y(b.lo)} stroke={color} strokeWidth={1.5} />
              <rect x={cx - bw / 2} y={y(b.q3)} width={bw} height={Math.max(1, y(b.q1) - y(b.q3))} rx={4} fill="rgb(57 135 229 / 0.25)" stroke={color} strokeWidth={1.5} />
              <line x1={cx - bw / 2} x2={cx + bw / 2} y1={y(b.med)} y2={y(b.med)} stroke={INK} strokeWidth={2} />
              <rect
                data-export-ignore
                x={left + i * band}
                y={top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setTip({
                    x: e.clientX - box.left,
                    y: e.clientY - box.top,
                    title: b.g,
                    lines: [
                      { label: 'upper whisker', value: formatFloat(b.hi, 3) },
                      { label: 'Q3', value: formatFloat(b.q3, 3) },
                      { label: 'median', value: formatFloat(b.med, 3) },
                      { label: 'Q1', value: formatFloat(b.q1, 3) },
                      { label: 'lower whisker', value: formatFloat(b.lo, 3) },
                      { label: 'outliers', value: formatNumber(b.out) },
                      { label: 'n', value: formatNumber(b.n) },
                    ],
                  })
                }}
              />
            </g>
          )
        })}
        <BandLabels labels={labels} centers={boxes.map((_, i) => left + i * band + band / 2)} y={top + innerH + 6} band={band} />
        <AxisTitle x={14} y={top + innerH / 2} rotate>
          {yLabel}
        </AxisTitle>
        {xLabel && (
          <AxisTitle x={left + innerW / 2} y={height - 6}>
            {xLabel}
          </AxisTitle>
        )}
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function Heatmap({ rows, xCat, yCat, xLabel, yLabel, width, height, svgRef }: ChartProps) {
  const [tip, setTip] = useState<Tip | null>(null)
  const uniq = (key: 'x' | 'y', cat?: TypeCategory) => {
    const m = new Map<string, unknown>()
    for (const r of rows) if (!m.has(String(r[key]))) m.set(String(r[key]), r[key])
    const vals = [...m.values()]
    if (cat && (isTemporal(cat) || isNumeric(cat))) vals.sort((a, b) => toNum(a) - toNum(b))
    else vals.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    return vals
  }
  const xs = uniq('x', xCat)
  const ys = uniq('y', yCat)
  const xl = xs.map((v) => formatX(v, xCat, xCat && isTemporal(xCat) ? isMidnight(xs.map(toNum)) : false))
  const yl = ys.map((v) => formatX(v, yCat, yCat && isTemporal(yCat) ? isMidnight(ys.map(toNum)) : false))
  const values = rows.map((r) => toNum(r.value)).filter(Number.isFinite)
  const vmin = Math.min(...values)
  const vmax = Math.max(...values)
  const left = Math.min(150, 16 + Math.max(...yl.map((l) => Math.min(20, l.length)), 2) * 6.6)
  const right = 16
  const top = 34
  const innerW = Math.max(10, width - left - right)
  const bw = innerW / Math.max(1, xs.length)
  const bottom = bottomMargin(xl, bw) + 18
  const innerH = Math.max(10, height - top - bottom)
  const bh = innerH / Math.max(1, ys.length)
  const xi = new Map(xs.map((v, i) => [String(v), i]))
  const yi = new Map(ys.map((v, i) => [String(v), i]))
  const norm = (v: number) => (vmax === vmin ? 1 : (v - vmin) / (vmax - vmin))
  const showText = bw >= 44 && bh >= 18
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <svg ref={svgRef} width={width} height={height} role="img" aria-label={`Heatmap of ${xLabel} by ${yLabel}`}>
        <defs>
          <linearGradient id="seq-grad" x1="0" x2="1">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <stop key={t} offset={t} stopColor={sequential(t)} />
            ))}
          </linearGradient>
        </defs>
        <g transform={`translate(${left} 10)`}>
          <text fontSize={11} fill={MUTED} y={9}>
            {formatCompact(vmin)}
          </text>
          <rect x={44} width={120} height={10} rx={2} fill="url(#seq-grad)" />
          <text x={170} y={9} fontSize={11} fill={MUTED}>
            {formatCompact(vmax)}
          </text>
        </g>
        {rows.map((r, k) => {
          const i = xi.get(String(r.x))!
          const j = yi.get(String(r.y))!
          const v = toNum(r.value)
          const t = norm(v)
          return (
            <g key={k}>
              <rect
                x={left + i * bw + 1}
                y={top + j * bh + 1}
                width={Math.max(1, bw - 2)}
                height={Math.max(1, bh - 2)}
                rx={3}
                fill={sequential(t)}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: `${xl[i]} × ${yl[j]}`, lines: [{ label: 'value', value: formatNumber(v) }] })
                }}
              />
              {showText && (
                <text x={left + i * bw + bw / 2} y={top + j * bh + bh / 2} dy="0.35em" textAnchor="middle" fontSize={10.5} fill={t > 0.6 ? '#0b1120' : '#e2e8f0'} pointerEvents="none">
                  {formatCompact(v)}
                </text>
              )}
            </g>
          )
        })}
        {yl.map((l, j) => (
          <text key={j} x={left - 8} y={top + j * bh + bh / 2} dy="0.35em" textAnchor="end" fontSize={11} fill={MUTED}>
            {l.length > 20 ? `${l.slice(0, 19)}…` : l}
          </text>
        ))}
        <BandLabels labels={xl} centers={xs.map((_, i) => left + i * bw + bw / 2)} y={top + innerH + 6} band={bw} />
        <AxisTitle x={left + innerW / 2} y={height - 6}>
          {xLabel} × {yLabel}
        </AxisTitle>
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  )
}

// ─── Scatter (canvas points + SVG axes) ───────────────────────────────────────

function Scatter({ rows, xCat, xLabel, yLabel, width, height, svgRef, canvasRef }: ChartProps) {
  const [tip, setTip] = useState<Tip | null>(null)
  const series = useMemo(() => {
    // Series by frequency so the most common groups get the first (most distinct) colors.
    const counts = new Map<string, number>()
    for (const r of rows) if (r.series != null) counts.set(String(r.series), (counts.get(String(r.series)) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  }, [rows])
  const geo = useMemo(() => scatterGeometry(rows, width, height, xCat), [rows, width, height, xCat])
  const localCanvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = localCanvas.current
    if (!c) return
    canvasRef.current = c
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(width * dpr)
    c.height = Math.round(height * dpr)
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.globalAlpha = rows.length > 5000 ? 0.45 : 0.7
    for (let i = 0; i < rows.length; i++) {
      const xv = geo.xsv[i]
      const yv = geo.ysv[i]
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue
      ctx.fillStyle = series.length ? colorFor(series, String(rows[i].series)) : SERIES_COLORS[0]
      ctx.beginPath()
      ctx.arc(geo.x(xv), geo.y(yv), POINT_R, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [rows, geo, series, width, height, canvasRef])

  const onMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const py = e.clientY - box.top
    let best = -1
    let bestD = 100
    for (let i = 0; i < rows.length; i++) {
      const dx = geo.x(geo.xsv[i]) - px
      const dy = geo.y(geo.ysv[i]) - py
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (best < 0) return setTip(null)
    const r = rows[best]
    setTip({
      x: px,
      y: py,
      title: r.series != null ? String(r.series) : 'point',
      lines: [
        { label: xLabel, value: formatX(r.x, xCat) },
        { label: yLabel, value: formatFloat(toNum(r.y), 4) },
      ],
    })
  }

  const legendSeries = series.length > SERIES_COLORS.length ? [...series.slice(0, SERIES_COLORS.length)] : series
  return (
    <div className="relative" style={{ width, height }} onMouseLeave={() => setTip(null)}>
      <svg ref={svgRef} width={width} height={height} className="absolute inset-0" role="img" aria-label={`Scatter plot of ${yLabel} against ${xLabel}`}>
        <Legend series={legendSeries} x={geo.left} y={16} />
        <YAxis ticks={geo.yTicks} scale={geo.y} left={geo.left} right={width - geo.right} />
        {geo.xTicks.map((t) => (
          <g key={t.v}>
            <line x1={geo.x(t.v)} x2={geo.x(t.v)} y1={geo.top} y2={geo.top + geo.innerH} stroke={GRID} />
            <text x={geo.x(t.v)} y={geo.top + geo.innerH + 18} fontSize={11} fill={MUTED} textAnchor="middle">
              {t.label}
            </text>
          </g>
        ))}
        <AxisTitle x={14} y={geo.top + geo.innerH / 2} rotate>
          {yLabel}
        </AxisTitle>
        <AxisTitle x={geo.left + geo.innerW / 2} y={height - 8}>
          {xLabel}
        </AxisTitle>
      </svg>
      <canvas ref={localCanvas} className="absolute inset-0" style={{ width, height }} onMouseMove={onMove} aria-hidden="true" />
      <Tooltip tip={tip} width={width} />
    </div>
  )
}

export function Chart(props: ChartProps) {
  switch (props.kind) {
    case 'bar':
      return <BarChart {...props} />
    case 'line':
      return <LineChart {...props} />
    case 'histogram':
      return <Histogram {...props} />
    case 'box':
      return <BoxPlot {...props} />
    case 'heatmap':
      return <Heatmap {...props} />
    case 'scatter':
      return <Scatter {...props} />
  }
}
