/**
 * Parity tests for the browser inference engine (`npm test`).
 *
 * The fixture holds 200 held-out customers with the probabilities scikit-learn
 * produced at export time. The TypeScript engine must reproduce them to 1e-9 —
 * both pipelines use IEEE-754 doubles with the same operation order, so the only
 * expected differences are last-ulp rounding in exp() and summation order.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { explain, explainGrouped, treeExpectedValue, treeShap } from '../src/ml/explain.ts'
import { engineerRow, transformRow } from '../src/ml/features.ts'
import { interp, predict, rawScore, leafIndex } from '../src/ml/model.ts'
import { averagePrecision, brier, campaignProfit, confusionAt, rocAuc } from '../src/ml/metrics.ts'
import { parseCsv, toCsv } from '../src/ml/csv.ts'
import { normalizeCustomer, PRESETS } from '../src/ml/schema.ts'
import type { CustomerRow, ModelBundle, Tree } from '../src/ml/types.ts'

const load = <T>(rel: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8')) as T

interface FixtureRow {
  customerID: string
  features: CustomerRow
  champion: { proba: number; raw_score: number }
  challenger: { proba: number; raw_score: number }
}
const fixture = load<{ tolerance: number; rows: FixtureRow[] }>('public/model/parity_fixture.json')
const models = {
  champion: load<ModelBundle>('public/model/model.json'),
  challenger: load<ModelBundle>('public/model/model_challenger.json'),
}
const TOL = 1e-9

for (const role of ['champion', 'challenger'] as const) {
  const bundle = models[role]

  test(`${role} (${bundle.model.type}): probabilities match scikit-learn on ${fixture.rows.length} held-out rows`, () => {
    assert.ok(fixture.rows.length >= 200)
    let maxErr = 0
    for (const r of fixture.rows) {
      const pred = predict(r.features, bundle)
      maxErr = Math.max(maxErr, Math.abs(pred.proba - r[role].proba))
      assert.ok(Math.abs(pred.rawScore - r[role].raw_score) < TOL, `${r.customerID} raw score`)
    }
    assert.ok(maxErr < TOL, `max |Δp| = ${maxErr}`)
    console.log(`  ${role}: max |p_ts - p_sklearn| = ${maxErr.toExponential(2)}`)
  })

  test(`${role}: explanations are locally accurate (base + Σφ = raw score)`, () => {
    for (const r of fixture.rows.slice(0, 60)) {
      const { base, score, phi } = explain(r.features, bundle)
      const sum = phi.reduce((a, b) => a + b, 0)
      assert.ok(Math.abs(base + sum - score) < 1e-9, `${r.customerID}: ${base + sum} vs ${score}`)
      const grouped = explainGrouped(r.features, bundle)
      const gsum = grouped.groups.reduce((a, g) => a + g.value, 0)
      assert.ok(Math.abs(grouped.base + gsum - score) < 1e-9)
    }
  })
}

test('TreeSHAP matches brute-force Shapley values on a hand-made tree', () => {
  // x0 <= 0.5 ? (x1 <= 0.5 ? 1 : 3) : (x0 <= 1.5 ? 5 : x1 <= 0.5 ? 7 : 11)
  const tree: Tree = {
    feature: [0, 1, -1, -1, 0, -1, 1, -1, -1],
    threshold: [0.5, 0.5, 0, 0, 1.5, 0, 0.5, 0, 0],
    left: [1, 2, -1, -1, 5, -1, 7, -1, -1],
    right: [4, 3, -1, -1, 6, -1, 8, -1, -1],
    missing_left: Array(9).fill(true),
    value: [0, 0, 1, 3, 0, 5, 0, 7, 11],
    cover: [100, 40, 30, 10, 60, 20, 40, 25, 15],
  }
  const v = (S: Set<number>, z: number[], node = 0): number => {
    const f = tree.feature[node]
    if (f < 0) return tree.value[node]
    const l = tree.left[node]
    const r = tree.right[node]
    if (S.has(f)) return v(S, z, z[f] <= tree.threshold[node] ? l : r)
    return (tree.cover[l] * v(S, z, l) + tree.cover[r] * v(S, z, r)) / tree.cover[node]
  }
  for (const z of [[0, 0], [0, 1], [1, 0], [2, 1], [2, 0]]) {
    const phi = new Float64Array(2)
    treeShap(tree, z, phi)
    // Two players: closed-form Shapley values.
    const e = v(new Set(), z)
    const a = v(new Set([0]), z)
    const b = v(new Set([1]), z)
    const ab = v(new Set([0, 1]), z)
    const exp0 = 0.5 * (a - e) + 0.5 * (ab - b)
    const exp1 = 0.5 * (b - e) + 0.5 * (ab - a)
    assert.ok(Math.abs(phi[0] - exp0) < 1e-12, `phi0 ${phi[0]} vs ${exp0}`)
    assert.ok(Math.abs(phi[1] - exp1) < 1e-12, `phi1 ${phi[1]} vs ${exp1}`)
    assert.ok(Math.abs(treeExpectedValue(tree) + phi[0] + phi[1] - tree.value[leafIndex(tree, z)]) < 1e-12)
  }
})

test('feature engineering edge cases mirror pandas', () => {
  const spec = models.champion.engineering
  const row = { ...PRESETS[0].row, tenure: 0, TotalCharges: null }
  const e = engineerRow(row, spec)
  assert.ok(Number.isNaN(e.avg_monthly_spend as number))
  assert.ok(Number.isNaN(e.charge_ratio as number))
  assert.equal(e.tenure_bucket, '0-5m')
  assert.equal(engineerRow({ ...row, tenure: 48 }, spec).tenure_bucket, '48m+')
  assert.equal(engineerRow({ ...row, tenure: '12' }, spec).tenure_bucket, '12-23m')
  // Missing values are imputed, unknown categories encode to all-zeros.
  const z = transformRow({ ...row, PaymentMethod: 'Crypto' }, models.champion)
  assert.ok(z.every((x) => Number.isFinite(x)))
  const p = predict({ ...row, PaymentMethod: 'Crypto' }, models.champion).proba
  assert.ok(p >= 0 && p <= 1)
})

test('isotonic interpolation follows numpy.interp', () => {
  const xp = [0, 1, 2]
  const fp = [0.1, 0.3, 0.9]
  assert.equal(interp(-5, xp, fp), 0.1)
  assert.equal(interp(5, xp, fp), 0.9)
  assert.ok(Math.abs(interp(1.5, xp, fp) - 0.6) < 1e-15)
  assert.equal(interp(1, xp, fp), 0.3)
})

test('presets are internally consistent and ordered by risk', () => {
  for (const p of PRESETS) assert.deepEqual(normalizeCustomer(p.row), p.row)
  const prob = (id: string) => predict(PRESETS.find((p) => p.id === id)!.row, models.champion).proba
  assert.ok(prob('high-risk') > 0.5, `high-risk preset ${prob('high-risk')}`)
  assert.ok(prob('loyal') < 0.1, `loyal preset ${prob('loyal')}`)
})

test('metrics: AUC, AP, Brier, confusion and profit', () => {
  const y = [1, 1, 0, 0, 1, 0]
  const p = [0.9, 0.4, 0.6, 0.1, 0.7, 0.3]
  assert.deepEqual(confusionAt(y, p, 0.5), { tp: 2, fp: 1, fn: 1, tn: 2 })
  assert.ok(Math.abs(rocAuc(y, p) - 8 / 9) < 1e-12)
  assert.ok(Math.abs(rocAuc([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5]) - 0.5) < 1e-12)
  // sklearn.metrics.average_precision_score(y, p) == 0.9166666666666665
  assert.ok(Math.abs(averagePrecision(y, p) - 0.9166666666666665) < 1e-12)
  assert.ok(Math.abs(brier([1, 0], [0.8, 0.4]) - 0.1) < 1e-12)
  const b = { offer_cost: 10, offer_success: 0.5, horizon_months: 1 }
  assert.equal(campaignProfit([1, 0, 1], [0.8, 0.9, 0.1], [100, 100, 100], 0.5, b), 30)
  // Live AUC on the shipped test predictions matches the training report.
  const tp = load<{ rows: (number | string)[][] }>('public/model/test_predictions.json')
  const report = load<{ test: { metrics: { roc_auc: number } } }>('public/model/report.json')
  const ys = tp.rows.map((r) => r[0] as number)
  const ps = tp.rows.map((r) => r[1] as number)
  assert.ok(Math.abs(rocAuc(ys, ps) - report.test.metrics.roc_auc) < 1e-4)
})

test('CSV round trip handles quotes, commas and CRLF', () => {
  const text = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['', 'z']]).replace(/\n/g, '\r\n')
  assert.deepEqual(parseCsv(text), [['a', 'b'], ['x,y', 'say "hi"'], ['', 'z']])
  const sample = parseCsv(readFileSync(fileURLToPath(new URL('../public/sample_customers.csv', import.meta.url)), 'utf8'))
  assert.equal(sample[0][0], 'customerID')
  assert.equal(sample.length, 151)
})

test('raw score of a GBDT is baseline + leaf values', () => {
  const m = models.challenger.model
  if (m.type !== 'gbdt') return
  const z = transformRow(fixture.rows[0].features, models.challenger)
  const manual = m.trees.reduce((s, t) => s + t.value[leafIndex(t, z)], m.baseline)
  assert.ok(Math.abs(rawScore(z, m) - manual) < 1e-12)
})
