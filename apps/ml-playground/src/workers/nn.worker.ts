/**
 * Trains the playground network off the main thread. While running it packs
 * as many epochs as fit in a ~12 ms budget per tick (or paces them to the
 * requested epochs/second) and posts a snapshot at most every ~40 ms, so the
 * UI thread only ever draws.
 */
import { make2D, matrix, seededRng, Trainer, trainTestSplit, type Dataset } from '../engine/index.ts'
import type { FromNNWorker, LiveHyper, NNSettings, NNSnapshot, PointsBuffer, StructuralSettings, ToNNWorker } from './nnProtocol.ts'

const OUT_RES = 72
const THUMB_RES = 28
const MAX_HISTORY = 3000

let settings: NNSettings | null = null
let hyper: LiveHyper = { lr: 0.01, batchSize: 16, l2: 0, schedule: { kind: 'constant' } }
let trainer: Trainer | null = null
let train: Dataset | null = null
let test: Dataset | null = null
let resets = 0
let running = false
let epochsPerSecond = 0
let credit = 0
let lastTick = 0
let lastPost = 0
let rateWindow: { t: number; epoch: number } = { t: 0, epoch: 0 }
let measuredRate = 0
let last = { trainLoss: NaN, testLoss: NaN, trainAcc: NaN, testAcc: NaN }

const history = { epoch: [] as number[], trainLoss: [] as number[], testLoss: [] as number[], trainAcc: [] as number[], testAcc: [] as number[] }
let recordEvery = 1

function gridMatrix(res: number) {
  const m = matrix(res * res, 2)
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      m.data[(r * res + c) * 2] = -1 + ((c + 0.5) / res) * 2
      m.data[(r * res + c) * 2 + 1] = 1 - ((r + 0.5) / res) * 2
    }
  }
  return m
}
const outGrid = gridMatrix(OUT_RES)
const thumbGrid = gridMatrix(THUMB_RES)

