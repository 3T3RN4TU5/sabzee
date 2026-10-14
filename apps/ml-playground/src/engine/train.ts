/**
 * Mini-batch training of an MLP classifier, input feature maps and a no-grad
 * forward pass that also returns every hidden activation (used to draw the
 * per-neuron thumbnails and the decision-boundary heatmap).
 */
import type { Dataset } from './datasets.ts'
import { matrix, type Matrix } from './linalg.ts'
import { metricsFromProbs } from './nnMetrics.ts'
import { Activation, buildMlp, type ActivationName, type Sequential } from './nn.ts'
import { createOptimizer, scheduledLr, type LrSchedule, type Optimizer, type OptimizerName } from './optim.ts'
import { permutation, seededRng, type Rng } from './rng.ts'
import { crossEntropy, noGrad, softmaxRows, Tensor } from './tensor.ts'

export type FeatureName = 'x1' | 'x2' | 'x1sq' | 'x2sq' | 'x1x2' | 'sinx1' | 'sinx2'

export const FEATURES: { id: FeatureName; label: string; fn: (a: number, b: number) => number }[] = [
  { id: 'x1', label: 'x₁', fn: (a) => a },
  { id: 'x2', label: 'x₂', fn: (_a, b) => b },
  { id: 'x1sq', label: 'x₁²', fn: (a) => a * a },
  { id: 'x2sq', label: 'x₂²', fn: (_a, b) => b * b },
  { id: 'x1x2', label: 'x₁x₂', fn: (a, b) => a * b },
  { id: 'sinx1', label: 'sin πx₁', fn: (a) => Math.sin(Math.PI * a) },
  { id: 'sinx2', label: 'sin πx₂', fn: (_a, b) => Math.sin(Math.PI * b) },
]

/** Map 2-D points to the selected input features. */
export function featurize(X: Matrix, features: FeatureName[]): Matrix {
  const fns = features.map((f) => FEATURES.find((x) => x.id === f)!.fn)
  const out = matrix(X.rows, fns.length)
  for (let i = 0; i < X.rows; i++) {
    const a = X.data[i * X.cols]
    const b = X.data[i * X.cols + 1]
    for (let j = 0; j < fns.length; j++) out.data[i * fns.length + j] = fns[j](a, b)
  }
  return out
}

export interface TrainConfig {
  features: FeatureName[]
  hidden: number[]
  activation: ActivationName
  optimizer: OptimizerName
  lr: number
  batchSize: number
  /** L2 weight-decay coefficient λ. */
  l2: number
  dropout: number
  schedule: LrSchedule
  seed: number
}

export interface EvalResult {
  loss: number
  accuracy: number
}

export class Trainer {
  readonly cfg: TrainConfig
  readonly model: Sequential
  readonly optimizer: Optimizer
  readonly numClasses: number
  epoch = 0
  private readonly rng: Rng
  private readonly Xtrain: Matrix
  private readonly ytrain: Int32Array

  constructor(cfg: TrainConfig, train: Dataset) {
    this.cfg = cfg
    this.rng = seededRng(cfg.seed)
    this.numClasses = train.numClasses
    this.Xtrain = featurize(train.X, cfg.features)
    this.ytrain = train.y
    this.model = buildMlp(
      { inputs: cfg.features.length, hidden: cfg.hidden, outputs: train.numClasses, activation: cfg.activation, dropout: cfg.dropout },
      this.rng,
    )
    this.optimizer = createOptimizer(cfg.optimizer, this.model.parameters(), { lr: cfg.lr, weightDecay: cfg.l2 })
  }

  /** One pass over the shuffled training set in mini-batches; returns mean batch loss. */
  trainEpoch(): number {
    const n = this.Xtrain.rows
    const d = this.Xtrain.cols
    const bs = Math.max(1, Math.min(this.cfg.batchSize, n))
    this.optimizer.lr = scheduledLr(this.cfg.lr, this.cfg.schedule, this.epoch)
    const perm = permutation(n, this.rng)
    let total = 0
    let batches = 0
    for (let start = 0; start < n; start += bs) {
      const m = Math.min(bs, n - start)
      const xb = new Float64Array(m * d)
      const yb = new Int32Array(m)
      for (let r = 0; r < m; r++) {
        const i = perm[start + r]
        for (let j = 0; j < d; j++) xb[r * d + j] = this.Xtrain.data[i * d + j]
        yb[r] = this.ytrain[i]
      }
      this.optimizer.zeroGrad()
      const logits = this.model.forward(new Tensor(xb, [m, d]), true)
      const loss = crossEntropy(logits, yb)
      loss.backward()
      this.optimizer.step()
      total += loss.item()
      batches++
    }
    this.epoch++
    return total / batches
  }

  /** Class probabilities for raw 2-D points. */
  predictProba(X: Matrix): Float64Array {
    const F = featurize(X, this.cfg.features)
    const logits = noGrad(() => this.model.forward(new Tensor(F.data, [F.rows, F.cols]), false))
    const p = new Float64Array(logits.size)
    softmaxRows(logits.data, p, F.rows, this.numClasses)
    return p
  }

  evaluate(ds: Dataset): EvalResult {
    if (ds.X.rows === 0) return { loss: 0, accuracy: 0 }
    return metricsFromProbs(this.predictProba(ds.X), ds.y, this.numClasses)
  }

  /**
   * Forward pass that records the inputs (features), every hidden layer's
   * post-activation output, and the softmax output.
   */
  forwardWithActivations(X: Matrix): { features: Matrix; layers: Matrix[]; probs: Float64Array } {
    const F = featurize(X, this.cfg.features)
    const layers: Matrix[] = []
    const out = noGrad(() => {
      let h = new Tensor(F.data, [F.rows, F.cols])
      for (const layer of this.model.layers) {
        h = layer.forward(h, false)
        if (layer instanceof Activation) layers.push({ rows: h.shape[0], cols: h.shape[1], data: h.data })
      }
      return h
    })
    const probs = new Float64Array(out.size)
    softmaxRows(out.data, probs, F.rows, this.numClasses)
    return { features: F, layers, probs }
  }
}
