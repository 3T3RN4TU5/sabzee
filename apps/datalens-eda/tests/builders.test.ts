import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { aggExpr, aggLabel, buildChartSql, dimExpr, sourceSql, suggestChart, validateSpec, type ChartSpec } from '../src/lib/chartSql.ts'
import { buildPivotSql, valueAlias } from '../src/lib/pivotSql.ts'
import type { TypeCategory } from '../src/lib/types.ts'

const types: Record<string, TypeCategory> = {
  pickup_at: 'timestamp',
  fare: 'float',
  borough: 'string',
  payment: 'string',
  passengers: 'integer',
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('chart SQL', () => {
  it('builds aggregate expressions', () => {
    assert.equal(aggExpr('count', 'fare'), 'count(*)')
    assert.equal(aggExpr('sum', 'fare'), 'sum("fare")')
    assert.equal(aggExpr('count_distinct', 'fare'), 'count(DISTINCT "fare")')
    assert.equal(aggExpr('median', 'my col'), 'median("my col")')
    assert.equal(aggLabel('avg', 'fare'), 'avg(fare)')
    assert.equal(aggLabel('count'), 'count')
  })
  it('wraps sources: table names are quoted, queries become subqueries', () => {
    assert.equal(sourceSql('trips'), '"trips"')
    assert.equal(sourceSql('select * from trips;'), '(\nselect * from trips\n) AS src')
  })
  it('applies a time grain only to temporal columns', () => {
    assert.equal(dimExpr('pickup_at', 'timestamp', 'month'), `date_trunc('month', "pickup_at")`)
    assert.equal(dimExpr('borough', 'string', 'month'), '"borough"')
  })
  it('bar chart: groups, aggregates and orders by value for categories', () => {
    const sql = buildChartSql({ type: 'bar', source: 'trips', x: 'borough', y: 'fare', agg: 'sum', limit: 10 }, types)
    assert.equal(norm(sql), norm(`SELECT "borough" AS x, sum("fare") AS y FROM "trips" WHERE "borough" IS NOT NULL GROUP BY ALL ORDER BY y DESC LIMIT 10`))
  })
  it('bar chart with series keeps the top series and top categories', () => {
    const sql = buildChartSql({ type: 'bar', source: 'trips', x: 'borough', y: 'fare', agg: 'avg', color: 'payment' }, types)
    assert.match(sql, /top_series AS \(\n {2}SELECT series FROM base GROUP BY series ORDER BY count\(\*\) DESC, series LIMIT 8/)
    assert.match(sql, /top_x AS/)
    assert.match(sql, /AND x IN \(SELECT x FROM top_x\)/)
    assert.match(sql, /SELECT x, series, avg\(v\) AS y/)
  })
  it('line chart orders by x and truncates time', () => {
    const sql = buildChartSql({ type: 'line', source: 'trips', x: 'pickup_at', agg: 'count', timeGrain: 'day' }, types)
    assert.match(sql, /^SELECT date_trunc\('day', "pickup_at"\) AS x, count\(\*\) AS y/)
    assert.match(sql, /ORDER BY x\nLIMIT 5000$/)
  })
  it('scatter samples reproducibly', () => {
    const sql = buildChartSql({ type: 'scatter', source: 'trips', x: 'fare', y: 'passengers', agg: 'count', sample: 500 }, types)
    assert.match(sql, /USING SAMPLE reservoir\(500 ROWS\) REPEATABLE \(42\)$/)
    assert.match(sql, /"fare" IS NOT NULL AND "passengers" IS NOT NULL/)
  })
  it('histogram clamps bin count and guards zero-width ranges', () => {
    const sql = buildChartSql({ type: 'histogram', source: 'trips', x: 'fare', agg: 'count', bins: 1000 }, types)
    assert.match(sql, /nullif\(\(hi - lo\) \/ 200, 0\)/)
    assert.match(sql, /, 199\), 0\) AS bin/)
  })
  it('box plot computes Tukey whiskers per group', () => {
    const sql = buildChartSql({ type: 'box', source: 'trips', y: 'fare', color: 'borough', agg: 'count' }, types)
    assert.match(sql, /CAST\("borough" AS VARCHAR\) AS grp/)
    assert.match(sql, /min\(v\) FILTER \(WHERE v >= q1 - 1\.5 \* \(q3 - q1\)\) AS lo/)
    const all = buildChartSql({ type: 'box', source: 'trips', y: 'fare', agg: 'count' }, types)
    assert.match(all, /SELECT 'all' AS grp/)
  })
  it('heatmap aggregates a value over two dimensions', () => {
    const sql = buildChartSql({ type: 'heatmap', source: 'trips', x: 'borough', y: 'payment', color: 'fare', agg: 'avg', limit: 5 }, types)
    assert.match(sql, /SELECT x, y, avg\(v\) AS value/)
    assert.match(sql, /top_x AS \(SELECT x FROM base GROUP BY x ORDER BY count\(\*\) DESC LIMIT 5\)/)
  })
  it('validates specs with helpful messages', () => {
    const base: ChartSpec = { type: 'histogram', source: 't', agg: 'count' }
    assert.equal(validateSpec(base, types).ok, false)
    assert.match(validateSpec({ ...base, x: 'borough' }, types).message ?? '', /numeric/)
    assert.equal(validateSpec({ ...base, x: 'fare' }, types).ok, true)
    assert.equal(validateSpec({ type: 'bar', source: 't', x: 'borough', agg: 'count' }, types).ok, true)
    assert.equal(validateSpec({ type: 'bar', source: 't', x: 'borough', agg: 'sum' }, types).ok, false)
    assert.equal(validateSpec({ type: 'scatter', source: 't', x: 'pickup_at', y: 'fare', agg: 'count' }, types).ok, true)
    assert.equal(validateSpec({ type: 'heatmap', source: 't', x: 'borough', agg: 'count' }, types).ok, false)
  })
  it('suggests a sensible default chart', () => {
    const cols = Object.entries(types).map(([name, category]) => ({ name, category }))
    assert.deepEqual(suggestChart('trips', cols), { type: 'line', source: 'trips', x: 'pickup_at', y: 'fare', agg: 'sum', timeGrain: 'day' })
    assert.equal(suggestChart('t', [{ name: 'v', category: 'float' }]).type, 'histogram')
  })
})

