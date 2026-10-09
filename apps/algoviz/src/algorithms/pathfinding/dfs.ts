import { neighbors, result, tracePath, type Grid, type SearchResult } from './grid.ts'

/**
 * Iterative depth-first search. Neighbours are pushed in reverse so they are
 * explored in N, E, S, W order, giving DFS its characteristic winding path.
 */
export function dfs(grid: Grid): SearchResult {
  const { start, target } = grid
  const size = grid.rows * grid.cols
  const parent = new Int32Array(size).fill(-1)
  const done = new Uint8Array(size)
  const nbrs = new Int32Array(4)
  const stack: number[] = [start]
  const from: number[] = [-1]
  const visited: number[] = []

  while (stack.length > 0) {
    const u = stack.pop()!
    const p = from.pop()!
    if (done[u]) continue
    done[u] = 1
    parent[u] = p
    visited.push(u)
    if (u === target) return result(grid, visited, tracePath(parent, start, target))
    const count = neighbors(grid, u, nbrs)
    for (let k = count - 1; k >= 0; k--) {
      if (done[nbrs[k]]) continue
      stack.push(nbrs[k])
      from.push(u)
    }
  }
  return result(grid, visited, [])
}
