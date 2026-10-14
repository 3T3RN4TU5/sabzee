/**
 * Dense linear algebra on row-major Float64Array matrices: products,
 * Cholesky and Householder-QR solvers, symmetric eigendecomposition (cyclic
 * Jacobi) and power iteration with deflation.
 */
import { randn, seededRng } from './rng.ts'

export interface Matrix {
  rows: number
  cols: number
  data: Float64Array
}

export function matrix(rows: number, cols: number, data?: Float64Array): Matrix {
  return { rows, cols, data: data ?? new Float64Array(rows * cols) }
}

export function fromRows(rows: readonly (readonly number[])[]): Matrix {
  const n = rows.length
  const m = n ? rows[0].length : 0
  const out = matrix(n, m)
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) out.data[i * m + j] = rows[i][j]
  return out
}

export function toRows(a: Matrix): number[][] {
  const out: number[][] = []
  for (let i = 0; i < a.rows; i++) out.push(Array.from(a.data.subarray(i * a.cols, (i + 1) * a.cols)))
  return out
}

export function identity(n: number): Matrix {
  const out = matrix(n, n)
  for (let i = 0; i < n; i++) out.data[i * n + i] = 1
  return out
}

export function get(a: Matrix, i: number, j: number): number {
  return a.data[i * a.cols + j]
}

export function row(a: Matrix, i: number): Float64Array {
  return a.data.subarray(i * a.cols, (i + 1) * a.cols)
}

export function transpose(a: Matrix): Matrix {
  const out = matrix(a.cols, a.rows)
  for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.cols; j++) out.data[j * a.rows + i] = a.data[i * a.cols + j]
  return out
}

export function matmul(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) throw new Error('matmul: inner dimensions differ')
  const out = matrix(a.rows, b.cols)
  const n = a.rows
  const k = a.cols
  const m = b.cols
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const av = a.data[i * k + p]
      if (av === 0) continue
      for (let j = 0; j < m; j++) out.data[i * m + j] += av * b.data[p * m + j]
    }
  }
  return out
}

export function matvec(a: Matrix, x: ArrayLike<number>): Float64Array {
  const out = new Float64Array(a.rows)
  for (let i = 0; i < a.rows; i++) {
    let s = 0
    for (let j = 0; j < a.cols; j++) s += a.data[i * a.cols + j] * x[j]
    out[i] = s
  }
  return out
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function norm(a: ArrayLike<number>): number {
  return Math.sqrt(dot(a, a))
}

/** Gram matrix AᵀA. */
export function gram(a: Matrix): Matrix {
  const m = a.cols
  const out = matrix(m, m)
  for (let r = 0; r < a.rows; r++) {
    const o = r * m
    for (let i = 0; i < m; i++) {
      const v = a.data[o + i]
      if (v === 0) continue
      for (let j = i; j < m; j++) out.data[i * m + j] += v * a.data[o + j]
    }
  }
  for (let i = 0; i < m; i++) for (let j = 0; j < i; j++) out.data[i * m + j] = out.data[j * m + i]
  return out
}

// ─── Cholesky ───────────────────────────────────────────────────────────────

/** Lower-triangular L with A = L Lᵀ for symmetric positive-definite A. */
export function cholesky(a: Matrix): Matrix {
  const n = a.rows
  const L = matrix(n, n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a.data[i * n + j]
      for (let k = 0; k < j; k++) s -= L.data[i * n + k] * L.data[j * n + k]
      if (i === j) {
        if (s <= 0) throw new Error('cholesky: matrix is not positive definite')
        L.data[i * n + i] = Math.sqrt(s)
      } else {
        L.data[i * n + j] = s / L.data[j * n + j]
      }
    }
  }
  return L
}

/** Solve A x = b given A's Cholesky factor (forward then back substitution). */
export function choleskySolve(L: Matrix, b: ArrayLike<number>): Float64Array {
  const n = L.rows
  const y = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= L.data[i * n + k] * y[k]
    y[i] = s / L.data[i * n + i]
  }
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let k = i + 1; k < n; k++) s -= L.data[k * n + i] * x[k]
    x[i] = s / L.data[i * n + i]
  }
  return x
}

