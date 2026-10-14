import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  columnCountsSql,
  correlationPairs,
  correlationSql,
  deriveWarnings,
  histogramsSql,
  missingPatternsSql,
  numericExpr,
  numericStatsSql,
  outlierRowsSql,
  overviewSql,
  summarizeSql,
  textShapeSql,
  topValuesSql,
  type ColumnFacts,
} from '../src/lib/profileSql.ts'

const cols = [
  { name: 'fare', category: 'float' as const },
  { name: 'weird "name"', category: 'integer' as const },
  { name: 'at', category: 'timestamp' as const },
]

describe('profiling SQL', () => {
  it('overview counts rows and distinct rows', () => {
    assert.match(overviewSql('t'), /count\(\*\) FROM \(SELECT DISTINCT \* FROM "t"\)/)
    assert.equal(summarizeSql('my table'), 'SUMMARIZE "my table"')
  })
  it('aliases per-column aggregates by position', () => {
    const sql = columnCountsSql('t', cols)
    assert.match(sql, /count\("fare"\) AS n_0/)
    assert.match(sql, /count\(DISTINCT "weird ""name"""\) AS d_1/)
  })
  it('casts temporal columns to epoch ms for numeric analyses', () => {
    assert.equal(numericExpr(cols[2]), 'CAST(epoch_ms(CAST("at" AS TIMESTAMP)) AS DOUBLE)')
    assert.equal(numericExpr(cols[0]), 'CAST("fare" AS DOUBLE)')
  })
  it('numeric stats unpivot once and compute IQR, z-score and MAD outliers', () => {
    const sql = numericStatsSql('t', cols.slice(0, 2))
    assert.match(sql, /UNPIVOT \(SELECT CAST\("fare" AS DOUBLE\) AS c0, CAST\("weird ""name""" AS DOUBLE\) AS c1 FROM "t"\) ON COLUMNS\(\*\) INTO NAME col VALUE v/)
    assert.match(sql, /skewness\(v\) AS skew, kurtosis\(v\) AS kurt, mad\(v\) AS mad/)
    assert.match(sql, /AS iqr_outliers/)
    assert.match(sql, /abs\(v - mean\) > 3 \* std\) AS z_outliers/)
    assert.match(sql, /3\.5 \* 1\.4826 \* mad\) AS mad_outliers/)
  })
  it('histograms bin all columns in one pass', () => {
    const sql = histogramsSql('t', cols, 10)
    assert.match(sql, /\* 10\) AS INTEGER\), 9\), 0\) AS bin/)
  })
  it('top values union one ranked subquery per column', () => {
    const sql = topValuesSql('t', cols.slice(0, 2), 5)
    assert.equal(sql.split('UNION ALL').length, 2)
    assert.match(sql, /\(SELECT 1 AS col, CAST\("weird ""name""" AS VARCHAR\) AS val, count\(\*\) AS cnt FROM "t" WHERE .* LIMIT 5\)/)
  })
  it('text shape uses TRY_CAST to detect numbers and dates hiding in text', () => {
    const sql = textShapeSql('t', [{ name: 'rating', category: 'string' }])
    assert.match(sql, /count\(TRY_CAST\("rating" AS DOUBLE\)\) AS num_0/)
    assert.match(sql, /count\(TRY_CAST\("rating" AS DATE\)\) AS date_0/)
    assert.match(sql, /"rating" <> trim\("rating"\)/)
  })
  it('correlation covers the upper triangle', () => {
    assert.deepEqual(correlationPairs(3), [
      [0, 1],
      [0, 2],
      [1, 2],
    ])
    const sql = correlationSql('t', cols)
    assert.equal((sql.match(/corr\(/g) ?? []).length, 3)
    assert.match(sql, /AS r_1_2/)
    assert.equal(correlationSql('t', cols.slice(0, 1)), 'SELECT 1 AS none')
  })
  it('missing patterns group by null flags', () => {
    assert.equal(missingPatternsSql('t', cols.slice(0, 1), 3), 'SELECT "fare" IS NULL AS m_0, count(*) AS cnt\nFROM "t"\nGROUP BY ALL\nORDER BY cnt DESC\nLIMIT 3')
  })
  it('outlier rows are ordered by distance outside the fences', () => {
    assert.match(outlierRowsSql('t', 'fare', -2, 40), /WHERE "fare" < -2 OR "fare" > 40\nORDER BY greatest\(-2 - "fare", "fare" - 40\) DESC/)
  })
})

describe('data-quality warnings', () => {
  const col = (c: Partial<ColumnFacts> & { name: string }): ColumnFacts => ({ category: 'string', nonNull: 100, distinct: 10, ...c })
  const kinds = (cs: ColumnFacts[], dup = 0) => deriveWarnings({ rowCount: 100, duplicateRows: dup, columns: cs }).map((w) => `${w.column ?? '*'}:${w.kind}`)

  it('flags empty tables', () => {
    assert.equal(deriveWarnings({ rowCount: 0, duplicateRows: 0, columns: [] })[0].kind, 'empty')
  })
  it('flags duplicates, constants, all-null and missing values', () => {
    assert.deepEqual(kinds([col({ name: 'c', distinct: 1 })], 3), ['*:duplicates', 'c:constant'])
    assert.deepEqual(kinds([col({ name: 'n', nonNull: 0, distinct: 0 })]), ['n:empty'])
    assert.deepEqual(kinds([col({ name: 'm', nonNull: 40 })]), ['m:missing'])
    assert.equal(deriveWarnings({ rowCount: 100, duplicateRows: 0, columns: [col({ name: 'm', nonNull: 90 })] })[0].severity, 'medium')
  })
  it('recognises identifiers and high cardinality', () => {
    assert.deepEqual(kinds([col({ name: 'order_id', distinct: 100 })]), ['order_id:id'])
    assert.deepEqual(kinds([col({ name: 'trip_id', category: 'integer', distinct: 100 })]), ['trip_id:id'])
    assert.deepEqual(kinds([col({ name: 'customer', nonNull: 100, distinct: 80 })]), ['customer:cardinality'])
    // A unique float is a measurement, not an ID.
    assert.deepEqual(kinds([col({ name: 'price', category: 'float', distinct: 100 })]), [])
  })
  it('detects mixed types and numbers or dates stored as text', () => {
    assert.deepEqual(kinds([col({ name: 'rating', numericLike: 80, dateLike: 0 })]), ['rating:mixed'])
    assert.deepEqual(kinds([col({ name: 'amount', numericLike: 100, dateLike: 0 })]), ['amount:numeric-text'])
    assert.deepEqual(kinds([col({ name: 'day', numericLike: 0, dateLike: 100 })]), ['day:date-text'])
    assert.deepEqual(kinds([col({ name: 'name', numericLike: 1, dateLike: 0, untrimmed: 4 })]), ['name:whitespace'])
  })
  it('flags skew and outliers on numeric columns', () => {
    const w = kinds([col({ name: 'miles', category: 'float', distinct: 90, skew: 5.2, iqrOutliers: 8 })])
    assert.deepEqual(w.sort(), ['miles:outliers', 'miles:skew'])
  })
  it('sorts warnings by severity', () => {
    const ws = deriveWarnings({
      rowCount: 100,
      duplicateRows: 0,
      columns: [col({ name: 'a', category: 'float', distinct: 50, skew: 3 }), col({ name: 'b', nonNull: 10 })],
    })
    assert.deepEqual(ws.map((w) => w.severity), ['high', 'low'])
  })
})
