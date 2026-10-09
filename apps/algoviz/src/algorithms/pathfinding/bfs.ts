import { neighbors, result, tracePath, type Grid, type SearchResult } from './grid.ts'

/** Breadth-first search: explores in rings of equal step count. */
export function bfs(grid: Grid): SearchResult {
  const { start, target } = grid
  const size = grid.rows * grid.cols
  const parent = new Int32Array(size).fill(-1)
  const seen = new Uint8Array(size)
  const queue = new Int32Array(size)
  const nbrs = new Int32Array(4)
  const visited: number[] = []
  let head = 0
  let tail = 0
  queue[tail++] = start
  seen[start] = 1

  while (head < tail) {
    const u = queue[head++]
    visited.push(u)
    if (u === target) return result(grid, visited, tracePath(parent, start, target))
    const count = neighbors(grid, u, nbrs)
    for (let k = 0; k < count; k++) {
      const v = nbrs[k]
      if (seen[v]) continue
      seen[v] = 1
      parent[v] = u
      queue[tail++] = v
    }
  }
  return result(grid, visited, [])
}