function post(msg: FromNNWorker, transfer: Transferable[] = []) {
  ;(self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(msg, transfer)
}

function points(ds: Dataset): PointsBuffer {
  return { xy: Float32Array.from(ds.X.data), y: ds.y.slice() }
}

function clearHistory() {
  for (const k of Object.keys(history) as (keyof typeof history)[]) history[k] = []
  recordEvery = 1
}

function buildTrainer() {
  if (!settings || !train) return
  trainer = new Trainer({ ...settings, seed: settings.seed + resets * 7919 }, train)
  clearHistory()
  evaluate()
  record()
}

function init(structural: StructuralSettings) {
  const s: NNSettings = { ...structural, ...hyper }
  settings = s
  const ds = make2D(s.dataset, { n: s.nPoints, noise: s.noise, seed: s.dataSeed, classes: s.classes })
  const split = trainTestSplit(ds, s.trainRatio, seededRng(s.dataSeed + 1))
  train = split.train
  test = split.test
  buildTrainer()
  post({ type: 'data', train: points(train), test: points(test), numClasses: ds.numClasses })
  postSnapshot()
}

function evaluate() {
  if (!trainer || !train || !test) return
  const a = trainer.evaluate(train)
  const b = trainer.evaluate(test)
  last = { trainLoss: a.loss, testLoss: b.loss, trainAcc: a.accuracy, testAcc: b.accuracy }
}

function record() {
  if (!trainer) return
  if (trainer.epoch % recordEvery !== 0) return
  history.epoch.push(trainer.epoch)
  history.trainLoss.push(last.trainLoss)
  history.testLoss.push(last.testLoss)
  history.trainAcc.push(last.trainAcc)
  history.testAcc.push(last.testAcc)
  if (history.epoch.length > MAX_HISTORY) {
    // Halve the resolution: keep every other point and record half as often.
    for (const k of Object.keys(history) as (keyof typeof history)[]) history[k] = history[k].filter((_, i) => i % 2 === 0)
    recordEvery *= 2
  }
}

function trainOne() {
  if (!trainer) return
  trainer.trainEpoch()
  evaluate()
  record()
}

function postSnapshot() {
  if (!trainer || !settings) return
  const k = trainer.numClasses
  const output = Float32Array.from(trainer.predictProba(outGrid))
  const { features, layers, probs } = trainer.forwardWithActivations(thumbGrid)
  const px = THUMB_RES * THUMB_RES
  const layerSizes = [features.cols, ...layers.map((l) => l.cols), k]
  const total = layerSizes.reduce((a, b) => a + b, 0)
  const nodes = new Float32Array(total * px)
  let node = 0
  for (const m of [features, ...layers]) {
    for (let j = 0; j < m.cols; j++, node++) for (let p = 0; p < px; p++) nodes[node * px + p] = m.data[p * m.cols + j]
  }
  // Output nodes: probability minus chance level so the diverging map is centred.
  for (let c = 0; c < k; c++, node++) for (let p = 0; p < px; p++) nodes[node * px + p] = probs[p * k + c] - 1 / k
  const weights = trainer.model.linears().map((l) => Float32Array.from(l.W.data))
  const snap: NNSnapshot = {
    type: 'snapshot',
    epoch: trainer.epoch,
    running,
    lr: trainer.optimizer.lr,
    ...last,
    epochsPerSec: measuredRate,
    history: {
      epoch: Float32Array.from(history.epoch),
      trainLoss: Float32Array.from(history.trainLoss),
      testLoss: Float32Array.from(history.testLoss),
      trainAcc: Float32Array.from(history.trainAcc),
      testAcc: Float32Array.from(history.testAcc),
    },
    outRes: OUT_RES,
    output,
    thumbRes: THUMB_RES,
    nodes,
    layerSizes,
    weights,
    numClasses: k,
  }
  const h = snap.history
  post(snap, [output.buffer, nodes.buffer, h.epoch.buffer, h.trainLoss.buffer, h.testLoss.buffer, h.trainAcc.buffer, h.testAcc.buffer, ...weights.map((w) => w.buffer)])
  lastPost = performance.now()
}

function tick() {
  if (!running || !trainer) return
  const start = performance.now()
  if (epochsPerSecond > 0) credit = Math.min(credit + ((start - lastTick) / 1000) * epochsPerSecond, 5)
  lastTick = start
  while (performance.now() - start < 12) {
    if (epochsPerSecond > 0) {
      if (credit < 1) break
      credit -= 1
    }
    trainOne()
  }
  const now = performance.now()
  if (now - rateWindow.t > 500) {
    measuredRate = ((trainer.epoch - rateWindow.epoch) * 1000) / (now - rateWindow.t)
    rateWindow = { t: now, epoch: trainer.epoch }
  }
  if (now - lastPost > 40) postSnapshot()
  setTimeout(tick, epochsPerSecond > 0 ? 4 : 0)
}

function applyHyper(h: LiveHyper) {
  hyper = h
  if (!settings || !trainer) return
  settings = { ...settings, ...h }
  Object.assign(trainer.cfg, h)
  trainer.optimizer.weightDecay = h.l2
}

self.addEventListener('message', (e: MessageEvent<ToNNWorker>) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      init(msg.settings)
      break
    case 'update':
      applyHyper(msg.hyper)
      postSnapshot()
      break
    case 'play':
      if (!running) {
        running = true
        lastTick = performance.now()
        rateWindow = { t: lastTick, epoch: trainer?.epoch ?? 0 }
        tick()
      }
      break
    case 'pause':
      running = false
      measuredRate = 0
      postSnapshot()
      break
    case 'step':
      running = false
      trainOne()
      postSnapshot()
      break
    case 'reset':
      resets++
      buildTrainer()
      postSnapshot()
      break
    case 'speed':
      epochsPerSecond = msg.epochsPerSecond
      credit = 0
      break
  }
})
