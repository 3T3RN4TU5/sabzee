import { quoteIdent, stripTrailingSemicolons } from './sql.ts'
import { isNumeric, isTemporal, type TypeCategory } from './types.ts'

/**
 * Chart builder → SQL. Every chart is a single DuckDB query whose result has a fixed shape,
 * so the renderer never aggregates in JavaScript and the user can see / edit exactly what
 * produced the picture.
 *
 *  bar, line  → x, [series], y
 *  scatter    → x, y, [series]               (reservoir-sampled)
 *  histogram  → bin, bin_start, bin_end, count
 *  box        → grp, lo, q1, median, q3, hi, outliers, n
 *  heatmap    → x, y, value
 */

export type ChartType = 'bar' | 'line' | 'scatter' | 'histogram' | 'box' | 'heatmap'
export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'count_distinct'
export type TimeGrain = 'none' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface ChartSpec {
  type: ChartType
  /** Table name, or a parenthesised subquery from the editor. */
  source: string
  x?: string
  y?: string
  /** Series for bar/line/scatter, grouping for box, measure for heatmap. */
  color?: string
  agg: Aggregation
  timeGrain?: TimeGrain
  bins?: number
  /** Max categories (bar / heatmap axes / box groups). */
  limit?: number
  /** Max points for scatter. */
  sample?: number
}

export const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'count', label: 'Count rows' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'median', label: 'Median' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'count_distinct', label: 'Count distinct' },
]

export const MAX_SERIES = 8

/** SQL for an aggregate over a column. `count` ignores the column (counts rows). */
export function aggExpr(agg: Aggregation, column?: string): string {
  if (agg === 'count' || !column) return 'count(*)'
  const c = quoteIdent(column)
  switch (agg) {
    case 'count_distinct':
      return `count(DISTINCT ${c})`
    case 'median':
      return `median(${c})`
    default:
      return `${agg}(${c})`
  }
}

/** Label used for the aggregated axis, e.g. `sum(fare_usd)`. */
export function aggLabel(agg: Aggregation, column?: string): string {
  if (agg === 'count' || !column) return 'count'
  return agg === 'count_distinct' ? `distinct ${column}` : `${agg}(${column})`
}

/** `FROM` target: a quoted table name, or a subquery passed through untouched. */
export function sourceSql(source: string): string {
  const s = source.trim()
  if (s.startsWith('(')) return `${s} AS src`
  if (/^\s*(select|with|from)\b/i.test(s)) return `(\n${stripTrailingSemicolons(s)}\n) AS src`
  return quoteIdent(s)
}

/** Expression for an x dimension, applying a time grain to temporal columns. */
export function dimExpr(column: string, category: TypeCategory | undefined, grain: TimeGrain = 'none'): string {
  const c = quoteIdent(column)
  if (grain !== 'none' && category && isTemporal(category)) return `date_trunc('${grain}', ${c})`
  return c
}

export interface ChartValidation {
  ok: boolean
  message?: string
}

/** Which fields a chart type needs, so the UI can explain what's missing. */
export function validateSpec(spec: ChartSpec, types: Record<string, TypeCategory>): ChartValidation {
  const needNumeric = (col: string | undefined, role: string): ChartValidation => {
    if (!col) return { ok: false, message: `Pick a ${role} column.` }
    const t = types[col]
    if (t && !isNumeric(t)) return { ok: false, message: `${role} must be numeric — "${col}" is ${t}.` }
    return { ok: true }
  }
  switch (spec.type) {
    case 'bar':
    case 'line':
      if (!spec.x) return { ok: false, message: 'Pick an X column to group by.' }
      if (spec.agg !== 'count' && spec.agg !== 'count_distinct') return needNumeric(spec.y, 'Y')
      if (spec.agg === 'count_distinct' && !spec.y) return { ok: false, message: 'Pick a Y column to count distinct values of.' }
      return { ok: true }
    case 'scatter': {
      const xr = needNumeric(spec.x, 'X')
      if (!xr.ok && !(spec.x && types[spec.x] && isTemporal(types[spec.x]))) return xr
      return needNumeric(spec.y, 'Y')
    }
    case 'histogram':
      return needNumeric(spec.x, 'X')
    case 'box':
      return needNumeric(spec.y, 'Y')
    case 'heatmap':
      if (!spec.x || !spec.y) return { ok: false, message: 'Pick X and Y columns (categories) for the grid.' }
      if (spec.agg !== 'count' && spec.agg !== 'count_distinct') return needNumeric(spec.color, 'Color (value)')
      return { ok: true }
  }
}

