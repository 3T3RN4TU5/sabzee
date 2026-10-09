import { MinHeap } from './minHeap.ts'
import { manhattan, neighbors, result, stepCost, tracePath, type Grid, type SearchResult } from './grid.ts'

type Mode = 'dijkstra' | 'astar' | 'greedy'

/**
 * Shared best-first search. The three algorithms differ only in the priority
 * of a frontier cell with path cost g and heuristic h:
 *   Dijkstra  g        (uniform-cost, optimal with weights)
 *   A*        g + h    (optimal: Manhattan never overestimates)
 *   Greedy    h        (fast but not optimal)
 * Ties are broken on h, then on insertion order, for deterministic output.
 */
function bestFirst(grid: Grid, mode: Mode): SearchResult {
  const { cols, start, target } = grid
  const size = grid.rows * cols
  const g = new Float64Array(size).fill(Infinity)
  const parent = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)
  const nbrs = new Int32Array(4)
  const visited: number[] = []
  const open = new MinHeap()

  const priority = (cost: number, h: number) => (mode === 'dijkstra' ? cost : mode === 'astar' ? cost + h : h)

  g[start] = 0
  const h0 = mode === 'dijkstra' ? 0 : manhattan(cols, start, target)
  open.push(start, priority(0, h0), h0)

  while (open.size > 0) {
    const u = open.pop()
    if (closed[u]) continue
    closed[u] = 1
    visited.push(u)
    if (u === target) return result(grid, visited, tracePath(parent, start, target))

    const count = neighbors(grid, u, nbrs)
    for (let k = 0; k < count; k++) {
      const v = nbrs[k]
      if (closed[v]) continue
      const cost = g[u] + stepCost(grid, v)
      // Greedy never revisits a discovered cell; the others relax edges.
      if (mode === 'greedy' ? g[v] !== Infinity : cost >= g[v]) continue
      g[v] = cost
      parent[v] = u
      const h = mode === 'dijkstra' ? 0 : manhattan(cols, v, target)
      open.push(v, priority(cost, h), h)
    }
  }
  return result(grid, visited, [])
}

export const dijkstra = (grid: Grid) => bestFirst(grid, 'dijkstra')
export const astar = (grid: Grid) => bestFirst(grid, 'astar')
export const greedy = (grid: Grid) => bestFirst(grid, 'greedy')
