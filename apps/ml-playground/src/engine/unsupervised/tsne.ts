/**
 * Exact t-SNE (van der Maaten & Hinton, 2008), O(n²) per iteration — fine
 * for a few hundred points. High-dimensional affinities use Gaussian kernels
 * whose bandwidths are binary-searched to match a target perplexity; the
 * embedding uses a Student-t kernel and gradient descent with momentum,
 * per-parameter gains and early exaggeration.
 */
import { sqDist, type Matrix } from '../linalg.ts'
import { randn, seededRng } from '../rng.ts'

export interface TsneOptions {
  perplexity?: number
  learningRate?: number
  seed?: number
  exaggerationIters?: number
}

export class TSNE {
  readonly n: number
  /** Embedding, n × 2 row-major. */
  readonly Y: Float64Array
  iteration = 0
  /** Kullback–Leibler divergence after the last step. */
  kl = 0
  private readonly P: Float64Array
  private readonly gains: Float64Array
  private readonly velocity: Float64Array
  private readonly opts: Required<TsneOptions>

  constructor(X: Matrix, opts: TsneOptions = {}) {
    this.opts = { perplexity: 30, learningRate: Math.max(X.rows / 48, 50), seed: 3, exaggerationIters: 100, ...opts }
    this.n = X.rows
    this.P = jointProbabilities(X, this.opts.perplexity)
    const rng = seededRng(this.opts.seed)
    this.Y = new Float64Array(this.n * 2)
    for (let i = 0; i < this.Y.length; i++) this.Y[i] = randn(rng) * 1e-4
    this.gains = new Float64Array(this.n * 2).fill(1)
    this.velocity = new Float64Array(this.n * 2)
  }

  /** One gradient step; returns the KL divergence. */
  step(): number {
    const n = this.n
    const Y = this.Y
    const exaggeration = this.iteration < this.opts.exaggerationIters ? 12 : 1
    const momentum = this.iteration < 250 ? 0.5 : 0.8
    // Student-t affinities q_ij ∝ (1 + ‖yᵢ − yⱼ‖²)⁻¹.
    const num = new Float64Array(n * n)
    let sumQ = 0
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = Y[i * 2] - Y[j * 2]
        const dy = Y[i * 2 + 1] - Y[j * 2 + 1]
        const q = 1 / (1 + dx * dx + dy * dy)
        num[i * n + j] = q
        num[j * n + i] = q
        sumQ += 2 * q
      }
    }
    // ∂C/∂yᵢ = 4 Σⱼ (p_ij − q_ij)(yᵢ − yⱼ)(1 + ‖yᵢ − yⱼ‖²)⁻¹
    let kl = 0
    const grad = new Float64Array(n * 2)
    for (let i = 0; i < n; i++) {
      let gx = 0
      let gy = 0
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const w = num[i * n + j]
        const q = Math.max(w / sumQ, 1e-12)
        const p = this.P[i * n + j]
        if (p > 1e-12) kl += p * Math.log(p / q)
        const m = (exaggeration * p - q) * w
        gx += m * (Y[i * 2] - Y[j * 2])
        gy += m * (Y[i * 2 + 1] - Y[j * 2 + 1])
      }
      grad[i * 2] = 4 * gx
      grad[i * 2 + 1] = 4 * gy
    }
    for (let k = 0; k < Y.length; k++) {
      const sameSign = Math.sign(grad[k]) === Math.sign(this.velocity[k])
      this.gains[k] = Math.max(0.01, sameSign ? this.gains[k] * 0.8 : this.gains[k] + 0.2)
      this.velocity[k] = momentum * this.velocity[k] - this.opts.learningRate * this.gains[k] * grad[k]
      Y[k] += this.velocity[k]
    }
    // Re-centre.
    let mx = 0
    let my = 0
    for (let i = 0; i < n; i++) {
      mx += Y[i * 2]
      my += Y[i * 2 + 1]
    }
    for (let i = 0; i < n; i++) {
      Y[i * 2] -= mx / n
      Y[i * 2 + 1] -= my / n
    }
    this.iteration++
    this.kl = kl
    return kl
  }
}

/**
 * Symmetrised input affinities p_ij = (p_j|i + p_i|j) / 2n, where each
 * conditional p_j|i uses a Gaussian whose precision β is found by bisection
 * so that the entropy H(Pᵢ) = log(perplexity).
 */
export function jointProbabilities(X: Matrix, perplexity: number): Float64Array {
  const n = X.rows
  const d = X.cols
  const D = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = sqDist(X.data, i * d, X.data, j * d, d)
      D[i * n + j] = v
      D[j * n + i] = v
    }
  }
  const P = new Float64Array(n * n)
  const target = Math.log(Math.min(perplexity, (n - 1) / 3))
  const row = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let beta = 1
    let lo = -Infinity
    let hi = Infinity
    for (let it = 0; it < 64; it++) {
      let sum = 0
      let dsum = 0
      for (let j = 0; j < n; j++) {
        row[j] = j === i ? 0 : Math.exp(-D[i * n + j] * beta)
        sum += row[j]
        dsum += D[i * n + j] * row[j]
      }
      sum = Math.max(sum, 1e-300)
      const H = Math.log(sum) + (beta * dsum) / sum
      const diff = H - target
      if (Math.abs(diff) < 1e-5) break
      if (diff > 0) {
        lo = beta
        beta = hi === Infinity ? beta * 2 : (beta + hi) / 2
      } else {
        hi = beta
        beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2
      }
    }
    let sum = 0
    for (let j = 0; j < n; j++) sum += row[j]
    for (let j = 0; j < n; j++) P[i * n + j] = row[j] / (sum || 1)
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = Math.max((P[i * n + j] + P[j * n + i]) / (2 * n), 1e-12)
      P[i * n + j] = v
      P[j * n + i] = v
    }
    P[i * n + i] = 0
  }
  return P
}
