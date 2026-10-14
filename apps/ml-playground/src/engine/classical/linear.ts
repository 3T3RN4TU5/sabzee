/**
 * Linear models: least-squares / ridge regression (closed form via Cholesky
 * or Householder QR, and gradient descent through the autograd engine),
 * polynomial features, and logistic / softmax regression (Newton–IRLS or
 * gradient descent).
 */
import { cholesky, choleskySolve, columnMeans, gram, matrix, qrSolve, type Matrix } from '../linalg.ts'
import { Adam, SGD, type Optimizer } from '../optim.ts'
import { bceWithLogits, crossEntropy, softmaxRows, sigmoid, Tensor } from '../tensor.ts'
import type { Classifier } from './types.ts'

export interface LinearModel {
  weights: Float64Array
  bias: number
}

export function predictLinear(model: LinearModel, X: Matrix): Float64Array {
  const out = new Float64Array(X.rows)
  for (let i = 0; i < X.rows; i++) {
    let s = model.bias
    for (let j = 0; j < X.cols; j++) s += X.data[i * X.cols + j] * model.weights[j]
    out[i] = s
  }
  return out
}

/**
 * Closed-form (ridge) least squares with an unpenalised intercept.
 * Centering X and y removes the intercept from the system:
 *   (X̃ᵀX̃ + αI) w = X̃ᵀỹ,   b = ȳ − x̄ᵀw
 *  - 'cholesky' solves those normal equations directly.
 *  - 'qr' solves the equivalent augmented least-squares problem
 *    [X̃; √α I] w ≈ [ỹ; 0] with Householder QR (better conditioned).
 */
export function fitLinearRegression(X: Matrix, y: ArrayLike<number>, opts: { alpha?: number; method?: 'cholesky' | 'qr' } = {}): LinearModel {
  const alpha = opts.alpha ?? 0
  const n = X.rows
  const d = X.cols
  const mu = columnMeans(X)
  let ybar = 0
  for (let i = 0; i < n; i++) ybar += y[i]
  ybar /= n
  const Xc = matrix(n, d)
  const yc = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) Xc.data[i * d + j] = X.data[i * d + j] - mu[j]
    yc[i] = y[i] - ybar
  }
  let w: Float64Array
  if ((opts.method ?? 'cholesky') === 'qr') {
    const rows = alpha > 0 ? n + d : n
    const A = matrix(rows, d)
    A.data.set(Xc.data)
    const b = new Float64Array(rows)
    b.set(yc)
    if (alpha > 0) for (let j = 0; j < d; j++) A.data[(n + j) * d + j] = Math.sqrt(alpha)
    w = qrSolve(A, b)
  } else {
    const G = gram(Xc)
    for (let j = 0; j < d; j++) G.data[j * d + j] += alpha + 1e-12
    const rhs = new Float64Array(d)
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) rhs[j] += Xc.data[i * d + j] * yc[i]
    w = choleskySolve(cholesky(G), rhs)
  }
  let bias = ybar
  for (let j = 0; j < d; j++) bias -= mu[j] * w[j]
  return { weights: w, bias }
}

/**
 * The same model trained by full-batch gradient descent on the MSE, using
 * the autograd engine for the gradient — a sanity check that GD converges
 * to the closed-form optimum.
 */
export function fitLinearRegressionGD(X: Matrix, y: ArrayLike<number>, opts: { lr?: number; epochs?: number; alpha?: number } = {}): LinearModel {
  const { lr = 0.1, epochs = 2000, alpha = 0 } = opts
  const Xt = new Tensor(X.data, [X.rows, X.cols])
  const yt = new Tensor(Float64Array.from(y), [X.rows, 1])
  const W = Tensor.zeros([X.cols, 1], true)
  const b = Tensor.zeros([1], true)
  const opt = new SGD([W, b], { lr })
  for (let e = 0; e < epochs; e++) {
    opt.zeroGrad()
    // ½·mean squared error + (α / 2n)‖w‖² has the same minimiser as ridge.
    let loss = Xt.matmul(W).add(b).sub(yt).square().mean().mul(0.5)
    if (alpha > 0) loss = loss.add(W.square().sum().mul(alpha / (2 * X.rows)))
    loss.backward()
    opt.step()
  }
  return { weights: W.data.slice(), bias: b.data[0] }
}

