/** Scoring for exported logistic / gradient-boosted / random-forest models. */
import { transformRow } from './features.ts'
import type { Calibration, CustomerRow, ModelBundle, ModelSpec, Tree } from './types.ts'

export function leafIndex(tree: Tree, z: ArrayLike<number>): number {
  let node = 0
  while (tree.feature[node] >= 0) {
    const v = z[tree.feature[node]]
    if (Number.isNaN(v)) node = tree.missing_left[node] ? tree.left[node] : tree.right[node]
    else node = v <= tree.threshold[node] ? tree.left[node] : tree.right[node]
  }
  return node
}

/** Output before calibration: log-odds for logistic/gbdt, P(churn) for forests. */
export function rawScore(z: ArrayLike<number>, m: ModelSpec): number {
  switch (m.type) {
    case 'logistic': {
      let s = 0
      for (let i = 0; i < m.coef.length; i++) s += m.coef[i] * z[i]
      return m.intercept + s
    }
    case 'gbdt': {
      let s = 0
      for (const t of m.trees) s += t.value[leafIndex(t, z)]
      return m.baseline + s
    }
    case 'forest': {
      let s = 0
      for (const t of m.trees) s += t.value[leafIndex(t, z)]
      return s / m.trees.length
    }
  }
}

/** numpy.interp semantics (clamped at both ends). */
export function interp(x: number, xp: number[], fp: number[]): number {
  const n = xp.length
  if (x <= xp[0]) return fp[0]
  if (x >= xp[n - 1]) return fp[n - 1]
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xp[mid] <= x) lo = mid
    else hi = mid
  }
  const slope = (fp[hi] - fp[lo]) / (xp[hi] - xp[lo])
  return slope * (x - xp[lo]) + fp[lo]
}

export const sigmoid = (s: number): number => 1 / (1 + Math.exp(-s))

export function calibrate(score: number, cal: Calibration, space: ModelBundle['score_space']): number {
  switch (cal.method) {
    case 'isotonic':
      return interp(score, cal.x, cal.y)
    case 'sigmoid':
      return 1 / (1 + Math.exp(cal.a * score + cal.b))
    case 'none':
      return space === 'logit' ? sigmoid(score) : score
  }
}

export interface Prediction {
  proba: number
  rawScore: number
  /** Probability before calibration (sigmoid of the log-odds, or the forest vote). */
  uncalibrated: number
}

export function predict(row: CustomerRow, bundle: ModelBundle): Prediction {
  const z = transformRow(row, bundle)
  const raw = rawScore(z, bundle.model)
  return {
    proba: calibrate(raw, bundle.calibration, bundle.score_space),
    rawScore: raw,
    uncalibrated: bundle.score_space === 'logit' ? sigmoid(raw) : raw,
  }
}

export const predictProba = (row: CustomerRow, bundle: ModelBundle): number => predict(row, bundle).proba
