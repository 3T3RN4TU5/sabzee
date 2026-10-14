import { formatPercent } from './format.ts'
import { quoteIdent } from './sql.ts'
import { isNumeric, isTemporal, type TypeCategory } from './types.ts'

/**
 * Profiling = a handful of set-based DuckDB queries per table (never a JS loop over rows).
 * Column names are aliased by position (`n_0`, `d_0`, …) so arbitrary names can't break the
 * generated SQL; results are mapped back by index.
 */

export interface ProfileColumn {
  name: string
  category: TypeCategory
}

const t = quoteIdent

/** Row count and number of exact duplicate rows. */
export function overviewSql(table: string): string {
  return [
    `SELECT`,
    `  (SELECT count(*) FROM ${t(table)}) AS row_count,`,
    `  (SELECT count(*) FROM (SELECT DISTINCT * FROM ${t(table)})) AS distinct_rows`,
  ].join('\n')
}

/** DuckDB's built-in SUMMARIZE: type, min/max, approx distinct, avg, std, q25/q50/q75, null %. */
export function summarizeSql(table: string): string {
  return `SUMMARIZE ${t(table)}`
}

/** Exact non-null and distinct counts for every column in one scan. */
export function columnCountsSql(table: string, columns: readonly ProfileColumn[]): string {
  const parts = columns.flatMap((c, i) => [`count(${t(c.name)}) AS n_${i}`, `count(DISTINCT ${t(c.name)}) AS d_${i}`])
  return `SELECT\n  ${parts.join(',\n  ')}\nFROM ${t(table)}`
}

/** Expression that turns a numeric or temporal column into DOUBLE (temporal → epoch milliseconds). */
export function numericExpr(c: ProfileColumn): string {
  if (isTemporal(c.category)) return `CAST(epoch_ms(CAST(${t(c.name)} AS TIMESTAMP)) AS DOUBLE)`
  return `CAST(${t(c.name)} AS DOUBLE)`
}

/** Long (column, value) relation over the given columns; UNPIVOT drops NULLs. */
function longForm(table: string, cols: readonly ProfileColumn[]): string {
  const projected = cols.map((c, i) => `${numericExpr(c)} AS c${i}`).join(', ')
  return `UNPIVOT (SELECT ${projected} FROM ${t(table)}) ON COLUMNS(*) INTO NAME col VALUE v`
}

/**
 * Distribution shape and outliers for numeric columns:
 * mean, std, exact quantiles, skewness, excess kurtosis, MAD and three outlier counts —
 * Tukey fences (1.5×IQR), |z| > 3, and robust modified z-score (|v − median| > 3.5 × 1.4826 × MAD).
 */
export function numericStatsSql(table: string, cols: readonly ProfileColumn[]): string {
  return [
    `WITH long AS (${longForm(table, cols)}),`,
    `s AS (`,
    `  SELECT col,`,
    `    count(v) AS n, avg(v) AS mean, stddev_samp(v) AS std, min(v) AS min, max(v) AS max,`,
    `    quantile_cont(v, [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]) AS q,`,
    `    skewness(v) AS skew, kurtosis(v) AS kurt, mad(v) AS mad,`,
    `    count(*) FILTER (WHERE v = 0) AS zeros, count(*) FILTER (WHERE v < 0) AS negatives`,
    `  FROM long GROUP BY col`,
    `)`,
    `SELECT s.*,`,
    `  count(*) FILTER (WHERE v < q[3] - 1.5 * (q[5] - q[3]) OR v > q[5] + 1.5 * (q[5] - q[3])) AS iqr_outliers,`,
    `  count(*) FILTER (WHERE std > 0 AND abs(v - mean) > 3 * std) AS z_outliers,`,
    `  count(*) FILTER (WHERE mad > 0 AND abs(v - q[4]) > 3.5 * 1.4826 * mad) AS mad_outliers,`,
    `  q[3] - 1.5 * (q[5] - q[3]) AS lower_fence, q[5] + 1.5 * (q[5] - q[3]) AS upper_fence`,
    `FROM long JOIN s USING (col)`,
    `GROUP BY ALL`,
    `ORDER BY col`,
  ].join('\n')
}