// ─── Householder QR ────────────────────────────────────────────────────────

/**
 * Least-squares solution of A x ≈ b via Householder QR (A is n×m, n ≥ m).
 * Numerically safer than the normal equations because it never forms AᵀA,
 * whose condition number is the square of A's.
 */
export function qrSolve(a: Matrix, b: ArrayLike<number>): Float64Array {
  const n = a.rows
  const m = a.cols
  if (n < m) throw new Error('qrSolve: need at least as many rows as columns')
  const R = Float64Array.from(a.data)
  const y = Float64Array.from(b)
  const v = new Float64Array(n)
  for (let k = 0; k < m; k++) {
    // Householder vector that zeroes R[k+1:, k].
    let alpha = 0
    for (let i = k; i < n; i++) alpha += R[i * m + k] ** 2
    alpha = Math.sqrt(alpha)
    if (alpha === 0) continue
    if (R[k * m + k] > 0) alpha = -alpha
    let vnorm = 0
    for (let i = k; i < n; i++) {
      v[i] = R[i * m + k] - (i === k ? alpha : 0)
      vnorm += v[i] * v[i]
    }
    if (vnorm === 0) continue
    // Apply H = I − 2vvᵀ/(vᵀv) to the remaining columns and to y.
    for (let j = k; j < m; j++) {
      let s = 0
      for (let i = k; i < n; i++) s += v[i] * R[i * m + j]
      s = (2 * s) / vnorm
      for (let i = k; i < n; i++) R[i * m + j] -= s * v[i]
    }
    let s = 0
    for (let i = k; i < n; i++) s += v[i] * y[i]
    s = (2 * s) / vnorm
    for (let i = k; i < n; i++) y[i] -= s * v[i]
  }
  // Back-substitute R x = Qᵀb (upper m×m block).
  const x = new Float64Array(m)
  for (let i = m - 1; i >= 0; i--) {
    let s = y[i]
    for (let j = i + 1; j < m; j++) s -= R[i * m + j] * x[j]
    const d = R[i * m + i]
    x[i] = Math.abs(d) < 1e-14 ? 0 : s / d
  }
  return x
}

// ─── Eigendecomposition ────────────────────────────────────────────────────

export interface Eigen {
  /** Eigenvalues, sorted descending. */
  values: Float64Array
  /** Eigenvectors as rows, matching `values`. */
  vectors: Matrix
}

/**
 * Cyclic Jacobi eigenvalue algorithm for a symmetric matrix: repeatedly
 * applies plane rotations that zero one off-diagonal element at a time until
 * the matrix is diagonal. Accumulating the rotations gives the eigenvectors.
 */
export function jacobiEigen(a: Matrix, maxSweeps = 100, tol = 1e-12): Eigen {
  const n = a.rows
  const A = Float64Array.from(a.data)
  const V = identity(n).data
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] ** 2
    if (Math.sqrt(off) < tol) break
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q]
        if (Math.abs(apq) < 1e-300) continue
        const app = A[p * n + p]
        const aqq = A[q * n + q]
        const theta = (aqq - app) / (2 * apq)
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + p]
          const akq = A[k * n + q]
          A[k * n + p] = c * akp - s * akq
          A[k * n + q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p * n + k]
          const aqk = A[q * n + k]
          A[p * n + k] = c * apk - s * aqk
          A[q * n + k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + p]
          const vkq = V[k * n + q]
          V[k * n + p] = c * vkp - s * vkq
          V[k * n + q] = s * vkp + c * vkq
        }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => A[j * n + j] - A[i * n + i])
  const values = new Float64Array(n)
  const vectors = matrix(n, n)
  order.forEach((col, r) => {
    values[r] = A[col * n + col]
    for (let k = 0; k < n; k++) vectors.data[r * n + k] = V[k * n + col]
    canonicalSign(vectors.data.subarray(r * n, (r + 1) * n))
  })
  return { values, vectors }
}

