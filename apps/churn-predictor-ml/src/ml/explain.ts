/**
 * Per-prediction explanations in raw-score space (log-odds for logistic/gbdt).
 *
 * - logistic: exact linear SHAP, coef_j * (z_j - mean_j) with the training mean as background.
 * - trees: exact path-dependent TreeSHAP (Lundberg et al. 2018, Algorithm 2), using node
 *   covers (training sample counts). Mirrors `ml/churn/inference.py::tree_shap`, which is
 *   checked against the `shap` library and a brute-force Shapley computation in pytest.
 *
 * In both cases base + Σ contributions === raw score (local accuracy).
 */
import { transformRow } from './features.ts'
import { rawScore } from './model.ts'
import type { CustomerRow, ModelBundle, Tree } from './types.ts'

interface PathEl {
  feature: number
  zero: number
  one: number
  w: number
}

function extend(path: PathEl[], zero: number, one: number, feature: number): PathEl[] {
  const p = path.map((e) => ({ ...e }))
  const d = p.length
  p.push({ feature, zero, one, w: d === 0 ? 1 : 0 })
  for (let i = d - 1; i >= 0; i--) {
    p[i + 1].w += (one * p[i].w * (i + 1)) / (d + 1)
    p[i].w = (zero * p[i].w * (d - i)) / (d + 1)
  }
  return p
}

function unwind(path: PathEl[], idx: number): PathEl[] {
  const p = path.map((e) => ({ ...e }))
  const d = p.length - 1
  const { one, zero } = p[idx]
  let next = p[d].w
  for (let i = d - 1; i >= 0; i--) {
    if (one !== 0) {
      const tmp = p[i].w
      p[i].w = (next * (d + 1)) / ((i + 1) * one)
      next = tmp - (p[i].w * zero * (d - i)) / (d + 1)
    } else {
      p[i].w = (p[i].w * (d + 1)) / (zero * (d - i))
    }
  }
  const weights = p.slice(0, d).map((e) => e.w)
  p.splice(idx, 1)
  for (let i = 0; i < weights.length; i++) p[i].w = weights[i]
  return p
}

function unwoundSum(path: PathEl[], idx: number): number {
  const d = path.length - 1
  const { one, zero } = path[idx]
  let next = path[d].w
  let total = 0
  for (let i = d - 1; i >= 0; i--) {
    if (one !== 0) {
      const tmp = (next * (d + 1)) / ((i + 1) * one)
      total += tmp
      next = path[i].w - (tmp * zero * (d - i)) / (d + 1)
    } else {
      total += path[i].w / zero / ((d - i) / (d + 1))
    }
  }
  return total
}

/** Add one tree's SHAP values for input `z` into `phi`. */
export function treeShap(tree: Tree, z: ArrayLike<number>, phi: Float64Array): void {
  const { feature, threshold, left, right, value, cover, missing_left } = tree
  const recurse = (node: number, parent: PathEl[], zero: number, one: number, f: number): void => {
    let path = extend(parent, zero, one, f)
    if (feature[node] < 0) {
      for (let i = 1; i < path.length; i++) {
        const w = unwoundSum(path, i)
        phi[path[i].feature] += w * (path[i].one - path[i].zero) * value[node]
      }
      return
    }
    const v = z[feature[node]]
    const goLeft = Number.isNaN(v) ? missing_left[node] : v <= threshold[node]
    const hot = goLeft ? left[node] : right[node]
    const cold = goLeft ? right[node] : left[node]
    let incZero = 1
    let incOne = 1
    for (let k = 1; k < path.length; k++) {
      if (path[k].feature === feature[node]) {
        incZero = path[k].zero
        incOne = path[k].one
        path = unwind(path, k)
        break
      }
    }
    recurse(hot, path, (cover[hot] / cover[node]) * incZero, incOne, feature[node])
    recurse(cold, path, (cover[cold] / cover[node]) * incZero, 0, feature[node])
  }
  recurse(0, [], 1, 1, -1)
}

/** Cover-weighted mean leaf value: the tree's expected output on the training data. */
export function treeExpectedValue(tree: Tree): number {
  let num = 0
  let den = 0
  for (let i = 0; i < tree.feature.length; i++) {
    if (tree.feature[i] < 0) {
      num += tree.cover[i] * tree.value[i]
      den += tree.cover[i]
    }
  }
  return num / den
}

export interface Explanation {
  /** Expected raw score over the training data. */
  base: number
  /** Raw score for this customer (base + Σ phi). */
  score: number
  /** One value per transformed feature. */
  phi: Float64Array
}

export function explain(row: CustomerRow, bundle: ModelBundle): Explanation {
  const z = transformRow(row, bundle)
  const m = bundle.model
  const phi = new Float64Array(z.length)
  if (m.type === 'logistic') {
    const mean = bundle.explanation.background_mean
    let base = m.intercept
    for (let i = 0; i < z.length; i++) {
      base += m.coef[i] * mean[i]
      phi[i] = m.coef[i] * (z[i] - mean[i])
    }
    return { base, score: rawScore(z, m), phi }
  }
  let base = 0
  for (const t of m.trees) {
    treeShap(t, z, phi)
    base += treeExpectedValue(t)
  }
  if (m.type === 'gbdt') return { base: m.baseline + base, score: rawScore(z, m), phi }
  const k = m.trees.length
  for (let i = 0; i < phi.length; i++) phi[i] /= k
  return { base: base / k, score: rawScore(z, m), phi }
}

export interface GroupContribution {
  feature: string
  value: number
}

/** Sum one-hot columns back to their source feature, sorted by |contribution|. */
export function explainGrouped(row: CustomerRow, bundle: ModelBundle): { base: number; score: number; groups: GroupContribution[] } {
  const { base, score, phi } = explain(row, bundle)
  const sums = new Map<string, number>()
  bundle.feature_groups.forEach((g, i) => sums.set(g, (sums.get(g) ?? 0) + phi[i]))
  const groups = [...sums].map(([feature, value]) => ({ feature, value }))
  groups.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  return { base, score, groups }
}