// ─── Polynomial features ───────────────────────────────────────────────────

/** Exponent tuples of all monomials of total degree 1…degree in d variables. */
export function monomials(d: number, degree: number): number[][] {
  const out: number[][] = []
  const cur = new Array<number>(d).fill(0)
  const rec = (pos: number, remaining: number) => {
    if (pos === d) {
      const total = cur.reduce((s, v) => s + v, 0)
      if (total > 0) out.push([...cur])
      return
    }
    for (let p = 0; p <= remaining; p++) {
      cur[pos] = p
      rec(pos + 1, remaining - p)
    }
    cur[pos] = 0
  }
  rec(0, degree)
  return out.sort((a, b) => a.reduce((s, v) => s + v, 0) - b.reduce((s, v) => s + v, 0))
}

export function polynomialFeatures(X: Matrix, degree: number): Matrix {
  if (degree <= 1) return X
  const terms = monomials(X.cols, degree)
  const out = matrix(X.rows, terms.length)
  for (let i = 0; i < X.rows; i++) {
    for (let t = 0; t < terms.length; t++) {
      let v = 1
      for (let j = 0; j < X.cols; j++) if (terms[t][j]) v *= X.data[i * X.cols + j] ** terms[t][j]
      out.data[i * terms.length + t] = v
    }
  }
  return out
}

/** Vandermonde-style 1-D features [x, x², …, x^degree]. */
export function powers1D(x: ArrayLike<number>, degree: number): Matrix {
  const out = matrix(x.length, degree)
  for (let i = 0; i < x.length; i++) {
    let v = 1
    for (let p = 0; p < degree; p++) {
      v *= x[i]
      out.data[i * degree + p] = v
    }
  }
  return out
}

/** Polynomial ridge regression on 1-D inputs (QR keeps high degrees stable). */
export function fitPolynomial1D(x: ArrayLike<number>, y: ArrayLike<number>, degree: number, alpha: number): LinearModel {
  if (degree === 0) {
    let m = 0
    for (let i = 0; i < y.length; i++) m += y[i]
    return { weights: new Float64Array(0), bias: m / y.length }
  }
  return fitLinearRegression(powers1D(x, degree), y, { alpha, method: 'qr' })
}

export function predictPolynomial1D(model: LinearModel, x: ArrayLike<number>): Float64Array {
  return predictLinear(model, powers1D(x, model.weights.length))
}

// ─── Logistic regression ───────────────────────────────────────────────────

export interface LogisticOptions {
  /** Polynomial feature degree (1 = linear decision boundary). */
  degree?: number
  /** L2 penalty λ on the weights (loss = mean NLL + λ/2 ‖w‖²). */
  l2?: number
  solver?: 'newton' | 'gd'
  /** Gradient-descent iterations / learning rate. */
  iters?: number
  lr?: number
}

export class LogisticRegression implements Classifier {
  numClasses = 2
  /** Weights [features × classes] (binary: a single column). */
  weights = new Float64Array(0)
  bias = new Float64Array(0)
  readonly opts: Required<LogisticOptions>
  iterations = 0

  constructor(opts: LogisticOptions = {}) {
    this.opts = { degree: 1, l2: 1e-3, solver: 'newton', iters: 500, lr: 0.5, ...opts }
  }

  private features(X: Matrix): Matrix {
    return polynomialFeatures(X, this.opts.degree)
  }

  fit(Xraw: Matrix, y: Int32Array, numClasses: number): void {
    this.numClasses = numClasses
    const X = this.features(Xraw)
    if (numClasses === 2 && this.opts.solver === 'newton') this.fitNewton(X, y)
    else this.fitGD(X, y)
  }

