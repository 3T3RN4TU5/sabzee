/**
 * First-order optimizers and learning-rate schedules. Each optimizer updates
 * the parameter tensors in place from their `.grad` buffers.
 *
 * Weight decay: SGD/Momentum/Nesterov/RMSProp/Adam use classic (coupled) L2,
 * i.e. g ← g + λw, which equals adding (λ/2)‖w‖² to the loss. AdamW instead
 * decays the weights directly (w ← w − η·λ·w), decoupled from the adaptive
 * step (Loshchilov & Hutter, 2019). Decay is applied to matrices only, never
 * to bias vectors.
 */
import type { Tensor } from './tensor.ts'

export type OptimizerName = 'sgd' | 'momentum' | 'nesterov' | 'rmsprop' | 'adam' | 'adamw'

export const OPTIMIZER_NAMES: OptimizerName[] = ['sgd', 'momentum', 'nesterov', 'rmsprop', 'adam', 'adamw']

export const OPTIMIZER_LABELS: Record<OptimizerName, string> = {
  sgd: 'SGD',
  momentum: 'Momentum',
  nesterov: 'Nesterov',
  rmsprop: 'RMSProp',
  adam: 'Adam',
  adamw: 'AdamW',
}

export interface OptimizerOptions {
  lr: number
  weightDecay?: number
  momentum?: number
  beta1?: number
  beta2?: number
  rho?: number
  eps?: number
}

export abstract class Optimizer {
  readonly params: Tensor[]
  lr: number
  weightDecay: number
  /** Number of `step()` calls so far. */
  t = 0

  constructor(params: Tensor[], opts: OptimizerOptions) {
    this.params = params
    this.lr = opts.lr
    this.weightDecay = opts.weightDecay ?? 0
  }

  zeroGrad(): void {
    for (const p of this.params) p.zeroGrad()
  }

  step(): void {
    this.t++
    this.params.forEach((p, i) => {
      if (!p.grad) return
      const decay = p.rank >= 2 ? this.weightDecay : 0
      this.update(p.data, p.grad, i, decay)
    })
  }

  /** Update parameter `i` in place. */
  protected abstract update(w: Float64Array, g: Float64Array, i: number, decay: number): void

  /** Lazily allocated per-parameter state buffer. */
  protected readonly state = new Map<string, Float64Array>()
  protected buf(key: string, i: number, n: number): Float64Array {
    const k = `${key}${i}`
    let b = this.state.get(k)
    if (!b) {
      b = new Float64Array(n)
      this.state.set(k, b)
    }
    return b
  }
}

export class SGD extends Optimizer {
  protected update(w: Float64Array, g: Float64Array, _i: number, decay: number): void {
    for (let j = 0; j < w.length; j++) w[j] -= this.lr * (g[j] + decay * w[j])
  }
}

/** Heavy-ball momentum: v ← μv + g; w ← w − ηv. */
export class Momentum extends Optimizer {
  readonly mu: number
  constructor(params: Tensor[], opts: OptimizerOptions) {
    super(params, opts)
    this.mu = opts.momentum ?? 0.9
  }
  protected update(w: Float64Array, g: Float64Array, i: number, decay: number): void {
    const v = this.buf('v', i, w.length)
    for (let j = 0; j < w.length; j++) {
      v[j] = this.mu * v[j] + g[j] + decay * w[j]
      w[j] -= this.lr * v[j]
    }
  }
}

/** Nesterov accelerated gradient (Sutskever form): w ← w − η(g + μv). */
export class Nesterov extends Optimizer {
  readonly mu: number
  constructor(params: Tensor[], opts: OptimizerOptions) {
    super(params, opts)
    this.mu = opts.momentum ?? 0.9
  }
  protected update(w: Float64Array, g: Float64Array, i: number, decay: number): void {
    const v = this.buf('v', i, w.length)
    for (let j = 0; j < w.length; j++) {
      const gj = g[j] + decay * w[j]
      v[j] = this.mu * v[j] + gj
      w[j] -= this.lr * (gj + this.mu * v[j])
    }
  }
}

