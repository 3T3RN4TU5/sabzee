import type { Engine, TableMeta } from './engine.ts'
import { toObjects } from './arrow.ts'
import {
  columnCountsSql,
  correlationSql,
  deriveWarnings,
  histogramsSql,
  missingPatternsSql,
  numericStatsSql,
  overviewSql,
  summarizeSql,
  textShapeSql,
  topValuesSql,
  type ProfileColumn,
  type Warning,
} from '../lib/profileSql.ts'
import { isNumeric, isTemporal, type TypeCategory } from '../lib/types.ts'

export interface NumericStats {
  mean: number
  std: number | null
  min: number
  max: number
  /** p1, p5, p25, p50, p75, p95, p99 */
  q: number[]
  skew: number | null
  kurt: number | null
  mad: number | null
  zeros: number
  negatives: number
  iqrOutliers: number
  zOutliers: number
  madOutliers: number
  lowerFence: number
  upperFence: number
}

export interface ColumnProfile {
  name: string
  type: string
  category: TypeCategory
  nonNull: number
  nulls: number
  nullFrac: number
  distinct: number
  summary: { min: string | null; max: string | null; avg: string | null; std: string | null; q25: string | null; q50: string | null; q75: string | null }
  numeric?: NumericStats
  histogram?: { lo: number; hi: number; counts: number[] }
  top: { value: string; count: number }[]
  text?: { numericLike: number; dateLike: number; minLen: number | null; maxLen: number | null; untrimmed: number }
}

export interface TableProfile {
  table: string
  rowCount: number
  duplicateRows: number
  columns: ColumnProfile[]
  warnings: Warning[]
  correlation?: { columns: string[]; matrix: (number | null)[][] }
  missing?: { columns: string[]; patterns: { flags: boolean[]; count: number }[] }
  ms: number
  queries: number
}

const HIST_BINS = 24
const MAX_NUMERIC = 24
const MAX_CORR = 14

const num = (v: unknown): number => (v == null ? 0 : Number(v))
const numOrNull = (v: unknown): number | null => (v == null || Number.isNaN(Number(v)) ? null : Number(v))