describe('pivot SQL', () => {
  it('group-by with several measures', () => {
    const sql = buildPivotSql({ source: 'trips', rows: ['borough'], values: [{ agg: 'count' }, { agg: 'sum', column: 'fare' }] })
    assert.equal(norm(sql), norm(`SELECT "borough", count(*) AS "count", sum("fare") AS "sum_fare" FROM "trips" GROUP BY "borough" ORDER BY "borough" NULLS LAST`))
  })
  it('adds ROLLUP subtotals and value ordering', () => {
    const sql = buildPivotSql({ source: 'trips', rows: ['borough', 'payment'], values: [{ agg: 'avg', column: 'fare' }], totals: true, sortByValue: true, limit: 50 })
    assert.match(sql, /GROUP BY ROLLUP \("borough", "payment"\)/)
    assert.match(sql, /ORDER BY GROUPING\("borough", "payment"\) DESC, "avg_fare" DESC\nLIMIT 50$/)
  })
  it('PIVOT keeps the most frequent pivot values', () => {
    const sql = buildPivotSql({ source: 'trips', rows: ['borough'], pivot: 'payment', values: [{ agg: 'avg', column: 'fare' }], maxPivotValues: 4 })
    assert.match(sql, /^PIVOT \(\n {2}SELECT "borough", "payment", "fare"/)
    assert.match(sql, /GROUP BY "payment" ORDER BY count\(\*\) DESC LIMIT 4/)
    assert.match(sql, /ON "payment"\nUSING avg\("fare"\) AS "avg_fare"\nGROUP BY "borough"/)
  })
  it('defaults to count(*) and de-duplicates aliases', () => {
    assert.match(buildPivotSql({ source: 't', rows: [], values: [] }), /^SELECT count\(\*\) AS "count"\nFROM "t"$/)
    const sql = buildPivotSql({ source: 't', rows: ['a'], values: [{ agg: 'sum', column: 'x' }, { agg: 'sum', column: 'x' }] })
    assert.match(sql, /AS "sum_x",\s+sum\("x"\) AS "sum_x_2"/)
    assert.equal(valueAlias({ agg: 'count_distinct', column: 'u' }), 'distinct_u')
  })
})
