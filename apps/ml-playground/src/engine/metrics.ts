/** Evaluation metrics for classifiers, regressors and clusterings. */
import { sqDist, type Matrix } from './linalg.ts'

export function argmaxRows(probs: Float64Array, k: number): Int32Array {
  const n = probs.length / k
  const out = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    let best = 0
    for (let j = 1; j < k; j++) if (probs[i * k + j] > probs[i * k + best]) best = j
    out[i] = best
  }
  return out
}

export function accuracy(yTrue: ArrayLike<number>, yPred: ArrayLike<number>): number {
  if (yTrue.length === 0) return 0
  let ok = 0
  for (let i = 0; i < yTrue.length; i++) if (yTrue[i] === yPred[i]) ok++
  return ok / yTrue.length
}

/** k×k matrix, rows = true class, columns = predicted class. */
export function confusionMatrix(yTrue: ArrayLike<number>, yPred: ArrayLike<number>, k: number): number[][] {
  const m = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (let i = 0; i < yTrue.length; i++) m[yTrue[i]][yPred[i]]++
  return m
}

export interface ClassReport {
  precision: number[]
  recall: number[]
  f1: number[]
  support: number[]
  macro: { precision: number; recall: number; f1: number }
}

export function classificationReport(cm: number[][]): ClassReport {
  const k = cm.length
  const precision: number[] = []
  const recall: number[] = []
  const f1: number[] = []
  const support: number[] = []
  for (let c = 0; c < k; c++) {
    const tp = cm[c][c]
    let predicted = 0
    let actual = 0
    for (let j = 0; j < k; j++) {
      predicted += cm[j][c]
      actual += cm[c][j]
    }
    const p = predicted ? tp / predicted : 0
    const r = actual ? tp / actual : 0
    precision.push(p)
    recall.push(r)
    f1.push(p + r ? (2 * p * r) / (p + r) : 0)
    support.push(actual)
  }
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1)
  return { precision, recall, f1, support, macro: { precision: mean(precision), recall: mean(recall), f1: mean(f1) } }
}

export interface RocCurve {
  fpr: number[]
  tpr: number[]
  auc: number
}

/**
 * ROC curve for a binary problem from scores for the positive class.
 * Ties are grouped so the curve is exact; AUC by the trapezoid rule.
 */
export function rocCurve(yTrue: ArrayLike<number>, scores: ArrayLike<number>): RocCurve {
  const n = yTrue.length
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[b] - scores[a])
  let P = 0
  for (let i = 0; i < n; i++) if (yTrue[i] === 1) P++
  const N = n - P
  const fpr = [0]
  const tpr = [0]
  let tp = 0
  let fp = 0
  for (let i = 0; i < n; i++) {
    if (yTrue[idx[i]] === 1) tp++
    else fp++
    if (i === n - 1 || scores[idx[i + 1]] !== scores[idx[i]]) {
      fpr.push(N ? fp / N : 0)
      tpr.push(P ? tp / P : 0)
    }
  }
  let auc = 0
  for (let i = 1; i < fpr.length; i++) auc += ((fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1])) / 2
  return { fpr, tpr, auc }
}

export function meanSquaredError(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
  return a.length ? s / a.length : 0
}

/** Within-cluster sum of squared distances to the assigned centroid. */
export function inertia(X: Matrix, labels: ArrayLike<number>, centroids: Matrix): number {
  let s = 0
  for (let i = 0; i < X.rows; i++) s += sqDist(X.data, i * X.cols, centroids.data, labels[i] * X.cols, X.cols)
  return s
}

/**
 * Mean silhouette coefficient s = (b − a) / max(a, b), where a is the mean
 * distance to the point's own cluster and b to the nearest other cluster.
 * Points labelled −1 (noise) are ignored. O(n²).
 */
export function silhouetteScore(X: Matrix, labels: ArrayLike<number>): number {
  const n = X.rows
  const d = X.cols
  let k = 0
  for (let i = 0; i < n; i++) k = Math.max(k, labels[i] + 1)
  if (k < 2) return 0
  const sums = new Float64Array(k)
  const counts = new Int32Array(k)
  for (let i = 0; i < n; i++) if (labels[i] >= 0) counts[labels[i]]++
  let total = 0
  let m = 0
  for (let i = 0; i < n; i++) {
    const li = labels[i]
    if (li < 0) continue
    sums.fill(0)
    for (let j = 0; j < n; j++) {
      if (j === i || labels[j] < 0) continue
      sums[labels[j]] += Math.sqrt(sqDist(X.data, i * d, X.data, j * d, d))
    }
    if (counts[li] <= 1) {
      m++
      continue
    }
    const a = sums[li] / (counts[li] - 1)
    let b = Infinity
    for (let c = 0; c < k; c++) if (c !== li && counts[c] > 0) b = Math.min(b, sums[c] / counts[c])
    if (!Number.isFinite(b)) continue
    total += (b - a) / Math.max(a, b)
    m++
  }
  return m ? total / m : 0
}
