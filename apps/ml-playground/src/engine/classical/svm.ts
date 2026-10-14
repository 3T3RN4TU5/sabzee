/**
 * Kernel support vector machine trained with Sequential Minimal Optimization
 * using LIBSVM's second-order working-set selection (Fan, Chen & Lin, 2005).
 *
 * Dual problem (labels yᵢ ∈ {−1, +1}, Qᵢⱼ = yᵢyⱼK(xᵢ, xⱼ)):
 *   min_α ½ αᵀQα − Σαᵢ   s.t.  0 ≤ αᵢ ≤ C,  Σ yᵢαᵢ = 0
 * Each iteration picks the most violating pair (i, j), solves the
 * two-variable sub-problem analytically and updates the gradient.
 * Multiclass uses one-vs-rest.
 */
import { sqDist, type Matrix } from '../linalg.ts'
import { softmaxRows, sigmoid } from '../tensor.ts'
import type { Classifier } from './types.ts'

export type KernelName = 'linear' | 'rbf' | 'poly'

export interface SvmOptions {
  C?: number
  kernel?: KernelName
  /** RBF width: K(a,b) = exp(−γ‖a−b‖²). */
  gamma?: number
  /** Polynomial kernel degree: K(a,b) = (a·b + 1)^degree. */
  degree?: number
  tol?: number
  maxIter?: number
}

export function kernelFn(opts: Required<SvmOptions>): (a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number, d: number) => number {
  switch (opts.kernel) {
    case 'rbf':
      return (a, ai, b, bi, d) => Math.exp(-opts.gamma * sqDist(a, ai, b, bi, d))
    case 'poly':
      return (a, ai, b, bi, d) => {
        let s = 0
        for (let k = 0; k < d; k++) s += a[ai + k] * b[bi + k]
        return (s + 1) ** opts.degree
      }
    default:
      return (a, ai, b, bi, d) => {
        let s = 0
        for (let k = 0; k < d; k++) s += a[ai + k] * b[bi + k]
        return s
      }
  }
}

const TAU = 1e-12

/** A trained binary SVM: f(x) = Σ αᵢyᵢK(xᵢ, x) − ρ. */
export interface BinarySvm {
  /** Indices of support vectors (αᵢ > 0) into the training set. */
  support: Int32Array
  /** αᵢyᵢ for each support vector. */
  coef: Float64Array
  rho: number
  iterations: number
}

/** Solve the dual for labels y ∈ {−1,+1} given a precomputed kernel matrix. */
export function smo(K: Float64Array, y: Float64Array, C: number, tol = 1e-3, maxIter = 100_000): BinarySvm {
  const n = y.length
  const alpha = new Float64Array(n)
  const G = new Float64Array(n).fill(-1) // ∇ = Qα − e
  const isUpper = (t: number) => alpha[t] >= C
  const isLower = (t: number) => alpha[t] <= 0
  let iter = 0
  for (; iter < maxIter; iter++) {
    // Select i: maximal violator in I_up.
    let Gmax = -Infinity
    let i = -1
    for (let t = 0; t < n; t++) {
      if (y[t] === 1) {
        if (!isUpper(t) && -G[t] >= Gmax) {
          Gmax = -G[t]
          i = t
        }
      } else if (!isLower(t) && G[t] >= Gmax) {
        Gmax = G[t]
        i = t
      }
    }
    if (i < 0) break
    // Select j by the largest guaranteed decrease of the objective.
    let Gmax2 = -Infinity
    let j = -1
    let objMin = Infinity
    const Kii = K[i * n + i]
    for (let t = 0; t < n; t++) {
      const Kit = K[i * n + t]
      const quadBase = Kii + K[t * n + t] - 2 * Kit
      if (y[t] === 1) {
        if (isLower(t)) continue
        const gradDiff = Gmax + G[t]
        if (G[t] >= Gmax2) Gmax2 = G[t]
        if (gradDiff > 0) {
          const quad = quadBase > 0 ? quadBase : TAU
          const obj = -(gradDiff * gradDiff) / quad
          if (obj <= objMin) {
            j = t
            objMin = obj
          }
        }
      } else {
        if (isUpper(t)) continue
        const gradDiff = Gmax - G[t]
        if (-G[t] >= Gmax2) Gmax2 = -G[t]
        if (gradDiff > 0) {
          const quad = quadBase > 0 ? quadBase : TAU
          const obj = -(gradDiff * gradDiff) / quad
          if (obj <= objMin) {
            j = t
            objMin = obj
          }
        }
      }
    }
    if (Gmax + Gmax2 < tol || j < 0) break

    // Analytic two-variable update (LIBSVM Solver::Solve).
    const Qij = y[i] * y[j] * K[i * n + j]
    const oldAi = alpha[i]
    const oldAj = alpha[j]
    if (y[i] !== y[j]) {
      let quad = K[i * n + i] + K[j * n + j] + 2 * Qij
      if (quad <= 0) quad = TAU
      const delta = (-G[i] - G[j]) / quad
      const diff = alpha[i] - alpha[j]
      alpha[i] += delta
      alpha[j] += delta
      if (diff > 0) {
        if (alpha[j] < 0) {
          alpha[j] = 0
          alpha[i] = diff
        }
      } else if (alpha[i] < 0) {
        alpha[i] = 0
        alpha[j] = -diff
      }
      if (diff > 0) {
        if (alpha[i] > C) {
          alpha[i] = C
          alpha[j] = C - diff
        }
      } else if (alpha[j] > C) {
        alpha[j] = C
        alpha[i] = C + diff
      }
    } else {
      let quad = K[i * n + i] + K[j * n + j] - 2 * Qij
      if (quad <= 0) quad = TAU
      const delta = (G[i] - G[j]) / quad
      const sum = alpha[i] + alpha[j]
      alpha[i] -= delta
      alpha[j] += delta
      if (sum > C) {
        if (alpha[i] > C) {
          alpha[i] = C
          alpha[j] = sum - C
        }
      } else if (alpha[j] < 0) {
        alpha[j] = 0
        alpha[i] = sum
      }
      if (sum > C) {
        if (alpha[j] > C) {
          alpha[j] = C
          alpha[i] = sum - C
        }
      } else if (alpha[i] < 0) {
        alpha[i] = 0
        alpha[j] = sum
      }
    }
    const dAi = alpha[i] - oldAi
    const dAj = alpha[j] - oldAj
    for (let t = 0; t < n; t++) {
      G[t] += y[t] * (y[i] * K[i * n + t] * dAi + y[j] * K[j * n + t] * dAj)
    }
  }

  // ρ: average of yᵢGᵢ over free support vectors (or midpoint of the bounds).
  let ub = Infinity
  let lb = -Infinity
  let nFree = 0
  let sumFree = 0
  for (let t = 0; t < n; t++) {
    const yG = y[t] * G[t]
    if (isUpper(t)) {
      if (y[t] === -1) ub = Math.min(ub, yG)
      else lb = Math.max(lb, yG)
    } else if (isLower(t)) {
      if (y[t] === 1) ub = Math.min(ub, yG)
      else lb = Math.max(lb, yG)
    } else {
      nFree++
      sumFree += yG
    }
  }
  const rho = nFree > 0 ? sumFree / nFree : (ub + lb) / 2
  const support: number[] = []
  const coef: number[] = []
  for (let t = 0; t < n; t++) {
    if (alpha[t] > 1e-10) {
      support.push(t)
      coef.push(alpha[t] * y[t])
    }
  }
  return { support: Int32Array.from(support), coef: Float64Array.from(coef), rho, iterations: iter }
}