export function buildChartSql(spec: ChartSpec, types: Record<string, TypeCategory> = {}): string {
  const from = sourceSql(spec.source)
  const limit = Math.max(1, Math.floor(spec.limit ?? 30))
  const grain = spec.timeGrain ?? 'none'
  switch (spec.type) {
    case 'bar':
    case 'line': {
      if (!spec.x) throw new Error('x is required')
      const x = dimExpr(spec.x, types[spec.x], grain)
      const y = aggExpr(spec.agg, spec.y)
      const xIsOrdered = spec.type === 'line' || (types[spec.x] !== undefined && (isTemporal(types[spec.x]) || isNumeric(types[spec.x])))
      if (!spec.color) {
        const order = xIsOrdered ? 'x' : 'y DESC'
        const lim = spec.type === 'line' ? 5000 : limit
        return [
          `SELECT ${x} AS x, ${y} AS y`,
          `FROM ${from}`,
          `WHERE ${quoteIdent(spec.x)} IS NOT NULL`,
          `GROUP BY ALL`,
          `ORDER BY ${order}`,
          `LIMIT ${lim}`,
        ].join('\n')
      }
      // With a series: keep the top N x values (bar only) and top MAX_SERIES series by total.
      const color = quoteIdent(spec.color)
      const lines = [
        `WITH base AS (`,
        `  SELECT ${x} AS x, coalesce(CAST(${color} AS VARCHAR), 'NULL') AS series, ${spec.y ? quoteIdent(spec.y) : 'NULL'} AS v`,
        `  FROM ${from}`,
        `  WHERE ${quoteIdent(spec.x)} IS NOT NULL`,
        `),`,
        `top_series AS (`,
        `  SELECT series FROM base GROUP BY series ORDER BY count(*) DESC, series LIMIT ${MAX_SERIES}`,
        `)`,
      ]
      if (spec.type === 'bar' && !xIsOrdered) {
        lines[lines.length - 1] = '),'
        lines.push(`top_x AS (`, `  SELECT x FROM base GROUP BY x ORDER BY ${aggOver(spec.agg, 'v')} DESC LIMIT ${limit}`, `)`)
      }
      lines.push(
        `SELECT x, series, ${aggOver(spec.agg, 'v')} AS y`,
        `FROM base`,
        `WHERE series IN (SELECT series FROM top_series)` +
          (spec.type === 'bar' && !xIsOrdered ? `\n  AND x IN (SELECT x FROM top_x)` : ''),
        `GROUP BY ALL`,
        `ORDER BY x, series`,
        `LIMIT ${spec.type === 'line' ? 20000 : limit * MAX_SERIES}`,
      )
      return lines.join('\n')
    }
    case 'scatter': {
      if (!spec.x || !spec.y) throw new Error('x and y are required')
      const n = Math.max(1, Math.floor(spec.sample ?? 20000))
      const cols = [`${quoteIdent(spec.x)} AS x`, `${quoteIdent(spec.y)} AS y`]
      if (spec.color) cols.push(`CAST(${quoteIdent(spec.color)} AS VARCHAR) AS series`)
      return [
        `SELECT *`,
        `FROM (`,
        `  SELECT ${cols.join(', ')}`,
        `  FROM ${from}`,
        `  WHERE ${quoteIdent(spec.x)} IS NOT NULL AND ${quoteIdent(spec.y)} IS NOT NULL`,
        `) USING SAMPLE reservoir(${n} ROWS) REPEATABLE (42)`,
      ].join('\n')
    }
    case 'histogram': {
      if (!spec.x) throw new Error('x is required')
      const bins = Math.min(200, Math.max(2, Math.floor(spec.bins ?? 30)))
      return [
        `WITH src AS (`,
        `  SELECT CAST(${quoteIdent(spec.x)} AS DOUBLE) AS v FROM ${from} WHERE ${quoteIdent(spec.x)} IS NOT NULL`,
        `),`,
        `bounds AS (SELECT min(v) AS lo, max(v) AS hi FROM src),`,
        `binned AS (`,
        `  SELECT coalesce(least(CAST(floor((v - lo) / nullif((hi - lo) / ${bins}, 0)) AS INTEGER), ${bins - 1}), 0) AS bin`,
        `  FROM src, bounds`,
        `)`,
        `SELECT bin, lo + bin * (hi - lo) / ${bins} AS bin_start, lo + (bin + 1) * (hi - lo) / ${bins} AS bin_end, count(*) AS count`,
        `FROM binned, bounds`,
        `GROUP BY ALL`,
        `ORDER BY bin`,
      ].join('\n')
    }
    case 'box': {
      if (!spec.y) throw new Error('y is required')
      const g = spec.color ?? spec.x
      const grp = g ? `CAST(${quoteIdent(g)} AS VARCHAR)` : `'all'`
      return [
        `WITH s AS (`,
        `  SELECT ${grp} AS grp, CAST(${quoteIdent(spec.y)} AS DOUBLE) AS v FROM ${from} WHERE ${quoteIdent(spec.y)} IS NOT NULL`,
        `),`,
        `q AS (`,
        `  SELECT grp, quantile_cont(v, 0.25) AS q1, median(v) AS median, quantile_cont(v, 0.75) AS q3, count(*) AS n`,
        `  FROM s GROUP BY grp ORDER BY n DESC LIMIT ${limit}`,
        `)`,
        `SELECT q.grp, q1, median, q3,`,
        `  min(v) FILTER (WHERE v >= q1 - 1.5 * (q3 - q1)) AS lo,`,
        `  max(v) FILTER (WHERE v <= q3 + 1.5 * (q3 - q1)) AS hi,`,
        `  count(*) FILTER (WHERE v < q1 - 1.5 * (q3 - q1) OR v > q3 + 1.5 * (q3 - q1)) AS outliers,`,
        `  n`,
        `FROM s JOIN q ON s.grp IS NOT DISTINCT FROM q.grp`,
        `GROUP BY ALL`,
        `ORDER BY median DESC`,
      ].join('\n')
    }
    case 'heatmap': {
      if (!spec.x || !spec.y) throw new Error('x and y are required')
      const x = dimExpr(spec.x, types[spec.x], grain)
      const y = dimExpr(spec.y, types[spec.y], grain)
      const value = aggOver(spec.agg, 'v')
      return [
        `WITH base AS (`,
        `  SELECT ${x} AS x, ${y} AS y, ${spec.color ? quoteIdent(spec.color) : 'NULL'} AS v FROM ${from}`,
        `  WHERE ${quoteIdent(spec.x)} IS NOT NULL AND ${quoteIdent(spec.y)} IS NOT NULL`,
        `),`,
        `top_x AS (SELECT x FROM base GROUP BY x ORDER BY count(*) DESC LIMIT ${limit}),`,
        `top_y AS (SELECT y FROM base GROUP BY y ORDER BY count(*) DESC LIMIT ${limit})`,
        `SELECT x, y, ${value} AS value`,
        `FROM base`,
        `WHERE x IN (SELECT x FROM top_x) AND y IN (SELECT y FROM top_y)`,
        `GROUP BY ALL`,
        `ORDER BY x, y`,
      ].join('\n')
    }
  }
}

