import { aggExpr, sourceSql, type Aggregation } from './chartSql.ts'
import { quoteIdent } from './sql.ts'

/**
 * Pivot / group-by builder → SQL.
 *
 * Without a pivot column it is a GROUP BY (optionally with ROLLUP subtotals). With one, it
 * uses DuckDB's `PIVOT … ON … USING … GROUP BY …`, keeping only the most frequent pivot
 * values so the output stays readable.
 */

export interface PivotValue {
  column?: string
  agg: Aggregation
}

export interface PivotSpec {
  source: string
  rows: string[]
  /** Optional column whose distinct values become output columns. */
  pivot?: string
  values: PivotValue[]
  /** Max distinct pivot values turned into columns. */
  maxPivotValues?: number
  /** Add subtotal / grand-total rows (GROUP BY only). */
  totals?: boolean
  /** Sort by the first value column descending (else by the row keys). */
  sortByValue?: boolean
  limit?: number
}

export function valueAlias(v: PivotValue): string {
  if (v.agg === 'count' || !v.column) return 'count'
  return v.agg === 'count_distinct' ? `distinct_${v.column}` : `${v.agg}_${v.column}`
}

/** De-duplicate aliases (`sum_x`, `sum_x_2`) when the same measure is added twice. */
function uniqueAliases(values: PivotValue[]): string[] {
  const seen = new Map<string, number>()
  return values.map((v) => {
    const a = valueAlias(v)
    const n = (seen.get(a) ?? 0) + 1
    seen.set(a, n)
    return n === 1 ? a : `${a}_${n}`
  })
}

export function buildPivotSql(spec: PivotSpec): string {
  const values = spec.values.length ? spec.values : [{ agg: 'count' as const }]
  const aliases = uniqueAliases(values)
  const from = sourceSql(spec.source)
  const rows = spec.rows.map(quoteIdent)
  const limit = spec.limit ? `\nLIMIT ${Math.max(1, Math.floor(spec.limit))}` : ''

  if (!spec.pivot) {
    const select = [...rows, ...values.map((v, i) => `${aggExpr(v.agg, v.column)} AS ${quoteIdent(aliases[i])}`)]
    const groupBy = rows.length === 0 ? '' : spec.totals ? `\nGROUP BY ROLLUP (${rows.join(', ')})` : `\nGROUP BY ${rows.join(', ')}`
    const orderBy =
      rows.length === 0
        ? ''
        : spec.sortByValue
          ? `\nORDER BY ${spec.totals ? `GROUPING(${rows.join(', ')}) DESC, ` : ''}${quoteIdent(aliases[0])} DESC`
          : `\nORDER BY ${rows.map((r) => `${r} NULLS LAST`).join(', ')}`
    return `SELECT ${select.join(',\n       ')}\nFROM ${from}${groupBy}${orderBy}${limit}`
  }

  const pivot = quoteIdent(spec.pivot)
  const maxValues = Math.max(1, Math.floor(spec.maxPivotValues ?? 12))
  const needed = new Set<string>([...spec.rows, spec.pivot])
  for (const v of values) if (v.column) needed.add(v.column)
  const projected = [...needed].map(quoteIdent).join(', ')
  const using = values.map((v, i) => `${aggExpr(v.agg, v.column)} AS ${quoteIdent(aliases[i])}`).join(', ')
  const lines = [
    `PIVOT (`,
    `  SELECT ${projected}`,
    `  FROM ${from}`,
    `  WHERE ${pivot} IN (`,
    `    SELECT ${pivot} FROM ${from} WHERE ${pivot} IS NOT NULL`,
    `    GROUP BY ${pivot} ORDER BY count(*) DESC LIMIT ${maxValues}`,
    `  )`,
    `)`,
    `ON ${pivot}`,
    `USING ${using}`,
  ]
  if (rows.length) lines.push(`GROUP BY ${rows.join(', ')}`, `ORDER BY ${rows.map((r) => `${r} NULLS LAST`).join(', ')}`)
  return lines.join('\n') + limit
}