/** RMSProp: s ← ρs + (1−ρ)g²; w ← w − η g / (√s + ε). */
export class RMSProp extends Optimizer {
  readonly rho: number
  readonly eps: number
  constructor(params: Tensor[], opts: OptimizerOptions) {
    super(params, opts)
    this.rho = opts.rho ?? 0.9
    this.eps = opts.eps ?? 1e-8
  }
  protected update(w: Float64Array, g: Float64Array, i: number, decay: number): void {
    const s = this.buf('s', i, w.length)
    for (let j = 0; j < w.length; j++) {
      const gj = g[j] + decay * w[j]
      s[j] = this.rho * s[j] + (1 - this.rho) * gj * gj
      w[j] -= (this.lr * gj) / (Math.sqrt(s[j]) + this.eps)
    }
  }
}

/** Adam with bias-corrected first and second moments. */
export class Adam extends Optimizer {
  readonly beta1: number
  readonly beta2: number
  readonly eps: number
  readonly decoupled: boolean
  constructor(params: Tensor[], opts: OptimizerOptions, decoupled = false) {
    super(params, opts)
    this.beta1 = opts.beta1 ?? 0.9
    this.beta2 = opts.beta2 ?? 0.999
    this.eps = opts.eps ?? 1e-8
    this.decoupled = decoupled
  }
  protected update(w: Float64Array, g: Float64Array, i: number, decay: number): void {
    const m = this.buf('m', i, w.length)
    const v = this.buf('v', i, w.length)
    const bc1 = 1 - this.beta1 ** this.t
    const bc2 = 1 - this.beta2 ** this.t
    for (let j = 0; j < w.length; j++) {
      if (this.decoupled) w[j] -= this.lr * decay * w[j]
      const gj = this.decoupled ? g[j] : g[j] + decay * w[j]
      m[j] = this.beta1 * m[j] + (1 - this.beta1) * gj
      v[j] = this.beta2 * v[j] + (1 - this.beta2) * gj * gj
      w[j] -= (this.lr * (m[j] / bc1)) / (Math.sqrt(v[j] / bc2) + this.eps)
    }
  }
}

export class AdamW extends Adam {
  constructor(params: Tensor[], opts: OptimizerOptions) {
    super(params, opts, true)
  }
}

export function createOptimizer(name: OptimizerName, params: Tensor[], opts: OptimizerOptions): Optimizer {
  switch (name) {
    case 'sgd':
      return new SGD(params, opts)
    case 'momentum':
      return new Momentum(params, opts)
    case 'nesterov':
      return new Nesterov(params, opts)
    case 'rmsprop':
      return new RMSProp(params, opts)
    case 'adam':
      return new Adam(params, opts)
    case 'adamw':
      return new AdamW(params, opts)
  }
}

/** Rescale all gradients so their global L2 norm is at most `maxNorm`. */
export function clipGradNorm(params: Tensor[], maxNorm: number): number {
  let sq = 0
  for (const p of params) if (p.grad) for (const g of p.grad) sq += g * g
  const norm = Math.sqrt(sq)
  if (norm > maxNorm && norm > 0) {
    const s = maxNorm / norm
    for (const p of params) if (p.grad) for (let j = 0; j < p.grad.length; j++) p.grad[j] *= s
  }
  return norm
}

// ─── Learning-rate schedules ────────────────────────────────────────────────

export type LrSchedule =
  | { kind: 'constant' }
  | { kind: 'step'; stepSize: number; gamma: number }
  | { kind: 'cosine'; period: number; minFactor: number }

/**
 * Learning rate at `epoch`.
 *  - step:   η₀ · γ^⌊epoch / stepSize⌋
 *  - cosine: η_min + ½(η₀ − η_min)(1 + cos(π · t/T)), restarting every T epochs (SGDR)
 */
export function scheduledLr(base: number, schedule: LrSchedule, epoch: number): number {
  switch (schedule.kind) {
    case 'constant':
      return base
    case 'step':
      return base * schedule.gamma ** Math.floor(epoch / Math.max(1, schedule.stepSize))
    case 'cosine': {
      const t = (epoch % schedule.period) / schedule.period
      const min = base * schedule.minFactor
      return min + 0.5 * (base - min) * (1 + Math.cos(Math.PI * t))
    }
  }
}
