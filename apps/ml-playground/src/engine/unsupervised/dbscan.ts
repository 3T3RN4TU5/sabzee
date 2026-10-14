/**
 * DBSCAN (Ester et al., 1996): a point is a core point if at least `minPts`
 * points (itself included) lie within `eps`. Clusters are the connected
 * components of core points plus the border points they reach; everything
 * else is noise (label −1).
 */
import { sqDist, type Matrix } from '../linalg.ts'

export interface DbscanResult {
  labels: Int32Array
  core: Uint8Array
  numClusters: number
}

export function dbscan(X: Matrix, eps: number, minPts: number): DbscanResult {
  const n = X.rows
  const d = X.cols
  const eps2 = eps * eps
  // Neighbourhoods (O(n²) is fine for the interactive sizes used here).
  const neighbours: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (sqDist(X.data, i * d, X.data, j * d, d) <= eps2) {
        neighbours[i].push(j)
        if (j !== i) neighbours[j].push(i)
      }
    }
  }
  const core = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (neighbours[i].length >= minPts) core[i] = 1
  const labels = new Int32Array(n).fill(-1)
  let cluster = 0
  for (let i = 0; i < n; i++) {
    if (!core[i] || labels[i] !== -1) continue
    // Breadth-first expansion through density-reachable points.
    labels[i] = cluster
    const queue = [i]
    for (let q = 0; q < queue.length; q++) {
      const p = queue[q]
      if (!core[p]) continue
      for (const nb of neighbours[p]) {
        if (labels[nb] === -1) {
          labels[nb] = cluster
          queue.push(nb)
        }
      }
    }
    cluster++
  }
  return { labels, core, numClusters: cluster }
}