export class SVM implements Classifier {
  numClasses = 2
  readonly opts: Required<SvmOptions>
  models: BinarySvm[] = []
  private X: Matrix | null = null
  private kernel: ReturnType<typeof kernelFn>

  constructor(opts: SvmOptions = {}) {
    this.opts = { C: 1, kernel: 'rbf', gamma: 2, degree: 3, tol: 1e-3, maxIter: 200_000, ...opts }
    this.kernel = kernelFn(this.opts)
  }

  fit(X: Matrix, y: Int32Array, numClasses: number): void {
    this.numClasses = numClasses
    this.X = X
    const n = X.rows
    const d = X.cols
    const K = new Float64Array(n * n)
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const v = this.kernel(X.data, i * d, X.data, j * d, d)
        K[i * n + j] = v
        K[j * n + i] = v
      }
    }
    // Binary: one machine for class 1 vs 0. Multiclass: one-vs-rest.
    const targets = numClasses === 2 ? [1] : Array.from({ length: numClasses }, (_, c) => c)
    this.models = targets.map((c) => {
      const yy = Float64Array.from(y, (v) => (v === c ? 1 : -1))
      return smo(K, yy, this.opts.C, this.opts.tol, this.opts.maxIter)
    })
  }

  /** Signed distances f(x); [n] for binary, [n×K] one-vs-rest for multiclass. */
  decisionFunction(Q: Matrix): Float64Array {
    const X = this.X!
    const d = X.cols
    const m = this.models.length
    const out = new Float64Array(Q.rows * m)
    for (let i = 0; i < Q.rows; i++) {
      for (let c = 0; c < m; c++) {
        const model = this.models[c]
        let s = -model.rho
        for (let t = 0; t < model.support.length; t++) s += model.coef[t] * this.kernel(X.data, model.support[t] * d, Q.data, i * d, d)
        out[i * m + c] = s
      }
    }
    return out
  }

  /** Union of support-vector indices across the one-vs-rest machines. */
  supportVectors(): number[] {
    const s = new Set<number>()
    for (const m of this.models) for (const i of m.support) s.add(i)
    return [...s].sort((a, b) => a - b)
  }

  /** Squashed decision values (not calibrated probabilities). */
  predictProba(Q: Matrix): Float64Array {
    const f = this.decisionFunction(Q)
    const k = this.numClasses
    if (k === 2) {
      const p = new Float64Array(Q.rows * 2)
      for (let i = 0; i < Q.rows; i++) {
        const s = sigmoid(2 * f[i])
        p[i * 2] = 1 - s
        p[i * 2 + 1] = s
      }
      return p
    }
    const p = new Float64Array(f.length)
    const scaled = f.map((v) => 3 * v)
    softmaxRows(scaled, p, Q.rows, k)
    return p
  }
}
