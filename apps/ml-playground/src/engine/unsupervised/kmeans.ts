/**
 * k-means (Lloyd's algorithm) with k-means++ seeding. Exposed both as a
 * one-shot `kmeans()` and as separate assign / update steps so the UI can
 * animate each half-iteration.
 */
import { matrix, sqDist, type Matrix } from '../linalg.ts'
import { inertia } from '../metrics.ts'
import { seededRng, type Rng } from '../rng.ts'

/**
 * k-means++ (Arthur & Vassilvitskii, 2007): the first centre is uniform, each
 * next one is sampled with probability proportional to D(x)², the squared
 * distance to the nearest centre chosen so far.
 */
export function kmeansPlusPlus(X: Matrix, k: number, rng: Rng): Matrix {
  const n = X.rows
  const d = X.cols
  const C = matrix(k, d)
  const first = Math.floor(rng() * n)
  C.data.set(X.data.subarray(first * d, first * d + d), 0)
  const D = new Float64Array(n).fill(Infinity)
  for (let c = 1; c < k; c++) {
    let total = 0
    for (let i = 0; i < n; i++) {
      D[i] = Math.min(D[i], sqDist(X.data, i * d, C.data, (c - 1) * d, d))
      total += D[i]
    }
    let r = rng() * total
    let pick = n - 1
    for (let i = 0; i < n; i++) {
      r -= D[i]
      if (r <= 0) {
        pick = i
        break
      }
    }
    C.data.set(X.data.subarray(pick * d, pick * d + d), c * d)
  }
  return C
}

export function randomInit(X: Matrix, k: number, rng: Rng): Matrix {
  const d = X.cols
  const C = matrix(k, d)
  for (let c = 0; c < k; c++) {
    const i = Math.floor(rng() * X.rows)
    C.data.set(X.data.subarray(i * d, i * d + d), c * d)
  }
  return C
}

/** Assignment step: label each point with its nearest centroid. */
export function assign(X: Matrix, C: Matrix): Int32Array {
  const d = X.cols
  const labels = new Int32Array(X.rows)
  for (let i = 0; i < X.rows; i++) {
    let best = 0
    let bestD = Infinity
    for (let c = 0; c < C.rows; c++) {
      const dist = sqDist(X.data, i * d, C.data, c * d, d)
      if (dist < bestD) {
        bestD = dist
        best = c
      }
    }
    labels[i] = best
  }
  return labels
}

/** Update step: move each centroid to the mean of its points (empty clusters stay put). */
export function updateCentroids(X: Matrix, labels: Int32Array, prev: Matrix): Matrix {
  const d = X.cols
  const C = matrix(prev.rows, d)
  const counts = new Int32Array(prev.rows)
  for (let i = 0; i < X.rows; i++) {
    counts[labels[i]]++
    for (let j = 0; j < d; j++) C.data[labels[i] * d + j] += X.data[i * d + j]
  }
  for (let c = 0; c < prev.rows; c++) {
    for (let j = 0; j < d; j++) C.data[c * d + j] = counts[c] ? C.data[c * d + j] / counts[c] : prev.data[c * d + j]
  }
  return C
}

export interface KMeansResult {
  centroids: Matrix
  labels: Int32Array
  inertia: number
  iterations: number
}

export function kmeans(X: Matrix, k: number, opts: { seed?: number; maxIter?: number; init?: 'kmeans++' | 'random'; nInit?: number } = {}): KMeansResult {
  const rng = seededRng(opts.seed ?? 1)
  let best: KMeansResult | null = null
  for (let run = 0; run < (opts.nInit ?? 1); run++) {
    let C = (opts.init ?? 'kmeans++') === 'kmeans++' ? kmeansPlusPlus(X, k, rng) : randomInit(X, k, rng)
    let labels = assign(X, C)
    let it = 0
    for (; it < (opts.maxIter ?? 300); it++) {
      const next = updateCentroids(X, labels, C)
      let shift = 0
      for (let i = 0; i < next.data.length; i++) shift = Math.max(shift, Math.abs(next.data[i] - C.data[i]))
      C = next
      labels = assign(X, C)
      if (shift < 1e-10) break
    }
    const result = { centroids: C, labels, inertia: inertia(X, labels, C), iterations: it + 1 }
    if (!best || result.inertia < best.inertia) best = result
  }
  return best!
}