  /**
   * Newton–Raphson / IRLS for the binary case. With p = σ(Xw):
   *   gradient g = Xᵀ(p − y)/n + λw,   Hessian H = XᵀSX/n + λI,  S = diag(p(1−p))
   *   w ← w − H⁻¹g   (solved with Cholesky). Converges in a handful of steps.
   */
  private fitNewton(X: Matrix, y: Int32Array): void {
    const n = X.rows
    const d = X.cols + 1 // last coordinate is the intercept
    const w = new Float64Array(d)
    const lambda = this.opts.l2
    const xi = new Float64Array(d)
    for (let it = 0; it < 100; it++) {
      const H = matrix(d, d)
      const g = new Float64Array(d)
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < d - 1; j++) xi[j] = X.data[i * X.cols + j]
        xi[d - 1] = 1
        let z = 0
        for (let j = 0; j < d; j++) z += xi[j] * w[j]
        const p = sigmoid(z)
        const s = Math.max(p * (1 - p), 1e-12)
        for (let a = 0; a < d; a++) {
          g[a] += (xi[a] * (p - y[i])) / n
          const sa = (s * xi[a]) / n
          for (let b = a; b < d; b++) H.data[a * d + b] += sa * xi[b]
        }
      }
      for (let a = 0; a < d; a++) for (let b = 0; b < a; b++) H.data[a * d + b] = H.data[b * d + a]
      for (let j = 0; j < d - 1; j++) {
        g[j] += lambda * w[j]
        H.data[j * d + j] += lambda
      }
      H.data[(d - 1) * d + (d - 1)] += 1e-10
      const step = choleskySolve(cholesky(H), g)
      let maxStep = 0
      for (let j = 0; j < d; j++) {
        w[j] -= step[j]
        maxStep = Math.max(maxStep, Math.abs(step[j]))
      }
      this.iterations = it + 1
      if (maxStep < 1e-10) break
    }
    this.weights = w.slice(0, d - 1)
    this.bias = Float64Array.of(w[d - 1])
  }

  /**
   * Gradient descent through the autograd engine: binary uses the logistic
   * (BCE) loss on one logit; K > 2 classes use softmax cross-entropy (Adam).
   */
  private fitGD(X: Matrix, y: Int32Array): void {
    const k = this.numClasses
    const out = k === 2 ? 1 : k
    const Xt = new Tensor(X.data, [X.rows, X.cols])
    const W = Tensor.zeros([X.cols, out], true)
    const b = Tensor.zeros([out], true)
    const opt: Optimizer = k === 2 ? new SGD([W, b], { lr: this.opts.lr }) : new Adam([W, b], { lr: 0.05 })
    for (let it = 0; it < this.opts.iters; it++) {
      opt.zeroGrad()
      const logits = Xt.matmul(W).add(b)
      let loss = k === 2 ? bceWithLogits(logits, y) : crossEntropy(logits, y)
      if (this.opts.l2 > 0) loss = loss.add(W.square().sum().mul(this.opts.l2 / 2))
      loss.backward()
      opt.step()
    }
    this.iterations = this.opts.iters
    this.weights = W.data.slice()
    this.bias = b.data.slice()
  }

  /** Raw scores: [n] logits for binary, [n×K] for multiclass. */
  decisionFunction(Xraw: Matrix): Float64Array {
    const X = this.features(Xraw)
    const out = this.numClasses === 2 ? 1 : this.numClasses
    const z = new Float64Array(X.rows * out)
    for (let i = 0; i < X.rows; i++) {
      for (let c = 0; c < out; c++) {
        let s = this.bias[c]
        for (let j = 0; j < X.cols; j++) s += X.data[i * X.cols + j] * this.weights[j * out + c]
        z[i * out + c] = s
      }
    }
    return z
  }

  predictProba(X: Matrix): Float64Array {
    const z = this.decisionFunction(X)
    const k = this.numClasses
    if (k === 2) {
      const p = new Float64Array(X.rows * 2)
      for (let i = 0; i < X.rows; i++) {
        const s = sigmoid(z[i])
        p[i * 2] = 1 - s
        p[i * 2 + 1] = s
      }
      return p
    }
    const p = new Float64Array(z.length)
    softmaxRows(z, p, X.rows, k)
    return p
  }
}
