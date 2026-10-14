/** Evaluation helpers used by the performance and batch pages (mirror ml/churn/metrics.py). */
import type { BusinessParams } from './types.ts'

export interface Confusion {
  tp: number
  fp: number
  fn: number
  tn: number
}

export function confusionAt(y: ArrayLike<number>, p: ArrayLike<number>, t: number): Confusion {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 }
  for (let i = 0; i < y.length; i++) {
    const pred = p[i] >= t
    if (pred && y[i] === 1) c.tp++
    else if (pred) c.fp++
    else if (y[i] === 1) c.fn++
    else c.tn++
  }
  return c
}

export function rates(c: Confusion) {
  const precision = c.tp + c.fp ? c.tp / (c.tp + c.fp) : 0
  const recall = c.tp + c.fn ? c.tp / (c.tp + c.fn) : 0
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  const fpr = c.fp + c.tn ? c.fp / (c.fp + c.tn) : 0
  const n = c.tp + c.fp + c.fn + c.tn
  return { precision, recall, f1, fpr, flagRate: n ? (c.tp + c.fp) / n : 0, accuracy: n ? (c.tp + c.tn) / n : 0 }
}

/** Revenue at risk for a customer: horizon × monthly charge. */
export const customerValue = (monthly: number, b: BusinessParams): number => b.horizon_months * monthly

/** Expected value of contacting one customer with calibrated churn probability p. */
export const contactValue = (p: number, monthly: number, b: BusinessParams): number =>
  p * b.offer_success * customerValue(monthly, b) - b.offer_cost

/** Realised campaign profit vs doing nothing (needs true labels). */
export function campaignProfit(y: ArrayLike<number>, p: ArrayLike<number>, monthly: ArrayLike<number>, t: number, b: BusinessParams): number {
  let s = 0
  for (let i = 0; i < y.length; i++) {
    if (p[i] >= t) s += (y[i] === 1 ? b.offer_success * customerValue(monthly[i], b) : 0) - b.offer_cost
  }
  return s
}

export function profitCurve(y: ArrayLike<number>, p: ArrayLike<number>, monthly: ArrayLike<number>, b: BusinessParams, steps = 100) {
  const out: { threshold: number; profit: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    out.push({ threshold: t, profit: campaignProfit(y, p, monthly, t, b) })
  }
  return out
}

/** ROC-AUC via the rank-sum (Mann–Whitney) formulation, ties averaged. */
export function rocAuc(y: ArrayLike<number>, p: ArrayLike<number>): number {
  const idx = Array.from({ length: y.length }, (_, i) => i).sort((a, b) => p[a] - p[b])
  const ranks = new Float64Array(y.length)
  for (let i = 0; i < idx.length; ) {
    let j = i
    while (j + 1 < idx.length && p[idx[j + 1]] === p[idx[i]]) j++
    const r = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[idx[k]] = r
    i = j + 1
  }
  let nPos = 0
  let sumPos = 0
  for (let i = 0; i < y.length; i++) {
    if (y[i] === 1) {
      nPos++
      sumPos += ranks[i]
    }
  }
  const nNeg = y.length - nPos
  if (!nPos || !nNeg) return Number.NaN
  return (sumPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg)
}

/** Sorted-threshold sweep producing ROC and PR points (one per distinct score). */
export function curves(y: ArrayLike<number>, p: ArrayLike<number>) {
  const idx = Array.from({ length: y.length }, (_, i) => i).sort((a, b) => p[b] - p[a])
  let P = 0
  for (let i = 0; i < y.length; i++) P += y[i]
  const N = y.length - P
  const roc: { fpr: number; tpr: number; t: number }[] = [{ fpr: 0, tpr: 0, t: 1 }]
  const pr: { recall: number; precision: number; t: number }[] = []
  let tp = 0
  let fp = 0
  for (let i = 0; i < idx.length; i++) {
    if (y[idx[i]] === 1) tp++
    else fp++
    if (i + 1 < idx.length && p[idx[i + 1]] === p[idx[i]]) continue
    roc.push({ fpr: fp / N, tpr: tp / P, t: p[idx[i]] })
    pr.push({ recall: tp / P, precision: tp / (tp + fp), t: p[idx[i]] })
  }
  return { roc, pr }
}

/** Average precision (step-wise area under the PR curve, as sklearn computes it). */
export function averagePrecision(y: ArrayLike<number>, p: ArrayLike<number>): number {
  const { pr } = curves(y, p)
  let ap = 0
  let prevRecall = 0
  for (const pt of pr) {
    ap += (pt.recall - prevRecall) * pt.precision
    prevRecall = pt.recall
  }
  return ap
}

export function brier(y: ArrayLike<number>, p: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < y.length; i++) s += (p[i] - y[i]) ** 2
  return s / y.length
}

/** Equal-count reliability bins. */
export function reliability(y: ArrayLike<number>, p: ArrayLike<number>, bins = 10) {
  const idx = Array.from({ length: y.length }, (_, i) => i).sort((a, b) => p[a] - p[b])
  const out: { meanPred: number; fracPos: number; n: number }[] = []
  for (let b = 0; b < bins; b++) {
    const lo = Math.floor((b * idx.length) / bins)
    const hi = Math.floor(((b + 1) * idx.length) / bins)
    if (hi <= lo) continue
    let sp = 0
    let sy = 0
    for (let k = lo; k < hi; k++) {
      sp += p[idx[k]]
      sy += y[idx[k]]
    }
    out.push({ meanPred: sp / (hi - lo), fracPos: sy / (hi - lo), n: hi - lo })
  }
  return out
}

/** Downsample a curve for plotting, always keeping the endpoints. */
export function thin<T>(points: T[], max = 200): T[] {
  if (points.length <= max) return points
  const out: T[] = []
  const step = (points.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)])
  return out
}
