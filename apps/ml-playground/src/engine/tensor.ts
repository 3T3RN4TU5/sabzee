/**
 * A small reverse-mode automatic differentiation library.
 *
 * Every Tensor owns a flat Float64Array plus a shape (row-major). Operations
 * build a computation graph on the fly: each result remembers its parents and
 * a closure that pushes the upstream gradient back to them. `backward()`
 * topologically sorts the graph and runs those closures in reverse order.
 *
 * Elementwise binary ops follow NumPy broadcasting rules, and their backward
 * pass sums gradients over the broadcast dimensions automatically (several
 * output elements map to the same input element and accumulate into it).
 */
import { randn, type Rng } from './rng.ts'

export type Shape = number[]

let gradEnabled = true

/** Run `fn` without recording a graph (inference, evaluation, heatmaps). */
export function noGrad<T>(fn: () => T): T {
  const prev = gradEnabled
  gradEnabled = false
  try {
    return fn()
  } finally {
    gradEnabled = prev
  }
}

export function shapeSize(shape: readonly number[]): number {
  let n = 1
  for (const d of shape) n *= d
  return n
}

function sameShape(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/** NumPy-style broadcast of two shapes. */
export function broadcastShapes(a: readonly number[], b: readonly number[]): Shape {
  const n = Math.max(a.length, b.length)
  const out: Shape = new Array(n)
  for (let i = 0; i < n; i++) {
    const da = a[a.length - n + i] ?? 1
    const db = b[b.length - n + i] ?? 1
    if (da !== db && da !== 1 && db !== 1) {
      throw new Error(`Cannot broadcast shapes [${a.join(',')}] and [${b.join(',')}]`)
    }
    out[i] = da === 1 ? db : da
  }
  return out
}

/**
 * For each flat index of `outShape`, the flat index of the element of an
 * input with shape `inShape` that broadcasts to it. `null` means identity.
 */
function broadcastMap(inShape: readonly number[], outShape: readonly number[]): Int32Array | null {
  if (sameShape(inShape, outShape)) return null
  const n = outShape.length
  const size = shapeSize(outShape)
  const map = new Int32Array(size)
  if (inShape.length === 0 || shapeSize(inShape) === 1) return map // scalar → all zeros
  // Input strides aligned to the output rank (0 on broadcast dimensions).
  const strides = new Int32Array(n)
  let s = 1
  for (let i = n - 1; i >= 0; i--) {
    const d = inShape[inShape.length - n + i] ?? 1
    strides[i] = d === 1 ? 0 : s
    s *= d
  }
  const idx = new Int32Array(n)
  let off = 0
  for (let k = 0; k < size; k++) {
    map[k] = off
    // Increment the multi-index like an odometer.
    for (let i = n - 1; i >= 0; i--) {
      idx[i]++
      off += strides[i]
      if (idx[i] < outShape[i]) break
      off -= strides[i] * idx[i]
      idx[i] = 0
    }
  }
  return map
}

type Operand = Tensor | number

export class Tensor {
  data: Float64Array
  shape: Shape
  grad: Float64Array | null = null
  requiresGrad: boolean
  /** Inputs this tensor was computed from (empty for leaves / no-grad). */
  parents: Tensor[]
  /** Pushes `this.grad` into the parents' grads. */
  backwardFn: (() => void) | null = null
  op: string
  label = ''

  constructor(data: Float64Array | number[], shape?: Shape, requiresGrad = false, op = 'leaf') {
    this.data = data instanceof Float64Array ? data : Float64Array.from(data)
    this.shape = shape ? [...shape] : [this.data.length]
    if (shapeSize(this.shape) !== this.data.length) {
      throw new Error(`Data length ${this.data.length} does not match shape [${this.shape.join(',')}]`)
    }
    this.requiresGrad = requiresGrad
    this.parents = []
    this.op = op
  }

  // ─── Construction ────────────────────────────────────────────────────────

  static zeros(shape: Shape, requiresGrad = false): Tensor {
    return new Tensor(new Float64Array(shapeSize(shape)), shape, requiresGrad)
  }

  static ones(shape: Shape, requiresGrad = false): Tensor {
    return new Tensor(new Float64Array(shapeSize(shape)).fill(1), shape, requiresGrad)
  }

  static scalar(v: number, requiresGrad = false): Tensor {
    return new Tensor(Float64Array.of(v), [], requiresGrad)
  }

  static randn(shape: Shape, rng: Rng, std = 1, requiresGrad = false): Tensor {
    const d = new Float64Array(shapeSize(shape))
    for (let i = 0; i < d.length; i++) d[i] = randn(rng) * std
    return new Tensor(d, shape, requiresGrad)
  }

  /** Build from a nested 2-D array. */
  static from2D(rows: readonly (readonly number[])[], requiresGrad = false): Tensor {
    const n = rows.length
    const m = n ? rows[0].length : 0
    const d = new Float64Array(n * m)
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) d[i * m + j] = rows[i][j]
    return new Tensor(d, [n, m], requiresGrad)
  }

  get size(): number {
    return this.data.length
  }

  get rank(): number {
    return this.shape.length
  }

  item(): number {
    if (this.data.length !== 1) throw new Error('item() needs a single-element tensor')
    return this.data[0]
  }

  /** Copy without graph history. */
  detach(): Tensor {
    return new Tensor(this.data.slice(), this.shape)
  }

  toArray2D(): number[][] {
    const [n, m] = this.shape
    const out: number[][] = []
    for (let i = 0; i < n; i++) out.push(Array.from(this.data.subarray(i * m, i * m + m)))
    return out
  }

  zeroGrad(): void {
    if (this.grad) this.grad.fill(0)
  }

  /** Allocate (if needed) and return this tensor's gradient buffer. */
  ensureGrad(): Float64Array {
    if (!this.grad) this.grad = new Float64Array(this.data.length)
    return this.grad
  }

  /** Wire a freshly computed result into the graph if any input needs grads. */
  private static result(data: Float64Array, shape: Shape, parents: Tensor[], op: string, backward: (out: Tensor) => void): Tensor {
    const needs = gradEnabled && parents.some((p) => p.requiresGrad)
    const out = new Tensor(data, shape, needs, op)
    if (needs) {
      out.parents = parents
      out.backwardFn = () => backward(out)
    }
    return out
  }

  // ─── Elementwise binary ops (broadcasting) ───────────────────────────────

  private static lift(x: Operand): Tensor {
    return typeof x === 'number' ? Tensor.scalar(x) : x
  }

  add(other: Operand): Tensor {
    const b = Tensor.lift(other)
    const shape = broadcastShapes(this.shape, b.shape)
    const ma = broadcastMap(this.shape, shape)
    const mb = broadcastMap(b.shape, shape)
    const ad = this.data
    const bd = b.data
    const n = shapeSize(shape)
    const d = new Float64Array(n)
    for (let i = 0; i < n; i++) d[i] = ad[ma ? ma[i] : i] + bd[mb ? mb[i] : i]
    return Tensor.result(d, shape, [this, b], 'add', (out) => {
      const g = out.grad!
      if (this.requiresGrad) {
        const ga = this.ensureGrad()
        for (let i = 0; i < n; i++) ga[ma ? ma[i] : i] += g[i]
      }
      if (b.requiresGrad) {
        const gb = b.ensureGrad()
        for (let i = 0; i < n; i++) gb[mb ? mb[i] : i] += g[i]
      }
    })
  }

  sub(other: Operand): Tensor {
    const b = Tensor.lift(other)
    const shape = broadcastShapes(this.shape, b.shape)
    const ma = broadcastMap(this.shape, shape)
    const mb = broadcastMap(b.shape, shape)
    const ad = this.data
    const bd = b.data
    const n = shapeSize(shape)
    const d = new Float64Array(n)
    for (let i = 0; i < n; i++) d[i] = ad[ma ? ma[i] : i] - bd[mb ? mb[i] : i]
    return Tensor.result(d, shape, [this, b], 'sub', (out) => {
      const g = out.grad!
      if (this.requiresGrad) {
        const ga = this.ensureGrad()
        for (let i = 0; i < n; i++) ga[ma ? ma[i] : i] += g[i]
      }
      if (b.requiresGrad) {
        const gb = b.ensureGrad()
        for (let i = 0; i < n; i++) gb[mb ? mb[i] : i] -= g[i]
      }
    })
  }

  mul(other: Operand): Tensor {
    const b = Tensor.lift(other)
    const shape = broadcastShapes(this.shape, b.shape)
    const ma = broadcastMap(this.shape, shape)
    const mb = broadcastMap(b.shape, shape)
    const ad = this.data
    const bd = b.data
    const n = shapeSize(shape)
    const d = new Float64Array(n)
    for (let i = 0; i < n; i++) d[i] = ad[ma ? ma[i] : i] * bd[mb ? mb[i] : i]
    return Tensor.result(d, shape, [this, b], 'mul', (out) => {
      const g = out.grad!
      if (this.requiresGrad) {
        const ga = this.ensureGrad()
        for (let i = 0; i < n; i++) ga[ma ? ma[i] : i] += g[i] * bd[mb ? mb[i] : i]
      }
      if (b.requiresGrad) {
        const gb = b.ensureGrad()
        for (let i = 0; i < n; i++) gb[mb ? mb[i] : i] += g[i] * ad[ma ? ma[i] : i]
      }
    })
  }

  div(other: Operand): Tensor {
    const b = Tensor.lift(other)
    const shape = broadcastShapes(this.shape, b.shape)
    const ma = broadcastMap(this.shape, shape)
    const mb = broadcastMap(b.shape, shape)
    const ad = this.data
    const bd = b.data
    const n = shapeSize(shape)
    const d = new Float64Array(n)
    for (let i = 0; i < n; i++) d[i] = ad[ma ? ma[i] : i] / bd[mb ? mb[i] : i]
    return Tensor.result(d, shape, [this, b], 'div', (out) => {
      const g = out.grad!
      if (this.requiresGrad) {
        const ga = this.ensureGrad()
        for (let i = 0; i < n; i++) ga[ma ? ma[i] : i] += g[i] / bd[mb ? mb[i] : i]
      }
      if (b.requiresGrad) {
        const gb = b.ensureGrad()
        for (let i = 0; i < n; i++) {
          const y = bd[mb ? mb[i] : i]
          gb[mb ? mb[i] : i] -= (g[i] * ad[ma ? ma[i] : i]) / (y * y)
        }
      }
    })
  }

  // ─── Elementwise unary ops ───────────────────────────────────────────────

  /**
   * Shared scaffolding for unary ops. `f` computes the output; `df(x, y)`
   * returns dy/dx given the input x and output y.
   */
  private unary(op: string, f: (x: number) => number, df: (x: number, y: number) => number): Tensor {
    const x = this.data
    const n = x.length
    const d = new Float64Array(n)
    for (let i = 0; i < n; i++) d[i] = f(x[i])
    return Tensor.result(d, this.shape, [this], op, (out) => {
      const g = out.grad!
      const gx = this.ensureGrad()
      for (let i = 0; i < n; i++) gx[i] += g[i] * df(x[i], d[i])
    })
  }

  neg(): Tensor {
    return this.unary('neg', (x) => -x, () => -1)
  }

  pow(p: number): Tensor {
    return this.unary(`pow${p}`, (x) => x ** p, (x) => p * x ** (p - 1))
  }

  square(): Tensor {
    return this.unary('square', (x) => x * x, (x) => 2 * x)
  }

  sqrt(): Tensor {
    return this.unary('sqrt', Math.sqrt, (_x, y) => 0.5 / y)
  }

  abs(): Tensor {
    return this.unary('abs', Math.abs, (x) => (x > 0 ? 1 : x < 0 ? -1 : 0))
  }

  exp(): Tensor {
    return this.unary('exp', Math.exp, (_x, y) => y)
  }

  log(): Tensor {
    return this.unary('log', Math.log, (x) => 1 / x)
  }

  sin(): Tensor {
    return this.unary('sin', Math.sin, Math.cos)
  }

  tanh(): Tensor {
    return this.unary('tanh', Math.tanh, (_x, y) => 1 - y * y)
  }

  sigmoid(): Tensor {
    return this.unary('sigmoid', sigmoid, (_x, y) => y * (1 - y))
  }

  relu(): Tensor {
    return this.unary('relu', (x) => (x > 0 ? x : 0), (x) => (x > 0 ? 1 : 0))
  }

  leakyRelu(alpha = 0.01): Tensor {
    return this.unary('leakyRelu', (x) => (x > 0 ? x : alpha * x), (x) => (x > 0 ? 1 : alpha))
  }

  // ─── Shape ops ───────────────────────────────────────────────────────────

  reshape(shape: Shape): Tensor {
    const resolved = [...shape]
    const inferred = resolved.indexOf(-1)
    if (inferred >= 0) resolved[inferred] = this.size / -shapeSize(resolved)
    if (shapeSize(resolved) !== this.size) throw new Error(`Cannot reshape [${this.shape}] to [${shape}]`)
    return Tensor.result(this.data.slice(), resolved, [this], 'reshape', (out) => {
      const g = out.grad!
      const gx = this.ensureGrad()
      for (let i = 0; i < g.length; i++) gx[i] += g[i]
    })
  }

  /** Transpose of a 2-D tensor. */
  transpose(): Tensor {
    if (this.rank !== 2) throw new Error('transpose() needs a 2-D tensor')
    const [n, m] = this.shape
    const x = this.data
    const d = new Float64Array(n * m)
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) d[j * n + i] = x[i * m + j]
    return Tensor.result(d, [m, n], [this], 'transpose', (out) => {
      const g = out.grad!
      const gx = this.ensureGrad()
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) gx[i * m + j] += g[j * n + i]
    })
  }

  get T(): Tensor {
    return this.transpose()
  }

  // ─── Linear algebra ──────────────────────────────────────────────────────

  /** Matrix product of 2-D tensors [n,k] @ [k,m] → [n,m]. */
  matmul(other: Tensor): Tensor {
    if (this.rank !== 2 || other.rank !== 2) throw new Error('matmul() needs 2-D tensors')
    const [n, k] = this.shape
    const [k2, m] = other.shape
    if (k !== k2) throw new Error(`matmul shape mismatch [${this.shape}] @ [${other.shape}]`)
    const a = this.data
    const b = other.data
    const d = new Float64Array(n * m)
    matmulInto(a, b, d, n, k, m)
    return Tensor.result(d, [n, m], [this, other], 'matmul', (out) => {
      const g = out.grad!
      if (this.requiresGrad) {
        // dA = dOut @ Bᵀ
        const ga = this.ensureGrad()
        for (let i = 0; i < n; i++) {
          for (let p = 0; p < k; p++) {
            let s = 0
            for (let j = 0; j < m; j++) s += g[i * m + j] * b[p * m + j]
            ga[i * k + p] += s
          }
        }
      }
      if (other.requiresGrad) {
        // dB = Aᵀ @ dOut
        const gb = other.ensureGrad()
        for (let i = 0; i < n; i++) {
          for (let p = 0; p < k; p++) {
            const av = a[i * k + p]
            if (av === 0) continue
            const row = p * m
            const grow = i * m
            for (let j = 0; j < m; j++) gb[row + j] += av * g[grow + j]
          }
        }
      }
    })
  }

  // ─── Reductions ──────────────────────────────────────────────────────────

  /** Sum of all elements, or along one axis. */
  sum(axis?: number, keepDims = false): Tensor {
    if (axis === undefined) {
      const x = this.data
      let s = 0
      for (let i = 0; i < x.length; i++) s += x[i]
      return Tensor.result(Float64Array.of(s), keepDims ? this.shape.map(() => 1) : [], [this], 'sum', (out) => {
        const g = out.grad![0]
        const gx = this.ensureGrad()
        for (let i = 0; i < gx.length; i++) gx[i] += g
      })
    }
    const ax = axis < 0 ? this.rank + axis : axis
    const dim = this.shape[ax]
    const outer = shapeSize(this.shape.slice(0, ax))
    const inner = shapeSize(this.shape.slice(ax + 1))
    const x = this.data
    const d = new Float64Array(outer * inner)
    for (let o = 0; o < outer; o++) {
      for (let k = 0; k < dim; k++) {
        const base = (o * dim + k) * inner
        for (let i = 0; i < inner; i++) d[o * inner + i] += x[base + i]
      }
    }
    const shape = keepDims ? this.shape.map((s, i) => (i === ax ? 1 : s)) : this.shape.filter((_, i) => i !== ax)
    return Tensor.result(d, shape, [this], 'sum', (out) => {
      const g = out.grad!
      const gx = this.ensureGrad()
      for (let o = 0; o < outer; o++) {
        for (let k = 0; k < dim; k++) {
          const base = (o * dim + k) * inner
          for (let i = 0; i < inner; i++) gx[base + i] += g[o * inner + i]
        }
      }
    })
  }

  mean(axis?: number, keepDims = false): Tensor {
    const count = axis === undefined ? this.size : this.shape[axis < 0 ? this.rank + axis : axis]
    return this.sum(axis, keepDims).mul(1 / count)
  }

  /** Softmax along the last axis (numerically stabilised). */
  softmax(): Tensor {
    const m = this.shape[this.rank - 1]
    const rows = this.size / m
    const x = this.data
    const d = new Float64Array(x.length)
    softmaxRows(x, d, rows, m)
    return Tensor.result(d, this.shape, [this], 'softmax', (out) => {
      const g = out.grad!
      const gx = this.ensureGrad()
      for (let r = 0; r < rows; r++) {
        const o = r * m
        let dot = 0
        for (let j = 0; j < m; j++) dot += g[o + j] * d[o + j]
        for (let j = 0; j < m; j++) gx[o + j] += d[o + j] * (g[o + j] - dot)
      }
    })
  }

  /** log(softmax(x)) along the last axis, computed stably. */
  logSoftmax(): Tensor {
    const m = this.shape[this.rank - 1]
    const rows = this.size / m
    const x = this.data
    const d = new Float64Array(x.length)
    for (let r = 0; r < rows; r++) {
      const o = r * m
      let max = -Infinity
      for (let j = 0; j < m; j++) max = Math.max(max, x[o + j])
      let s = 0
      for (let j = 0; j < m; j++) s += Math.exp(x[o + j] - max)
      const lse = max + Math.log(s)
      for (let j = 0; j < m; j++) d[o + j] = x[o + j] - lse
    }
    return Tensor.result(d, this.shape, [this], 'logSoftmax', (out) => {
      const g = out.grad!
      const gx = this.ensureGrad()
      for (let r = 0; r < rows; r++) {
        const o = r * m
        let gs = 0
        for (let j = 0; j < m; j++) gs += g[o + j]
        for (let j = 0; j < m; j++) gx[o + j] += g[o + j] - Math.exp(d[o + j]) * gs
      }
    })
  }

  // ─── Backpropagation ─────────────────────────────────────────────────────

  /**
   * Reverse-mode sweep. Seeds d(self)/d(self) = 1 (or `seed`), orders the
   * graph topologically with an iterative DFS, then calls each node's
   * backward closure from the output towards the leaves.
   */
  backward(seed?: Float64Array): void {
    const order: Tensor[] = []
    const visited = new Set<Tensor>()
    const stack: [Tensor, boolean][] = [[this, false]]
    while (stack.length) {
      const [node, expanded] = stack.pop()!
      if (expanded) {
        order.push(node)
        continue
      }
      if (visited.has(node)) continue
      visited.add(node)
      stack.push([node, true])
      for (const p of node.parents) if (!visited.has(p) && p.requiresGrad) stack.push([p, false])
    }
    const g = this.ensureGrad()
    if (seed) g.set(seed)
    else g.fill(1)
    for (let i = order.length - 1; i >= 0; i--) {
      const node = order[i]
      if (node.backwardFn) node.backwardFn()
    }
    // Free intermediate buffers so the graph can be garbage-collected.
    for (const node of order) {
      if (node.backwardFn) {
        node.backwardFn = null
        node.parents = []
      }
    }
  }
}