export async function profileTable(engine: Engine, meta: TableMeta, onStep?: (label: string) => void): Promise<TableProfile> {
  const t0 = performance.now()
  let queries = 0
  const run = async <T,>(label: string, sql: string) => {
    onStep?.(label)
    queries++
    return toObjects<T>(await engine.q(sql))
  }
  const table = meta.name
  const cols: ProfileColumn[] = meta.columns.map((c) => ({ name: c.name, category: c.category }))

  const [overview] = await run<{ row_count: number; distinct_rows: number }>('Counting rows and duplicates', overviewSql(table))
  const rowCount = num(overview.row_count)
  const duplicateRows = rowCount - num(overview.distinct_rows)

  const summary = await run<Record<string, unknown>>('Running SUMMARIZE', summarizeSql(table))
  const summaryBy = new Map(summary.map((s) => [String(s.column_name), s]))

  const [counts] = cols.length ? await run<Record<string, unknown>>('Exact distinct counts', columnCountsSql(table, cols)) : [{}]

  const profiles: ColumnProfile[] = meta.columns.map((c, i) => {
    const s = summaryBy.get(c.name) ?? {}
    const str = (k: string) => (s[k] == null ? null : String(s[k]))
    const nonNull = num(counts[`n_${i}`])
    return {
      name: c.name,
      type: c.type,
      category: c.category,
      nonNull,
      nulls: rowCount - nonNull,
      nullFrac: rowCount ? (rowCount - nonNull) / rowCount : 0,
      distinct: num(counts[`d_${i}`]),
      summary: { min: str('min'), max: str('max'), avg: str('avg'), std: str('std'), q25: str('q25'), q50: str('q50'), q75: str('q75') },
      top: [],
    }
  })
  const byName = new Map(profiles.map((p) => [p.name, p]))

  // Numeric distribution, outliers and histograms (temporal columns get histograms too).
  const numericCols = cols.filter((c) => isNumeric(c.category) && byName.get(c.name)!.nonNull > 0).slice(0, MAX_NUMERIC)
  if (numericCols.length && rowCount > 0) {
    const stats = await run<Record<string, unknown>>('Distribution shape & outliers', numericStatsSql(table, numericCols))
    for (const s of stats) {
      const c = numericCols[Number(String(s.col).slice(1))]
      const p = byName.get(c.name)!
      const q = (s.q as number[] | null) ?? []
      p.numeric = {
        mean: num(s.mean),
        std: numOrNull(s.std),
        min: num(s.min),
        max: num(s.max),
        q: Array.from(q, Number),
        skew: numOrNull(s.skew),
        kurt: numOrNull(s.kurt),
        mad: numOrNull(s.mad),
        zeros: num(s.zeros),
        negatives: num(s.negatives),
        iqrOutliers: num(s.iqr_outliers),
        zOutliers: num(s.z_outliers),
        madOutliers: num(s.mad_outliers),
        lowerFence: num(s.lower_fence),
        upperFence: num(s.upper_fence),
      }
    }
  }
  const histCols = cols.filter((c) => (isNumeric(c.category) || isTemporal(c.category)) && byName.get(c.name)!.nonNull > 0).slice(0, MAX_NUMERIC + 6)
  if (histCols.length && rowCount > 0) {
    const bins = await run<{ col: string; bin: number; lo: number; hi: number; cnt: number }>('Histograms', histogramsSql(table, histCols, HIST_BINS))
    for (const b of bins) {
      const c = histCols[Number(String(b.col).slice(1))]
      const p = byName.get(c.name)!
      p.histogram ??= { lo: Number(b.lo), hi: Number(b.hi), counts: new Array(HIST_BINS).fill(0) }
      p.histogram.counts[Number(b.bin)] = num(b.cnt)
    }
  }

  // Top values for everything except nested/binary columns.
  const topCols = cols.filter((c) => !['list', 'struct', 'blob'].includes(c.category)).slice(0, 60)
  if (topCols.length && rowCount > 0) {
    const tops = await run<{ col: number; val: string; cnt: number }>('Top values', topValuesSql(table, topCols, 8))
    for (const r of tops) byName.get(topCols[Number(r.col)].name)!.top.push({ value: r.val, count: num(r.cnt) })
  }

  // Text columns: numbers/dates hiding in strings, lengths, whitespace.
  const textCols = cols.filter((c) => c.category === 'string')
  if (textCols.length && rowCount > 0) {
    const [shape] = await run<Record<string, unknown>>('Type consistency of text columns', textShapeSql(table, textCols))
    textCols.forEach((c, i) => {
      byName.get(c.name)!.text = {
        numericLike: num(shape[`num_${i}`]),
        dateLike: num(shape[`date_${i}`]),
        minLen: numOrNull(shape[`minlen_${i}`]),
        maxLen: numOrNull(shape[`maxlen_${i}`]),
        untrimmed: num(shape[`untrimmed_${i}`]),
      }
    })
  }

  // Correlation matrix across numeric columns with variance.
  let correlation: TableProfile['correlation']
  const corrCols = numericCols.filter((c) => (byName.get(c.name)!.numeric?.std ?? 0) > 0 && byName.get(c.name)!.distinct > 1).slice(0, MAX_CORR)
  if (corrCols.length >= 2) {
    const [r] = await run<Record<string, unknown>>('Correlation matrix', correlationSql(table, corrCols))
    const n = corrCols.length
    const matrix: (number | null)[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : null)))
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const v = numOrNull(r[`r_${i}_${j}`])
        matrix[i][j] = v
        matrix[j][i] = v
      }
    correlation = { columns: corrCols.map((c) => c.name), matrix }
  }

  // Missing-value patterns over columns that have NULLs.
  let missing: TableProfile['missing']
  const nullCols = cols.filter((c) => byName.get(c.name)!.nulls > 0).slice(0, 30)
  if (nullCols.length) {
    const pats = await run<Record<string, unknown>>('Missing-value patterns', missingPatternsSql(table, nullCols, 12))
    missing = {
      columns: nullCols.map((c) => c.name),
      patterns: pats.map((p) => ({ flags: nullCols.map((_, i) => Boolean(p[`m_${i}`])), count: num(p.cnt) })),
    }
  }

  const warnings = deriveWarnings({
    rowCount,
    duplicateRows,
    columns: profiles.map((p) => ({
      name: p.name,
      category: p.category,
      nonNull: p.nonNull,
      distinct: p.distinct,
      skew: p.numeric?.skew,
      iqrOutliers: p.numeric?.iqrOutliers,
      numericLike: p.text?.numericLike,
      dateLike: p.text?.dateLike,
      untrimmed: p.text?.untrimmed,
    })),
  })

  return { table, rowCount, duplicateRows, columns: profiles, warnings, correlation, missing, ms: performance.now() - t0, queries }
}
