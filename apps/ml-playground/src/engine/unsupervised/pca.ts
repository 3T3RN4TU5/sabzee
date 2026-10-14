/**
 * Principal component analysis: eigendecomposition of the sample covariance
 * matrix (cyclic Jacobi, or power iteration with deflation). Components are
 * the eigenvectors; their eigenvalues are the explained variances.
 */
import { columnMeans, columnStds, covariance, jacobiEigen, matrix, powerIteration, type Matrix } from '../linalg.ts'

export interface PcaModel {
  mean: Float64Array
  /** Divisors applied after centring (all 1 unless standardised). */
  scale: Float64Array
  /** Principal axes as rows (k × d). */
  components: Matrix
  explainedVariance: Float64Array
  explainedVarianceRatio: Float64Array
}

export function fitPca(X: Matrix, opts: { k?: number; method?: 'jacobi' | 'power'; standardize?: boolean } = {}): PcaModel {
  const d = X.cols
  const k = Math.min(opts.k ?? d, d)
  const mean = columnMeans(X)
  const scale = opts.standardize ? columnStds(X, mean).map((s) => s || 1) : new Float64Array(d).fill(1)
  let Z = X
  if (opts.standardize) {
    Z = matrix(X.rows, d)
    for (let i = 0; i < X.rows; i++) for (let j = 0; j < d; j++) Z.data[i * d + j] = X.data[i * d + j] / scale[j]
  }
  const cov = covariance(Z)
  let total = 0
  for (let j = 0; j < d; j++) total += cov.data[j * d + j]
  const eig = (opts.method ?? 'jacobi') === 'power' ? powerIteration(cov, k) : jacobiEigen(cov)
  const components = matrix(k, d, eig.vectors.data.slice(0, k * d))
  const explainedVariance = eig.values.slice(0, k).map((v) => Math.max(0, v))
  return {
    mean,
    scale,
    components,
    explainedVariance,
    explainedVarianceRatio: explainedVariance.map((v) => (total > 0 ? v / total : 0)),
  }
}

/** Project rows onto the first `k` principal components. */
export function pcaTransform(model: PcaModel, X: Matrix, k = model.components.rows): Matrix {
  const d = X.cols
  const out = matrix(X.rows, k)
  const C = model.components
  for (let i = 0; i < X.rows; i++) {
    for (let c = 0; c < k; c++) {
      let s = 0
      for (let j = 0; j < d; j++) s += ((X.data[i * d + j] - model.mean[j]) / model.scale[j]) * C.data[c * d + j]
      out.data[i * k + c] = s
    }
  }
  return out
}
