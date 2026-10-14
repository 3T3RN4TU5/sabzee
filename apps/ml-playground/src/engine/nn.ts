/**
 * Neural-network building blocks on top of the autograd Tensor: layers,
 * activations, dropout, a Sequential container, weight initialisation and a
 * convenience MLP builder.
 */
import { randn, type Rng } from './rng.ts'
import { Tensor } from './tensor.ts'

export type ActivationName = 'relu' | 'tanh' | 'sigmoid' | 'leakyRelu' | 'linear'
export type InitName = 'xavier' | 'he' | 'normal'

export interface Module {
  forward(x: Tensor, training?: boolean): Tensor
  parameters(): Tensor[]
}

/**
 * Initial weight standard deviation.
 *  - Xavier/Glorot (tanh, sigmoid): Var(W) = 2 / (fan_in + fan_out)
 *  - He/Kaiming (ReLU family):      Var(W) = 2 / fan_in
 */
export function initStd(init: InitName, fanIn: number, fanOut: number): number {
  switch (init) {
    case 'xavier':
      return Math.sqrt(2 / (fanIn + fanOut))
    case 'he':
      return Math.sqrt(2 / fanIn)
    default:
      return 0.1
  }
}

/** Fully connected layer y = x W + b with W of shape [in, out]. */
export class Linear implements Module {
  W: Tensor
  b: Tensor
  readonly inFeatures: number
  readonly outFeatures: number

  constructor(inFeatures: number, outFeatures: number, rng: Rng, init: InitName = 'xavier') {
    this.inFeatures = inFeatures
    this.outFeatures = outFeatures
    const std = initStd(init, inFeatures, outFeatures)
    const w = new Float64Array(inFeatures * outFeatures)
    for (let i = 0; i < w.length; i++) w[i] = randn(rng) * std
    this.W = new Tensor(w, [inFeatures, outFeatures], true)
    this.W.label = 'W'
    this.b = Tensor.zeros([outFeatures], true)
    this.b.label = 'b'
  }

  forward(x: Tensor): Tensor {
    return x.matmul(this.W).add(this.b)
  }

  parameters(): Tensor[] {
    return [this.W, this.b]
  }
}

export class Activation implements Module {
  readonly name: ActivationName
  constructor(name: ActivationName) {
    this.name = name
  }

  forward(x: Tensor): Tensor {
    return activate(x, this.name)
  }

  parameters(): Tensor[] {
    return []
  }
}

export function activate(x: Tensor, name: ActivationName): Tensor {
  switch (name) {
    case 'relu':
      return x.relu()
    case 'tanh':
      return x.tanh()
    case 'sigmoid':
      return x.sigmoid()
    case 'leakyRelu':
      return x.leakyRelu(0.05)
    default:
      return x
  }
}

/** Scalar activation, for no-grad fast paths that avoid allocating tensors. */
export function activateScalar(x: number, name: ActivationName): number {
  switch (name) {
    case 'relu':
      return x > 0 ? x : 0
    case 'tanh':
      return Math.tanh(x)
    case 'sigmoid':
      return 1 / (1 + Math.exp(-x))
    case 'leakyRelu':
      return x > 0 ? x : 0.05 * x
    default:
      return x
  }
}

/**
 * Inverted dropout: during training each unit is zeroed with probability p
 * and survivors are scaled by 1/(1−p), so inference needs no rescaling.
 */
export class Dropout implements Module {
  readonly p: number
  private readonly rng: Rng
  constructor(p: number, rng: Rng) {
    this.p = p
    this.rng = rng
  }

  forward(x: Tensor, training = false): Tensor {
    if (!training || this.p <= 0) return x
    const keep = 1 - this.p
    const mask = new Float64Array(x.size)
    for (let i = 0; i < mask.length; i++) mask[i] = this.rng() < keep ? 1 / keep : 0
    return x.mul(new Tensor(mask, x.shape))
  }

  parameters(): Tensor[] {
    return []
  }
}

export class Sequential implements Module {
  readonly layers: Module[]
  constructor(layers: Module[]) {
    this.layers = layers
  }

  forward(x: Tensor, training = false): Tensor {
    let h = x
    for (const layer of this.layers) h = layer.forward(h, training)
    return h
  }

  parameters(): Tensor[] {
    return this.layers.flatMap((l) => l.parameters())
  }

  linears(): Linear[] {
    return this.layers.filter((l): l is Linear => l instanceof Linear)
  }
}

export interface MlpSpec {
  inputs: number
  hidden: number[]
  outputs: number
  activation: ActivationName
  dropout?: number
  init?: InitName
}

/** Linear → act → [dropout] → … → Linear (logits; the loss applies softmax). */
export function buildMlp(spec: MlpSpec, rng: Rng): Sequential {
  const init = spec.init ?? (spec.activation === 'relu' || spec.activation === 'leakyRelu' ? 'he' : 'xavier')
  const layers: Module[] = []
  let prev = spec.inputs
  for (const width of spec.hidden) {
    layers.push(new Linear(prev, width, rng, init))
    layers.push(new Activation(spec.activation))
    if (spec.dropout && spec.dropout > 0) layers.push(new Dropout(spec.dropout, rng))
    prev = width
  }
  layers.push(new Linear(prev, spec.outputs, rng, 'xavier'))
  return new Sequential(layers)
}

/** Sum of squared weights (biases excluded), the L2 penalty term. */
export function l2Penalty(model: Sequential): Tensor {
  let total: Tensor | null = null
  for (const lin of model.linears()) {
    const s = lin.W.square().sum()
    total = total ? total.add(s) : s
  }
  return total ?? Tensor.scalar(0)
}

export function countParameters(model: Module): number {
  return model.parameters().reduce((n, p) => n + p.size, 0)
}
