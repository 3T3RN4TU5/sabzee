/**
 * k-nearest neighbours backed by a k-d tree (median splits, cycling axes),
 * plus a brute-force search used to verify it.
 */
import { sqDist, type Matrix } from '../linalg.ts'
import type { Classifier } from './types.ts'

interface KdNode {
  /** Index of the point stored at this node. */
  point: number
  axis: number
  left: KdNode | null
  right: KdNode | null
}

export class KDTree {
  readonly X: Matrix
  readonly root: KdNode | null

  constructor(X: Matrix) {
    this.X = X
    const idx = Array.from({ length: X.rows }, (_, i) => i)
    this.root = this.build(idx, 0)
  }

  private build(idx: number[], depth: number): KdNode | null {
    if (idx.length === 0) return null
    const axis = depth % this.X.cols
    const d = this.X.cols
    idx.sort((a, b) => this.X.data[a * d + axis] - this.X.data[b * d + axis])
    const mid = idx.length >> 1
    return {
      point: idx[mid],
      axis,
      left: this.build(idx.slice(0, mid), depth + 1),
      right: this.build(idx.slice(mid + 1), depth + 1),
    }
  }

  /**
   * Indices and squared distances of the k nearest points to `q`, nearest
   * first. Branches are pruned when the splitting plane is further away than
   * the current k-th best distance.
   */
  query(q: ArrayLike<number>, k: number): { idx: number[]; dist2: number[] } {
    const d = this.X.cols
    const best: { i: number; d2: number }[] = []
    const visit = (node: KdNode | null) => {
      if (!node) return
      const d2 = sqDist(this.X.data, node.point * d, q, 0, d)
      if (best.length < k || d2 < best[best.length - 1].d2) {
        // Keep `best` sorted ascending (k is small, insertion is cheapest).
        let pos = best.length
        while (pos > 0 && best[pos - 1].d2 > d2) pos--
        best.splice(pos, 0, { i: node.point, d2 })
        if (best.length > k) best.pop()
      }
      const diff = q[node.axis] - this.X.data[node.point * d + node.axis]
      const near = diff < 0 ? node.left : node.right
      const far = diff < 0 ? node.right : node.left
      visit(near)
      if (best.length < k || diff * diff < best[best.length - 1].d2) visit(far)
    }
    visit(this.root)
    return { idx: best.map((b) => b.i), dist2: best.map((b) => b.d2) }
  }
}

export function bruteForceKnn(X: Matrix, q: ArrayLike<number>, k: number): { idx: number[]; dist2: number[] } {
  const d = X.cols
  const all = Array.from({ length: X.rows }, (_, i) => ({ i, d2: sqDist(X.data, i * d, q, 0, d) }))
  all.sort((a, b) => a.d2 - b.d2)
  const top = all.slice(0, k)
  return { idx: top.map((b) => b.i), dist2: top.map((b) => b.d2) }
}

export class KNNClassifier implements Classifier {
  numClasses = 2
  readonly k: number
  readonly weighted: boolean
  private tree: KDTree | null = null
  private y: Int32Array<ArrayBufferLike> = new Int32Array(0)

  constructor(k = 5, weighted = false) {
    this.k = k
    this.weighted = weighted
  }

  fit(X: Matrix, y: Int32Array, numClasses: number): void {
    this.numClasses = numClasses
    this.tree = new KDTree(X)
    this.y = y
  }

  /** Vote share per class (inverse-distance weighted if enabled). */
  predictProba(X: Matrix): Float64Array {
    const kc = this.numClasses
    const out = new Float64Array(X.rows * kc)
    if (!this.tree) return out
    const k = Math.min(this.k, this.y.length)
    for (let i = 0; i < X.rows; i++) {
      const { idx, dist2 } = this.tree.query(X.data.subarray(i * X.cols, (i + 1) * X.cols), k)
      let total = 0
      for (let j = 0; j < idx.length; j++) {
        const w = this.weighted ? 1 / (Math.sqrt(dist2[j]) + 1e-9) : 1
        out[i * kc + this.y[idx[j]]] += w
        total += w
      }
      for (let c = 0; c < kc; c++) out[i * kc + c] /= total || 1
    }
    return out
  }
}