// ─── Helpers shared with no-grad fast paths ─────────────────────────────────

export function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x))
  const e = Math.exp(x)
  return e / (1 + e)
}

/** out[n×m] = a[n×k] @ b[k×m] (i-p-j loop order for cache-friendly access). */
export function matmulInto(a: Float64Array, b: Float64Array, out: Float64Array, n: number, k: number, m: number): void {
  out.fill(0)
  for (let i = 0; i < n; i++) {
    const orow = i * m
    for (let p = 0; p < k; p++) {
      const av = a[i * k + p]
      if (av === 0) continue
      const brow = p * m
      for (let j = 0; j < m; j++) out[orow + j] += av * b[brow + j]
    }
  }
}

export function softmaxRows(x: ArrayLike<number>, out: Float64Array, rows: number, m: number): void {
  for (let r = 0; r < rows; r++) {
    const o = r * m
    let max = -Infinity
    for (let j = 0; j < m; j++) max = Math.max(max, x[o + j])
    let s = 0
    for (let j = 0; j < m; j++) {
      const e = Math.exp(x[o + j] - max)
      out[o + j] = e
      s += e
    }
    for (let j = 0; j < m; j++) out[o + j] /= s
  }
}

// ─── Losses ────────────────────────────────────────────────────────────────

/**
 * Mean softmax cross-entropy between logits [N,K] and integer class labels.
 * Fused for stability; the gradient is (softmax − one_hot) / N.
 */