/** Equal-width histograms for many columns in a single pass. */
export function histogramsSql(table: string, cols: readonly ProfileColumn[], bins = 24): string {
  return [
    `WITH long AS (${longForm(table, cols)}),`,
    `b AS (SELECT col, min(v) AS lo, max(v) AS hi FROM long GROUP BY col)`,
    `SELECT col, coalesce(least(CAST(floor((v - lo) / nullif(hi - lo, 0) * ${bins}) AS INTEGER), ${bins - 1}), 0) AS bin,`,
    `  any_value(lo) AS lo, any_value(hi) AS hi, count(*) AS cnt`,
    `FROM long JOIN b USING (col)`,
    `GROUP BY ALL`,
    `ORDER BY col, bin`,
  ].join('\n')
}

/** Most frequent values per column (as text), `k` per column. */
export function topValuesSql(table: string, cols: readonly ProfileColumn[], k = 8): string {
  return cols
    .map(
      (c, i) =>
        `(SELECT ${i} AS col, CAST(${t(c.name)} AS VARCHAR) AS val, count(*) AS cnt FROM ${t(table)} ` +
        `WHERE ${t(c.name)} IS NOT NULL GROUP BY ALL ORDER BY cnt DESC, val LIMIT ${k})`,
    )
    .join('\nUNION ALL\n')
}

/** For text columns: how many values parse as numbers / dates, length range, stray whitespace. */
export function textShapeSql(table: string, cols: readonly ProfileColumn[]): string {
  const parts = cols.flatMap((c, i) => {
    const x = t(c.name)
    return [
      `count(TRY_CAST(${x} AS DOUBLE)) AS num_${i}`,
      `count(TRY_CAST(${x} AS DATE)) AS date_${i}`,
      `min(length(${x})) AS minlen_${i}`,
      `max(length(${x})) AS maxlen_${i}`,
      `count(*) FILTER (WHERE ${x} <> trim(${x})) AS untrimmed_${i}`,
    ]
  })
  return `SELECT\n  ${parts.join(',\n  ')}\nFROM ${t(table)}`
}

/** Index pairs (i < j) for the upper triangle of a correlation matrix. */
export function correlationPairs(n: number): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j])
  return pairs
}

/** Pearson correlation for every pair of numeric columns, in one aggregate query. */
export function correlationSql(table: string, cols: readonly ProfileColumn[]): string {
  const pairs = correlationPairs(cols.length)
  if (pairs.length === 0) return 'SELECT 1 AS none'
  const parts = pairs.map(([i, j]) => `corr(${numericExpr(cols[i])}, ${numericExpr(cols[j])}) AS r_${i}_${j}`)
  return `SELECT\n  ${parts.join(',\n  ')}\nFROM ${t(table)}`
}

/** Frequency of each combination of missing columns (only columns that have NULLs). */
export function missingPatternsSql(table: string, cols: readonly ProfileColumn[], limit = 12): string {
  const flags = cols.map((c, i) => `${t(c.name)} IS NULL AS m_${i}`)
  return `SELECT ${flags.join(', ')}, count(*) AS cnt\nFROM ${t(table)}\nGROUP BY ALL\nORDER BY cnt DESC\nLIMIT ${limit}`
}

/** Rows flagged as IQR outliers in one column, most extreme first — drives "show outliers". */
export function outlierRowsSql(table: string, column: string, lower: number, upper: number, limit = 1000): string {
  const c = t(column)
  return [
    `SELECT *`,
    `FROM ${t(table)}`,
    `WHERE ${c} < ${lower} OR ${c} > ${upper}`,
    `ORDER BY greatest(${lower} - ${c}, ${c} - ${upper}) DESC`,
    `LIMIT ${limit}`,
  ].join('\n')
}

/** Columns that can enter numeric analyses (histogram, correlation, outliers). */
export function numericColumns(cols: readonly ProfileColumn[]): ProfileColumn[] {
  return cols.filter((c) => isNumeric(c.category))
}

// ─── Data-quality warnings ──────────────────────────────────────────────────────

export type Severity = 'high' | 'medium' | 'low'

export interface Warning {
  column?: string
  kind:
    | 'duplicates'
    | 'empty'
    | 'constant'
    | 'missing'
    | 'id'
    | 'cardinality'
    | 'mixed'
    | 'numeric-text'
    | 'date-text'
    | 'skew'
    | 'outliers'
    | 'whitespace'
  severity: Severity
  message: string
}

export interface ColumnFacts {
  name: string
  category: TypeCategory
  nonNull: number
  distinct: number
  skew?: number | null
  iqrOutliers?: number
  /** Text columns: values that parse as numbers / dates, and with leading/trailing spaces. */
  numericLike?: number
  dateLike?: number
  untrimmed?: number
}

export interface TableFacts {
  rowCount: number
  duplicateRows: number
  columns: ColumnFacts[]
}

