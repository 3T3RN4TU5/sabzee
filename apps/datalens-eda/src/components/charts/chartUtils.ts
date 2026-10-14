import { formatCompact, formatDate, formatFloat, formatTimestamp } from '../../lib/format.ts'
import { formatTimeTick, linear, niceTicks, OTHER_COLOR, SERIES_COLORS, timeTicks } from '../../lib/scale.ts'
import { isTemporal, type TypeCategory } from '../../lib/types.ts'

/** Shared, non-component chart helpers (kept out of Chart.tsx so Fast Refresh stays happy). */

export type Row = Record<string, unknown>

export const POINT_R = 2.6

// Exported SVGs can't resolve CSS variables, so the export path swaps these for literals.
export const CSS_VARS: Record<string, string> = {
  'var(--chart-ink)': '#e2e8f0',
  'var(--chart-muted)': '#8b93a7',
  'var(--chart-grid)': '#232b3d',
  'var(--chart-axis)': '#3a4458',
}

export const toNum = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : v instanceof Date ? v.getTime() : Number(v))

export function isMidnight(values: number[]): boolean {
  return values.every((v) => v % 86_400_000 === 0)
}

export function formatX(v: unknown, cat: TypeCategory | undefined, allMidnight = false): string {
  if (v == null) return 'NULL'
  if (cat && isTemporal(cat)) {
    const ms = toNum(v)
    return cat === 'date' || allMidnight ? formatDate(ms) : formatTimestamp(ms)
  }
  if (typeof v === 'number') return formatFloat(v, 4)
  if (typeof v === 'bigint') return v.toString()
  return String(v)
}

export function seriesOf(rows: Row[]): string[] {
  const set = new Set<string>()
  for (const r of rows) if (r.series != null) set.add(String(r.series))
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export function colorFor(series: string[], s: string | undefined): string {
  if (s == null) return SERIES_COLORS[0]
  const i = series.indexOf(s)
  return i >= 0 && i < SERIES_COLORS.length ? SERIES_COLORS[i] : OTHER_COLOR
}

export function scatterGeometry(rows: Row[], width: number, height: number, xCat?: TypeCategory) {
  const xsv = rows.map((r) => toNum(r.x))
  const ysv = rows.map((r) => toNum(r.y))
  const fx = xsv.filter(Number.isFinite)
  const fy = ysv.filter(Number.isFinite)
  const xmin = fx.length ? fx.reduce((a, b) => Math.min(a, b)) : 0
  const xmax = fx.length ? fx.reduce((a, b) => Math.max(a, b)) : 1
  const ymin = fy.length ? fy.reduce((a, b) => Math.min(a, b)) : 0
  const ymax = fy.length ? fy.reduce((a, b) => Math.max(a, b)) : 1
  const temporal = !!xCat && isTemporal(xCat)
  const xt = temporal ? null : niceTicks(xmin, xmax, Math.max(2, Math.floor(width / 90)))
  const yt = niceTicks(ymin, ymax, 5)
  const top = 34
  const left = 58
  const right = 16
  const bottom = 50
  const innerW = Math.max(10, width - left - right)
  const innerH = Math.max(10, height - top - bottom)
  const xd: [number, number] = xt ? xt.domain : [xmin, xmax === xmin ? xmin + 1 : xmax]
  const x = linear(xd, [left, left + innerW])
  const y = linear(yt.domain, [top + innerH, top])
  let xTicks: { v: number; label: string }[]
  if (temporal) {
    const tt = timeTicks(xmin, xmax, Math.max(2, Math.floor(innerW / 90)))
    xTicks = tt.ticks.map((v) => ({ v, label: formatTimeTick(v, tt.unit) }))
  } else xTicks = xt!.ticks.map((v) => ({ v, label: formatCompact(v) }))
  return { xsv, ysv, x, y, xTicks, yTicks: yt.ticks, top, left, right, bottom, innerW, innerH }
}

/** SVG circles for exporting a scatter (the on-screen points live on a canvas). */
export function scatterSvgPoints(rows: Row[], width: number, height: number, xCat?: TypeCategory): string {
  const geo = scatterGeometry(rows, width, height, xCat)
  const counts = new Map<string, number>()
  for (const r of rows) if (r.series != null) counts.set(String(r.series), (counts.get(String(r.series)) ?? 0) + 1)
  const series = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const opacity = rows.length > 5000 ? 0.45 : 0.7
  let out = `<g fill-opacity="${opacity}">`
  for (let i = 0; i < rows.length; i++) {
    const xv = geo.xsv[i]
    const yv = geo.ysv[i]
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue
    const fill = series.length ? colorFor(series, String(rows[i].series)) : SERIES_COLORS[0]
    out += `<circle cx="${geo.x(xv).toFixed(1)}" cy="${geo.y(yv).toFixed(1)}" r="${POINT_R}" fill="${fill}"/>`
  }
  return out + '</g>'
}

