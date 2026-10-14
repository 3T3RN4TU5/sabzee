/**
 * Gaussian naive Bayes: each feature is modelled as an independent normal
 * distribution per class. Prediction maximises
 *   log P(c) + Σⱼ log N(xⱼ | μ_cj, σ²_cj)
 * Variances get `varSmoothing · max feature variance` added for stability
 * (the same convention as scikit-learn).
 */
import type { Matrix } from '../linalg.ts'
import type { Classifier } from './types.ts'

export class GaussianNB implements Classifier {
  numClasses = 2
  theta = new Float64Array(0)
  variance = new Float64Array(0)
  logPrior = new Float64Array(0)
  readonly varSmoothing: number

  constructor(varSmoothing = 1e-9) {
    this.varSmoothing = varSmoothing
  }

  fit(X: Matrix, y: Int32Array, numClasses: number): void {
    const k = numClasses
    const d = X.cols
    this.numClasses = k
    const counts = new Float64Array(k)
    const mu = new Float64Array(k * d)
    const v = new Float64Array(k * d)
    for (let i = 0; i < X.rows; i++) {
      counts[y[i]]++
      for (let j = 0; j < d; j++) mu[y[i] * d + j] += X.data[i * d + j]
    }
    for (let c = 0; c < k; c++) for (let j = 0; j < d; j++) mu[c * d + j] /= counts[c] || 1
    for (let i = 0; i < X.rows; i++) {
      for (let j = 0; j < d; j++) v[y[i] * d + j] += (X.data[i * d + j] - mu[y[i] * d + j]) ** 2
    }
    for (let c = 0; c < k; c++) for (let j = 0; j < d; j++) v[c * d + j] /= counts[c] || 1
    // Global feature variances define the smoothing epsilon.
    let maxVar = 0
    for (let j = 0; j < d; j++) {
      let m = 0
      for (let i = 0; i < X.rows; i++) m += X.data[i * d + j]
      m /= X.rows
      let s = 0
      for (let i = 0; i < X.rows; i++) s += (X.data[i * d + j] - m) ** 2
      maxVar = Math.max(maxVar, s / X.rows)
    }
    const eps = this.varSmoothing * maxVar
    for (let i = 0; i < v.length; i++) v[i] += eps
    this.theta = mu
    this.variance = v
    this.logPrior = counts.map((c) => Math.log(c / X.rows))
  }

  jointLogLikelihood(X: Matrix): Float64Array {
    const k = this.numClasses
    const d = X.cols
    const out = new Float64Array(X.rows * k)
    for (let i = 0; i < X.rows; i++) {
      for (let c = 0; c < k; c++) {
        let s = this.logPrior[c]
        for (let j = 0; j < d; j++) {
          const varcj = this.variance[c * d + j]
          s -= 0.5 * Math.log(2 * Math.PI * varcj) + (X.data[i * d + j] - this.theta[c * d + j]) ** 2 / (2 * varcj)
        }
        out[i * k + c] = s
      }
    }
    return out
  }

  predictProba(X: Matrix): Float64Array {
    const k = this.numClasses
    const jll = this.jointLogLikelihood(X)
    for (let i = 0; i < X.rows; i++) {
      let max = -Infinity
      for (let c = 0; c < k; c++) max = Math.max(max, jll[i * k + c])
      let s = 0
      for (let c = 0; c < k; c++) {
        jll[i * k + c] = Math.exp(jll[i * k + c] - max)
        s += jll[i * k + c]
      }
      for (let c = 0; c < k; c++) jll[i * k + c] /= s
    }
    return jll
  }
}