/**
 * Top-k eigenpairs of a symmetric positive semi-definite matrix by power
 * iteration, deflating A ← A − λvvᵀ after each one is found.
 */
export function powerIteration(a: Matrix, k: number, iters = 1000, tol = 1e-12, seed = 7): Eigen {
  const n = a.rows
  const A = Float64Array.from(a.data)
  const rng = seededRng(seed)
  const values = new Float64Array(k)
  const vectors = matrix(k, n)
  for (let e = 0; e < k; e++) {
    let v = new Float64Array(n)
    for (let i = 0; i < n; i++) v[i] = randn(rng)
    let lambda = 0
    for (let it = 0; it < iters; it++) {
      const w = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        let s = 0
        for (let j = 0; j < n; j++) s += A[i * n + j] * v[j]
        w[i] = s
      }
      const nw = norm(w)
      if (nw === 0) break
      for (let i = 0; i < n; i++) w[i] /= nw
      const delta = Math.abs(nw - lambda)
      lambda = nw
      v = w
      if (delta < tol * Math.max(1, lambda)) break
    }
    canonicalSign(v)
    values[e] = lambda
    vectors.data.set(v, e * n)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i * n + j] -= lambda * v[i] * v[j]
  }
  return { values, vectors }
}

/** Flip a vector so its largest-magnitude entry is positive (deterministic signs). */
export function canonicalSign(v: Float64Array): void {
  let best = 0
  for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[best])) best = i
  if (v[best] < 0) for (let i = 0; i < v.length; i++) v[i] = -v[i]
}

// ─── Statistics ────────────────────────────────────────────────────────────

export function columnMeans(a: Matrix): Float64Array {
  const mu = new Float64Array(a.cols)
  for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.cols; j++) mu[j] += a.data[i * a.cols + j]
  for (let j = 0; j < a.cols; j++) mu[j] /= a.rows || 1
  return mu
}

export function columnStds(a: Matrix, mu = columnMeans(a)): Float64Array {
  const sd = new Float64Array(a.cols)
  for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.cols; j++) sd[j] += (a.data[i * a.cols + j] - mu[j]) ** 2
  for (let j = 0; j < a.cols; j++) sd[j] = Math.sqrt(sd[j] / Math.max(1, a.rows - 1))
  return sd
}

/** Sample covariance (n − 1 denominator) of the columns. */
export function covariance(a: Matrix): Matrix {
  const mu = columnMeans(a)
  const c = matrix(a.rows, a.cols)
  for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.cols; j++) c.data[i * a.cols + j] = a.data[i * a.cols + j] - mu[j]
  const g = gram(c)
  for (let i = 0; i < g.data.length; i++) g.data[i] /= Math.max(1, a.rows - 1)
  return g
}

/** z-score each column; returns the transformed copy and the statistics. */
export function standardize(a: Matrix): { X: Matrix; mean: Float64Array; std: Float64Array } {
  const mean = columnMeans(a)
  const std = columnStds(a, mean)
  const X = matrix(a.rows, a.cols)
  for (let i = 0; i < a.rows; i++) {
    for (let j = 0; j < a.cols; j++) X.data[i * a.cols + j] = (a.data[i * a.cols + j] - mean[j]) / (std[j] || 1)
  }
  return { X, mean, std }
}

/** Select rows by index. */
export function takeRows(a: Matrix, idx: ArrayLike<number>): Matrix {
  const out = matrix(idx.length, a.cols)
  for (let r = 0; r < idx.length; r++) out.data.set(a.data.subarray(idx[r] * a.cols, (idx[r] + 1) * a.cols), r * a.cols)
  return out
}

export function sqDist(a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number, d: number): number {
  let s = 0
  for (let k = 0; k < d; k++) {
    const t = a[ai + k] - b[bi + k]
    s += t * t
  }
  return s
}
