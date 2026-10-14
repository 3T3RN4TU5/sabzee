import type { Dataset2DName, LrSchedule, TrainConfig } from '../engine/index.ts'

/** Everything the Neural Network page can configure. */
export interface NNSettings extends TrainConfig {
  dataset: Dataset2DName
  noise: number
  nPoints: number
  trainRatio: number
  classes: number
  dataSeed: number
}

/** Hyper-parameters that can change mid-training without a reset. */
export interface LiveHyper {
  lr: number
  batchSize: number
  l2: number
  schedule: LrSchedule
}

export type StructuralSettings = Omit<NNSettings, keyof LiveHyper>

export type ToNNWorker =
  | { type: 'init'; settings: StructuralSettings }
  | { type: 'update'; hyper: LiveHyper }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'step' }
  | { type: 'reset' }
  /** Target epochs per second; 0 = as fast as possible. */
  | { type: 'speed'; epochsPerSecond: number }

export interface PointsBuffer {
  xy: Float32Array
  y: Int32Array
}

export interface NNData {
  type: 'data'
  train: PointsBuffer
  test: PointsBuffer
  numClasses: number
}

export interface NNSnapshot {
  type: 'snapshot'
  epoch: number
  running: boolean
  lr: number
  trainLoss: number
  testLoss: number
  trainAcc: number
  testAcc: number
  /** Measured training throughput. */
  epochsPerSec: number
  history: { epoch: Float32Array; trainLoss: Float32Array; testLoss: Float32Array; trainAcc: Float32Array; testAcc: Float32Array }
  /** Output class probabilities on an outRes×outRes grid over [-1,1]². */
  outRes: number
  output: Float32Array
  /** Per-node activations on a thumbRes² grid: inputs, hidden neurons, then output classes. */
  thumbRes: number
  nodes: Float32Array
  layerSizes: number[]
  /** Weight matrices [in × out] per layer. */
  weights: Float32Array[]
  numClasses: number
}

export type FromNNWorker = NNData | NNSnapshot