const ID_NAME = /(^|_|\b)(id|uuid|guid|key|code|number|no)$/i

export function deriveWarnings(facts: TableFacts): Warning[] {
  const out: Warning[] = []
  const { rowCount } = facts
  if (rowCount === 0) return [{ kind: 'empty', severity: 'high', message: 'The table has no rows.' }]
  if (facts.duplicateRows > 0) {
    out.push({
      kind: 'duplicates',
      severity: facts.duplicateRows / rowCount > 0.01 ? 'high' : 'medium',
      message: `${facts.duplicateRows.toLocaleString('en-US')} exact duplicate rows (${formatPercent(facts.duplicateRows / rowCount)}).`,
    })
  }
  for (const c of facts.columns) {
    const nullFrac = 1 - c.nonNull / rowCount
    if (c.nonNull === 0) {
      out.push({ column: c.name, kind: 'empty', severity: 'high', message: 'Every value is NULL.' })
      continue
    }
    if (nullFrac >= 0.5) {
      out.push({ column: c.name, kind: 'missing', severity: 'high', message: `${formatPercent(nullFrac)} of values are missing.` })
    } else if (nullFrac >= 0.05) {
      out.push({ column: c.name, kind: 'missing', severity: 'medium', message: `${formatPercent(nullFrac)} of values are missing.` })
    }
    if (c.distinct === 1 && rowCount > 1) {
      out.push({ column: c.name, kind: 'constant', severity: 'medium', message: 'Constant column — a single distinct value carries no information.' })
      continue
    }
    const unique = c.distinct === c.nonNull && c.nonNull === rowCount && rowCount > 1
    const idType = c.category === 'integer' || c.category === 'string'
    if (unique && idType && (ID_NAME.test(c.name) || c.category === 'string' || rowCount >= 20)) {
      out.push({ column: c.name, kind: 'id', severity: 'low', message: 'Likely an identifier: unique for every row. Exclude it from aggregates.' })
    } else if (c.category === 'string' && c.distinct > 50 && c.distinct / c.nonNull > 0.5) {
      out.push({
        column: c.name,
        kind: 'cardinality',
        severity: 'low',
        message: `High cardinality: ${c.distinct.toLocaleString('en-US')} distinct values (${formatPercent(c.distinct / c.nonNull)} of rows).`,
      })
    }
    if (c.category === 'string' && c.numericLike != null) {
      const numFrac = c.numericLike / c.nonNull
      const dateFrac = (c.dateLike ?? 0) / c.nonNull
      if (numFrac === 1) {
        out.push({ column: c.name, kind: 'numeric-text', severity: 'medium', message: 'Numbers stored as text — CAST it to a numeric type.' })
      } else if (dateFrac === 1) {
        out.push({ column: c.name, kind: 'date-text', severity: 'medium', message: 'Dates stored as text — CAST it to DATE.' })
      } else if (numFrac >= 0.05) {
        out.push({
          column: c.name,
          kind: 'mixed',
          severity: numFrac >= 0.5 ? 'high' : 'medium',
          message: `Mixed types: ${formatPercent(numFrac)} of values are numeric, the rest are text.`,
        })
      } else if (dateFrac >= 0.05) {
        out.push({ column: c.name, kind: 'mixed', severity: 'medium', message: `Mixed types: ${formatPercent(dateFrac)} of values are dates.` })
      }
      if (c.untrimmed && c.untrimmed > 0) {
        out.push({
          column: c.name,
          kind: 'whitespace',
          severity: 'low',
          message: `${c.untrimmed.toLocaleString('en-US')} values have leading or trailing spaces.`,
        })
      }
    }
    if (isNumeric(c.category)) {
      if (c.skew != null && Math.abs(c.skew) > 2) {
        out.push({
          column: c.name,
          kind: 'skew',
          severity: 'low',
          message: `Highly ${c.skew > 0 ? 'right' : 'left'}-skewed (skewness ${c.skew.toFixed(1)}) — consider a log scale or median.`,
        })
      }
      if (c.iqrOutliers && c.iqrOutliers / c.nonNull >= 0.005) {
        out.push({
          column: c.name,
          kind: 'outliers',
          severity: c.iqrOutliers / c.nonNull >= 0.05 ? 'medium' : 'low',
          message: `${c.iqrOutliers.toLocaleString('en-US')} outliers outside the 1.5×IQR fences (${formatPercent(c.iqrOutliers / c.nonNull)}).`,
        })
      }
    }
  }
  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity])
}