/** Aggregate over an already-projected column alias (used inside CTEs). */
function aggOver(agg: Aggregation, alias: string): string {
  switch (agg) {
    case 'count':
      return 'count(*)'
    case 'count_distinct':
      return `count(DISTINCT ${alias})`
    case 'median':
      return `median(${alias})`
    default:
      return `${agg}(${alias})`
  }
}

type Col = { name: string; category: TypeCategory }

const ID_LIKE = /(^|_)(id|uuid|key|code|zip|phone)$/i
const MEASURE_HINT = /(amount|revenue|sales|price|fare|total|cost|value|profit|income|spend|usd|eur|qty|quantity|count|score|duration|distance|miles|sessions|orders)/i
const DIM_HINT = /(type|category|status|segment|region|country|state|city|borough|channel|vendor|product|brand|department|group|class|kind|tier|plan|gender|method|source)/i

/** The most "measure-like" numeric column: hinted names first, then floats, never IDs. */
export function bestMeasures(columns: readonly Col[]): string[] {
  const score = (c: Col) => (MEASURE_HINT.test(c.name) ? 4 : 0) + (c.category === 'float' || c.category === 'decimal' ? 2 : 0)
  return columns
    .filter((c) => isNumeric(c.category) && !ID_LIKE.test(c.name))
    .map((c, i) => ({ c, s: score(c), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c.name)
}

/** The most "dimension-like" categorical columns: hinted names first, never IDs. */
export function bestDimensions(columns: readonly Col[]): string[] {
  return columns
    .filter((c) => (c.category === 'string' || c.category === 'boolean') && !ID_LIKE.test(c.name))
    .map((c, i) => ({ c, s: DIM_HINT.test(c.name) ? 1 : 0, i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c.name)
}

/**
 * Re-target a spec to a new chart type, keeping fields that still make sense and filling the
 * rest with sensible picks — so switching Bar → Box → Heatmap always shows something useful.
 */
export function adaptSpec(spec: ChartSpec, type: ChartType, columns: readonly Col[]): ChartSpec {
  const cat = (n?: string) => columns.find((c) => c.name === n)?.category
  const measures = bestMeasures(columns)
  const dims = bestDimensions(columns)
  const temporal = columns.find((c) => isTemporal(c.category))?.name
  const numericOk = (n?: string) => !!n && !!cat(n) && isNumeric(cat(n)!)
  const dimOk = (n?: string) => !!n && (cat(n) === 'string' || cat(n) === 'boolean')
  const m0 = numericOk(spec.y) ? spec.y : measures[0]
  const base = { source: spec.source, limit: spec.limit, bins: spec.bins, sample: spec.sample }
  switch (type) {
    case 'bar': {
      const x = dimOk(spec.x) || (spec.x && isTemporal(cat(spec.x) ?? 'other')) ? spec.x : (dims[0] ?? temporal)
      return { ...base, type, x, y: m0, agg: m0 ? (spec.agg === 'count' ? 'sum' : spec.agg) : 'count', color: dimOk(spec.color) && spec.color !== x ? spec.color : undefined, timeGrain: spec.timeGrain ?? 'month', limit: spec.limit ?? 20 }
    }
    case 'line': {
      const x = spec.x && isTemporal(cat(spec.x) ?? 'other') ? spec.x : (temporal ?? spec.x ?? dims[0])
      return { ...base, type, x, y: m0, agg: m0 ? (spec.agg === 'count' ? 'sum' : spec.agg) : 'count', color: dimOk(spec.color) ? spec.color : undefined, timeGrain: spec.timeGrain && spec.timeGrain !== 'none' ? spec.timeGrain : 'day' }
    }
    case 'scatter': {
      const x = numericOk(spec.x) ? spec.x : measures.find((m) => m !== m0) ?? measures[0]
      const y = m0 && m0 !== x ? m0 : measures.find((m) => m !== x)
      return { ...base, type, x, y, agg: 'count', color: dimOk(spec.color) ? spec.color : undefined }
    }
    case 'histogram':
      return { ...base, type, x: numericOk(spec.x) ? spec.x : m0, agg: 'count', bins: spec.bins ?? 30 }
    case 'box':
      return { ...base, type, y: m0, color: dimOk(spec.color) ? spec.color : dimOk(spec.x) ? spec.x : dims[0], agg: 'count', limit: spec.limit ?? 20 }
    case 'heatmap': {
      const x = dimOk(spec.x) || (spec.x && isTemporal(cat(spec.x) ?? 'other')) ? spec.x : dims[0]
      const y = dimOk(spec.y) && spec.y !== x ? spec.y : dims.find((d) => d !== x)
      return { ...base, type, x, y, color: m0, agg: m0 ? 'avg' : 'count', timeGrain: spec.timeGrain ?? 'month', limit: spec.limit ?? 20 }
    }
  }
}

/** Suggest a sensible default spec for a table, so the Chart tab is never blank. */
export function suggestChart(source: string, columns: Col[]): ChartSpec {
  const temporal = columns.find((c) => isTemporal(c.category))
  const measure = bestMeasures(columns)[0]
  const dim = bestDimensions(columns)[0]
  if (temporal && measure) return { type: 'line', source, x: temporal.name, y: measure, agg: 'sum', timeGrain: 'day' }
  if (dim) return { type: 'bar', source, x: dim, y: measure, agg: measure ? 'sum' : 'count', limit: 20 }
  if (measure) return { type: 'histogram', source, x: measure, agg: 'count', bins: 30 }
  return { type: 'bar', source, x: columns[0]?.name, agg: 'count', limit: 20 }
}