export function crossEntropy(logits: Tensor, targets: ArrayLike<number>): Tensor {
  const [n, k] = logits.shape
  const x = logits.data
  const probs = new Float64Array(n * k)
  softmaxRows(x, probs, n, k)
  let loss = 0
  for (let i = 0; i < n; i++) loss -= Math.log(Math.max(probs[i * k + targets[i]], 1e-300))
  loss /= n
  const out = new Tensor(Float64Array.of(loss), [], gradEnabled && logits.requiresGrad, 'crossEntropy')
  if (out.requiresGrad) {
    out.parents = [logits]
    out.backwardFn = () => {
      const g = out.grad![0] / n
      const gx = logits.ensureGrad()
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < k; j++) gx[i * k + j] += g * (probs[i * k + j] - (j === targets[i] ? 1 : 0))
      }
    }
  }
  return out
}

/**
 * Mean binary cross-entropy on raw logits (any shape) against 0/1 targets,
 * using the stable form max(z,0) − z·y + log(1 + e^−|z|).
 */
export function bceWithLogits(logits: Tensor, targets: ArrayLike<number>): Tensor {
  const z = logits.data
  const n = z.length
  let loss = 0
  for (let i = 0; i < n; i++) loss += Math.max(z[i], 0) - z[i] * targets[i] + Math.log1p(Math.exp(-Math.abs(z[i])))
  const out = new Tensor(Float64Array.of(loss / n), [], gradEnabled && logits.requiresGrad, 'bce')
  if (out.requiresGrad) {
    out.parents = [logits]
    out.backwardFn = () => {
      const g = out.grad![0] / n
      const gx = logits.ensureGrad()
      for (let i = 0; i < n; i++) gx[i] += g * (sigmoid(z[i]) - targets[i])
    }
  }
  return out
}

/** Mean squared error, composed from primitive ops. */
export function mse(pred: Tensor, target: Tensor): Tensor {
  return pred.sub(target).square().mean()
}
