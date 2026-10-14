/**
 * Synthetic 2-D datasets (points live in roughly [-1, 1]²), a 1-D regression
 * task for the bias–variance demo, train/test splitting and the loader for
 * the bundled real datasets.
 */
import { fromRows, takeRows, type Matrix } from './linalg.ts'
import { permutation, randn, seededRng, type Rng } from './rng.ts'

export interface Dataset {
  X: Matrix
  y: Int32Array
  numClasses: number
}

export type Dataset2DName = 'circles' | 'xor' | 'blobs' | 'spiral' | 'moons' | 'linear'

export const DATASET_2D: { id: Dataset2DName; label: string }[] = [
  { id: 'circles', label: 'Circles' },
  { id: 'xor', label: 'XOR' },
  { id: 'blobs', label: 'Gaussian blobs' },
  { id: 'spiral', label: 'Spiral' },
  { id: 'moons', label: 'Moons' },
  { id: 'linear', label: 'Linear' },
]

export interface Gen2DOptions {
  n: number
  /** 0 … 1; scales the Gaussian jitter added to every point. */
  noise: number
  seed: number
  /** Number of classes for blobs / spiral (2 … 5). */
  classes?: number
}

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v))
}

export function make2D(name: Dataset2DName, opts: Gen2DOptions): Dataset {
  const rng = seededRng(opts.seed)
  const { n } = opts
  const sigma = opts.noise * 0.22
  const jitter = () => randn(rng) * sigma
  const rows: number[][] = []
  const labels: number[] = []
  const push = (x: number, y: number, c: number) => {
    rows.push([clampUnit(x), clampUnit(y)])
    labels.push(c)
  }
  let numClasses = 2

  switch (name) {
    case 'circles': {
      for (let i = 0; i < n; i++) {
        const c = i % 2
        const r = c === 0 ? rng() * 0.38 : 0.62 + rng() * 0.3
        const a = rng() * 2 * Math.PI
        push(r * Math.cos(a) + jitter(), r * Math.sin(a) + jitter(), c)
      }
      break
    }
    case 'xor': {
      for (let i = 0; i < n; i++) {
        const pad = 0.05
        let x = rng() * 1.9 - 0.95
        let y = rng() * 1.9 - 0.95
        x += x > 0 ? pad : -pad
        y += y > 0 ? pad : -pad
        push(x + jitter(), y + jitter(), x * y >= 0 ? 0 : 1)
      }
      break
    }
    case 'blobs': {
      numClasses = Math.max(2, Math.min(5, opts.classes ?? 3))
      for (let i = 0; i < n; i++) {
        const c = i % numClasses
        const a = (2 * Math.PI * c) / numClasses + Math.PI / 4
        const s = 0.14 + sigma
        push(0.55 * Math.cos(a) + randn(rng) * s, 0.55 * Math.sin(a) + randn(rng) * s, c)
      }
      break
    }
    case 'spiral': {
      numClasses = Math.max(2, Math.min(5, opts.classes ?? 2))
      for (let i = 0; i < n; i++) {
        const c = i % numClasses
        const t = Math.floor(i / numClasses) / Math.ceil(n / numClasses)
        const r = 0.08 + t * 0.85
        const a = 1.75 * t * 2 * Math.PI + (2 * Math.PI * c) / numClasses
        push(r * Math.sin(a) + jitter() * 0.6, r * Math.cos(a) + jitter() * 0.6, c)
      }
      break
    }
    case 'moons': {
      for (let i = 0; i < n; i++) {
        const c = i % 2
        const t = rng() * Math.PI
        const x = c === 0 ? Math.cos(t) : 1 - Math.cos(t)
        const y = c === 0 ? Math.sin(t) : 0.5 - Math.sin(t)
        // Map sklearn's moons box [-1,2]×[-0.5,1] into [-0.9,0.9]².
        push((x - 0.5) * 0.6 + jitter(), (y - 0.25) * 1.2 + jitter(), c)
      }
      break
    }
    case 'linear': {
      const w = [Math.cos(0.6), Math.sin(0.6)]
      for (let i = 0; i < n; i++) {
        let x = 0
        let y = 0
        let m = 0
        do {
          x = rng() * 1.9 - 0.95
          y = rng() * 1.9 - 0.95
          m = w[0] * x - w[1] * y
        } while (Math.abs(m) < 0.12)
        push(x + jitter(), y + jitter(), m > 0 ? 1 : 0)
      }
      break
    }
  }
  return { X: fromRows(rows), y: Int32Array.from(labels), numClasses }
}

/** Shuffle and split into train / test (stratification not needed for these sizes). */
export function trainTestSplit(ds: Dataset, trainRatio: number, rng: Rng): { train: Dataset; test: Dataset } {
  const n = ds.X.rows
  const perm = permutation(n, rng)
  const nTrain = Math.max(1, Math.min(n - 1, Math.round(n * trainRatio)))
  const tr = perm.subarray(0, nTrain)
  const te = perm.subarray(nTrain)
  const pick = (idx: Int32Array): Dataset => ({
    X: takeRows(ds.X, idx),
    y: Int32Array.from(idx, (i) => ds.y[i]),
    numClasses: ds.numClasses,
  })
  return { train: pick(tr), test: pick(te) }
}

// ─── 1-D regression (bias–variance) ─────────────────────────────────────────

export function trueRegressionFn(x: number): number {
  return 0.7 * Math.sin(Math.PI * x) + 0.25 * x
}

export function makeRegression1D(n: number, noise: number, seed: number): { x: Float64Array; y: Float64Array } {
  const rng = seededRng(seed)
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    x[i] = rng() * 2 - 1
    y[i] = trueRegressionFn(x[i]) + randn(rng) * noise
  }
  return { x, y }
}

// ─── Bundled real datasets ─────────────────────────────────────────────────

export interface RealDatasetJson {
  name: string
  featureNames: string[]
  classNames: string[]
  X: number[][]
  y: number[]
}

export interface RealDataset extends Dataset {
  name: string
  featureNames: string[]
  classNames: string[]
}

export function fromJson(json: RealDatasetJson): RealDataset {
  return {
    name: json.name,
    featureNames: json.featureNames,
    classNames: json.classNames,
    X: fromRows(json.X),
    y: Int32Array.from(json.y),
    numClasses: json.classNames.length,
  }
}
