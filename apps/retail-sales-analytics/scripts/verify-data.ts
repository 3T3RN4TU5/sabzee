// Verifies the committed dashboard data and the pure TS helpers that read it.
// Run with `npm test` (Node >= 22.18 strips TypeScript types natively).
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { breakdown, deltas, kpis, series } from '../src/lib/cube.ts'
import { toCsv } from '../src/lib/csv.ts'
import { fmt, monthLabel } from '../src/lib/format.ts'
import type { Cube, Monthly, Products, Quality } from '../src/lib/types.ts'

const DATA = join(import.meta.dirname, '..', 'public', 'data')
const read = <T>(name: string): T => JSON.parse(readFileSync(join(DATA, `${name}.json`), 'utf8')) as T

const cube = read<Cube>('cube')
const monthly = read<Monthly>('monthly')
const close = (a: number, b: number, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`)

test('data files exist and stay small enough to ship', () => {
  const files = readdirSync(DATA).filter((f) => f.endsWith('.json'))
  for (const f of ['meta', 'cube', 'monthly', 'forecast', 'customers', 'clv', 'products', 'experiment', 'quality']) {
    assert.ok(files.includes(`${f}.json`), `missing ${f}.json`)
  }
  const total = files.reduce((s, f) => s + statSync(join(DATA, f)).size, 0)
  assert.ok(total < 2 * 1024 * 1024, `JSON total ${total} bytes exceeds 2 MB`)
})

test('cube "all x all" series equals the SQL monthly mart', () => {
  const s = series(cube, 0, 0)
  assert.equal(s.length, monthly.months.length)
  s.forEach((p, i) => {
    assert.equal(p.month, monthly.months[i].month_label)
    close(p.revenue, monthly.months[i].revenue)
    assert.equal(p.orders, monthly.months[i].orders)
    assert.equal(p.customers, monthly.months[i].active_customers)
  })
})

test('country and category slices add up to the total revenue', () => {
  const all = { from: 0, to: cube.months.length - 1, country: 0, category: 0 }
  const total = kpis(series(cube, 0, 0), all.from, all.to).revenue
  const byCountry = breakdown(cube, all, 'country').reduce((s, r) => s + r.revenue, 0)
  const byCategory = breakdown(cube, all, 'category').reduce((s, r) => s + r.revenue, 0)
  close(byCountry, total, 1)
  close(byCategory, total, 1)
  const countryTable = monthly.countries.reduce((s, r) => s + r.revenue, 0)
  close(countryTable, total, 1)
})

test('KPI deltas compare equal-length periods, or halves when there is no history', () => {
  const pts = series(cube, 0, 0)
  const q4 = deltas(pts, { from: 9, to: 11, country: 0, category: 0 })
  assert.equal(q4.label, 'vs previous 3 mo')
  const prev = kpis(pts, 6, 8).revenue
  const cur = kpis(pts, 9, 11).revenue
  close(q4.change.revenue ?? NaN, cur / prev - 1, 1e-9)
  const year = deltas(pts, { from: 0, to: 11, country: 0, category: 0 })
  assert.match(year.label, /last 6 vs first 6/)
  const single = deltas(pts, { from: 0, to: 0, country: 0, category: 0 })
  assert.equal(single.change.revenue, null)
})

test('average order value and return rate are ratios of sums, not averages of ratios', () => {
  const pts = series(cube, 0, 0)
  const k = kpis(pts, 0, 11)
  const rev = pts.slice(0, 12).reduce((s, p) => s + p.revenue, 0)
  const ord = pts.slice(0, 12).reduce((s, p) => s + p.orders, 0)
  close(k.aov, rev / ord, 1e-9)
})

test('ABC classes and pareto curve are consistent', () => {
  const p = read<Products>('products')
  const shares = p.abc.reduce((s, a) => s + a.revenue_share, 0)
  close(shares, 1, 1e-4)
  const curve = p.pareto_curve
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i].cum_revenue_share >= curve[i - 1].cum_revenue_share)
  close(curve.at(-1)!.cum_revenue_share, 1, 1e-4)
})

test('quality report has no failed checks', () => {
  const q = read<Quality>('quality')
  assert.equal(q.summary.fail, 0)
  assert.equal(q.checks.filter((c) => c.status === 'fail').length, 0)
})

test('formatters', () => {
  assert.equal(fmt.pct(0.1234), '12.3%')
  assert.equal(fmt.signedPct(-0.05), '−5.0%')
  assert.equal(fmt.money(1234.5), '£1,235')
  assert.equal(fmt.money(null), '–')
  assert.equal(monthLabel('2011-03'), 'Mar 2011')
})

test('CSV export escapes quotes, commas and newlines', () => {
  const csv = toCsv([{ a: 'PAPER CHAIN KIT 50\'S, "XMAS"', b: 2 }], [
    { header: 'name', value: (r) => r.a },
    { header: 'n', value: (r) => r.b },
  ])
  assert.equal(csv, 'name,n\r\n"PAPER CHAIN KIT 50\'S, ""XMAS""",2\r\n')
})
