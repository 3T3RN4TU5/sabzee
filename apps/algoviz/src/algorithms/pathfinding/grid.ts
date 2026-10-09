/** Terrain codes stored per cell. */
export const OPEN = 0
export const WALL = 1
export const WEIGHT = 2
export type Terrain = typeof OPEN | typeof WALL | typeof WEIGHT

/** Cost of stepping onto a weighted cell (open cells cost 1). */
export const WEIGHT_COST = 5

/**
 * A rectangular 4-connected grid. Cells are addressed by a flat index
 * `row * cols + col`, which keeps every algorithm allocation-light.
 */
export interface Grid {
  rows: number
  cols: number
  cells: ArrayLike<number>
  start: number
  target: number
}

export interface SearchResult {
  /** Cells in the order the algorithm expanded them. */
  visitedInOrder: number[]
  /** Cells from start to target inclusive; empty when the target is unreachable. */
  path: number[]
  /** Sum of the cost of every step on the path (weights cost {@link WEIGHT_COST}). */
  cost: number
}

export const toIndex = (cols: number, row: number, col: number) => row * cols + col
export const rowOf = (cols: number, i: number) => Math.floor(i / cols)
export const colOf = (cols: number, i: number) => i % cols

/** Cost of entering cell `i`. */
export const stepCost = (grid: Grid, i: number) => (grid.cells[i] === WEIGHT ? WEIGHT_COST : 1)

/**
 * Writes the passable neighbours of `i` into `out` in N, E, S, W order and
 * returns how many were written.
 */
export function neighbors(grid: Grid, i: number, out: Int32Array): number {
  const { rows, cols, cells } = grid
  const r = rowOf(cols, i)
  const c = colOf(cols, i)
  let n = 0
  if (r > 0 && cells[i - cols] !== WALL) out[n++] = i - cols
  if (c < cols - 1 && cells[i + 1] !== WALL) out[n++] = i + 1
  if (r < rows - 1 && cells[i + cols] !== WALL) out[n++] = i + cols
  if (c > 0 && cells[i - 1] !== WALL) out[n++] = i - 1
  return n
}

/** Manhattan distance — admissible and consistent for 4-way moves costing ≥ 1. */
export function manhattan(cols: number, a: number, b: number): number {
  return Math.abs(rowOf(cols, a) - rowOf(cols, b)) + Math.abs(colOf(cols, a) - colOf(cols, b))
}

/** Walks a parent array back from `end` and returns the forward path. */
export function tracePath(parent: Int32Array, start: number, end: number): number[] {
  const path: number[] = []
  for (let at = end; at !== -1; at = at === start ? -1 : parent[at]) path.push(at)
  return path.reverse()
}

export function pathCost(grid: Grid, path: readonly number[]): number {
  let cost = 0
  for (let k = 1; k < path.length; k++) cost += stepCost(grid, path[k])
  return cost
}

export function result(grid: Grid, visitedInOrder: number[], path: number[]): SearchResult {
  return { visitedInOrder, path, cost: pathCost(grid, path) }
}
