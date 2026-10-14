/**
 * CART decision trees (Gini or entropy impurity, exhaustive threshold search)
 * and random forests (bootstrap samples + random feature subsets per split).
 */
import type { Matrix } from '../linalg.ts'
import { seededRng, type Rng } from '../rng.ts'
import type { Classifier } from './types.ts'

export type Criterion = 'gini' | 'entropy'

export interface TreeOptions {
  maxDepth?: number
  minSamplesSplit?: number
  minSamplesLeaf?: number
  criterion?: Criterion
  /** Features considered per split (random forests); default all. */
  maxFeatures?: number
  seed?: number
}

export interface TreeNode {
  /** Class distribution of the training samples that reached this node. */
  proba: Float64Array
  samples: number
  impurity: number
  feature: number
  threshold: number
  left: TreeNode | null
  right: TreeNode | null
}

export function impurity(counts: ArrayLike<number>, total: number, criterion: Criterion): number {
  if (total === 0) return 0
  let v = criterion === 'gini' ? 1 : 0
  for (let c = 0; c < counts.length; c++) {
    const p = counts[c] / total
    if (p === 0) continue
    if (criterion === 'gini') v -= p * p
    else v -= p * Math.log2(p)
  }
  return v
}

export class DecisionTree implements Classifier {
  numClasses = 2
  root: TreeNode | null = null
  readonly opts: Required<Omit<TreeOptions, 'maxFeatures'>> & { maxFeatures: number | null }
  private rng: Rng

  constructor(opts: TreeOptions = {}) {
    this.opts = {
      maxDepth: opts.maxDepth ?? Infinity,
      minSamplesSplit: opts.minSamplesSplit ?? 2,
      minSamplesLeaf: opts.minSamplesLeaf ?? 1,
      criterion: opts.criterion ?? 'gini',
      maxFeatures: opts.maxFeatures ?? null,
      seed: opts.seed ?? 1,
    }
    this.rng = seededRng(this.opts.seed)
  }

  fit(X: Matrix, y: Int32Array, numClasses: number, sampleIdx?: Int32Array): void {
    this.numClasses = numClasses
    const idx = sampleIdx ? Array.from(sampleIdx) : Array.from({ length: X.rows }, (_, i) => i)
    this.root = this.grow(X, y, idx, 0)
  }

  private grow(X: Matrix, y: Int32Array, idx: number[], depth: number): TreeNode {
    const k = this.numClasses
    const counts = new Float64Array(k)
    for (const i of idx) counts[y[i]]++
    const n = idx.length
    const node: TreeNode = {
      proba: counts.map((c) => c / n),
      samples: n,
      impurity: impurity(counts, n, this.opts.criterion),
      feature: -1,
      threshold: 0,
      left: null,
      right: null,
    }
    if (node.impurity === 0 || depth >= this.opts.maxDepth || n < this.opts.minSamplesSplit) return node

    const split = this.bestSplit(X, y, idx, counts, node.impurity)
    if (!split) return node
    const left: number[] = []
    const right: number[] = []
    for (const i of idx) (X.data[i * X.cols + split.feature] <= split.threshold ? left : right).push(i)
    node.feature = split.feature
    node.threshold = split.threshold
    node.left = this.grow(X, y, left, depth + 1)
    node.right = this.grow(X, y, right, depth + 1)
    return node
  }

  /** Exhaustive search: sort by each feature and sweep class counts left→right. */
  private bestSplit(X: Matrix, y: Int32Array, idx: number[], counts: Float64Array, parentImpurity: number) {
    const d = X.cols
    const k = this.numClasses
    const n = idx.length
    let features = Array.from({ length: d }, (_, j) => j)
    if (this.opts.maxFeatures !== null && this.opts.maxFeatures < d) {
      for (let i = d - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1))
        ;[features[i], features[j]] = [features[j], features[i]]
      }
      features = features.slice(0, this.opts.maxFeatures)
    }
    let best: { feature: number; threshold: number; gain: number } | null = null
    const leftCounts = new Float64Array(k)
    const rightCounts = new Float64Array(k)
    const minLeaf = this.opts.minSamplesLeaf
    for (const f of features) {
      const sorted = idx.slice().sort((a, b) => X.data[a * d + f] - X.data[b * d + f])
      leftCounts.fill(0)
      rightCounts.set(counts)
      for (let s = 0; s < n - 1; s++) {
        const c = y[sorted[s]]
        leftCounts[c]++
        rightCounts[c]--
        const v = X.data[sorted[s] * d + f]
        const next = X.data[sorted[s + 1] * d + f]
        if (v === next) continue
        const nl = s + 1
        const nr = n - nl
        if (nl < minLeaf || nr < minLeaf) continue
        const child = (nl * impurity(leftCounts, nl, this.opts.criterion) + nr * impurity(rightCounts, nr, this.opts.criterion)) / n
        const gain = parentImpurity - child
        if (!best || gain > best.gain + 1e-12) best = { feature: f, threshold: (v + next) / 2, gain }
      }
    }
    return best
  }

  private leaf(x: ArrayLike<number>, offset: number): TreeNode {
    let node = this.root!
    while (node.left && node.right) node = x[offset + node.feature] <= node.threshold ? node.left : node.right
    return node
  }

  predictProba(X: Matrix): Float64Array {
    const k = this.numClasses
    const out = new Float64Array(X.rows * k)
    if (!this.root) return out
    for (let i = 0; i < X.rows; i++) out.set(this.leaf(X.data, i * X.cols).proba, i * k)
    return out
  }

  depth(node = this.root): number {
    if (!node || !node.left || !node.right) return 0
    return 1 + Math.max(this.depth(node.left), this.depth(node.right))
  }

  leaves(node = this.root): number {
    if (!node) return 0
    if (!node.left || !node.right) return 1
    return this.leaves(node.left) + this.leaves(node.right)
  }
}

export interface ForestOptions extends TreeOptions {
  nTrees?: number
  bootstrap?: boolean
}

export class RandomForest implements Classifier {
  numClasses = 2
  trees: DecisionTree[] = []
  readonly opts: ForestOptions

  constructor(opts: ForestOptions = {}) {
    this.opts = opts
  }

  fit(X: Matrix, y: Int32Array, numClasses: number): void {
    this.numClasses = numClasses
    const rng = seededRng(this.opts.seed ?? 1)
    const nTrees = this.opts.nTrees ?? 50
    const maxFeatures = this.opts.maxFeatures ?? Math.max(1, Math.round(Math.sqrt(X.cols)))
    this.trees = []
    for (let t = 0; t < nTrees; t++) {
      const tree = new DecisionTree({ ...this.opts, maxFeatures, seed: Math.floor(rng() * 2 ** 31) })
      let sample: Int32Array | undefined
      if (this.opts.bootstrap ?? true) {
        sample = new Int32Array(X.rows)
        for (let i = 0; i < X.rows; i++) sample[i] = Math.floor(rng() * X.rows)
      }
      tree.fit(X, y, numClasses, sample)
      this.trees.push(tree)
    }
  }

  /** Average of the trees' leaf class distributions (soft voting). */
  predictProba(X: Matrix): Float64Array {
    const out = new Float64Array(X.rows * this.numClasses)
    for (const tree of this.trees) {
      const p = tree.predictProba(X)
      for (let i = 0; i < out.length; i++) out[i] += p[i]
    }
    for (let i = 0; i < out.length; i++) out[i] /= this.trees.length || 1
    return out
  }
}
