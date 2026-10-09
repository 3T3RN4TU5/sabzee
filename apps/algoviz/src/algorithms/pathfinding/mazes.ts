import { colOf, rowOf, toIndex } from './grid.ts'

export type MazeId = 'recursive-division' | 'dfs-maze' | 'random-walls' | 'random-weights'

/**
 * A generated pattern, expressed as an ordered list of cells so it can be
 * animated:
 *   - `walls`:   start from an empty board and add walls in order
 *   - `carve`:   start from a solid board and open passages in order
 *   - `weights`: keep walls, clear old weights, add weights in order
 */
export interface MazePlan {
  kind: 'walls' | 'carve' | 'weights'
  cells: number[]
}

export interface MazeInput {
  rows: number
  cols: number
  start: number
  target: number
  /** Present for `random-weights`: cells that are currently walls. */
  isWall?: (i: number) => boolean
}

type Rng = () => number

const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))
/** Random even number in [lo, hi] (inclusive). Caller guarantees one exists. */
const randEven = (rng: Rng, lo: number, hi: number) => {
  const first = lo % 2 === 0 ? lo : lo + 1
  return first + 2 * randInt(rng, 0, Math.floor((hi - first) / 2))
}
const randOdd = (rng: Rng, lo: number, hi: number) => {
  const first = lo % 2 === 1 ? lo : lo + 1
  return first + 2 * randInt(rng, 0, Math.floor((hi - first) / 2))
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/**
 * Nearest cell with odd row and column — the "room" lattice that both maze
 * generators keep open. Mazes need start/target on rooms to stay solvable.
 */
export function snapToRoom(rows: number, cols: number, i: number): number {
  const odd = (v: number, max: number) => {
    const snapped = v % 2 === 1 ? v : v + 1 <= max ? v + 1 : v - 1
    return Math.max(1, Math.min(max, snapped))
  }
  // Largest odd index that still leaves a border row / column.
  const maxRow = rows % 2 === 1 ? rows - 2 : rows - 3
  const maxCol = cols % 2 === 1 ? cols - 2 : cols - 3
  return toIndex(cols, odd(rowOf(cols, i), maxRow), odd(colOf(cols, i), maxCol))
}

/** Classic recursive division: walls on even lines, one gap on an odd line. */
function recursiveDivision({ rows, cols, start, target }: MazeInput, rng: Rng): MazePlan {
  const cells: number[] = []
  const add = (r: number, c: number) => {
    const i = toIndex(cols, r, c)
    if (i !== start && i !== target) cells.push(i)
  }
  // Border, traced clockwise so the animation draws a frame first.
  for (let c = 0; c < cols; c++) add(0, c)
  for (let r = 1; r < rows; r++) add(r, cols - 1)
  for (let c = cols - 2; c >= 0; c--) add(rows - 1, c)
  for (let r = rows - 2; r > 0; r--) add(r, 0)

  const lastRow = rows % 2 === 1 ? rows - 2 : rows - 3
  const lastCol = cols % 2 === 1 ? cols - 2 : cols - 3
  // Even-sized boards leave one extra line next to the border; wall it off.
  for (let r = lastRow + 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) add(r, c)
  for (let c = lastCol + 1; c < cols - 1; c++) for (let r = 1; r <= lastRow; r++) add(r, c)

  const divide = (top: number, bottom: number, left: number, right: number) => {
    const width = right - left + 1
    const height = bottom - top + 1
    if (width < 3 || height < 3) return
    const horizontal = height > width ? true : width > height ? false : rng() < 0.5
    if (horizontal) {
      const wallRow = randEven(rng, top + 1, bottom - 1)
      const gap = randOdd(rng, left, right)
      for (let c = left; c <= right; c++) if (c !== gap) add(wallRow, c)
      divide(top, wallRow - 1, left, right)
      divide(wallRow + 1, bottom, left, right)
    } else {
      const wallCol = randEven(rng, left + 1, right - 1)
      const gap = randOdd(rng, top, bottom)
      for (let r = top; r <= bottom; r++) if (r !== gap) add(r, wallCol)
      divide(top, bottom, left, wallCol - 1)
      divide(top, bottom, wallCol + 1, right)
    }
  }
  divide(1, lastRow, 1, lastCol)
  return { kind: 'walls', cells }
}

/** Randomised depth-first search (recursive backtracker) → a perfect maze. */
function dfsMaze({ rows, cols, start }: MazeInput, rng: Rng): MazePlan {
  const lastRow = rows % 2 === 1 ? rows - 2 : rows - 3
  const lastCol = cols % 2 === 1 ? cols - 2 : cols - 3
  const carved = new Uint8Array(rows * cols)
  const cells: number[] = []
  const carve = (i: number) => {
    carved[i] = 1
    cells.push(i)
  }
  const origin = snapToRoom(rows, cols, start)
  const stack = [origin]
  carve(origin)
  const dirs = [
    [-2, 0],
    [0, 2],
    [2, 0],
    [0, -2],
  ]
  while (stack.length > 0) {
    const cur = stack[stack.length - 1]
    const r = rowOf(cols, cur)
    const c = colOf(cols, cur)
    const options = dirs.filter(([dr, dc]) => {
      const nr = r + dr
      const nc = c + dc
      return nr >= 1 && nr <= lastRow && nc >= 1 && nc <= lastCol && !carved[toIndex(cols, nr, nc)]
    })
    if (options.length === 0) {
      stack.pop()
      continue
    }
    const [dr, dc] = options[Math.floor(rng() * options.length)]
    carve(toIndex(cols, r + dr / 2, c + dc / 2))
    const next = toIndex(cols, r + dr, c + dc)
    carve(next)
    stack.push(next)
  }
  return { kind: 'carve', cells }
}

function scatter({ rows, cols, start, target, isWall }: MazeInput, rng: Rng, density: number, kind: 'walls' | 'weights'): MazePlan {
  const cells: number[] = []
  for (let i = 0; i < rows * cols; i++) {
    if (i === start || i === target || isWall?.(i)) continue
    if (rng() < density) cells.push(i)
  }
  return { kind, cells: shuffle(cells, rng) }
}

export function generateMaze(id: MazeId, input: MazeInput, rng: Rng): MazePlan {
  switch (id) {
    case 'recursive-division':
      return recursiveDivision(input, rng)
    case 'dfs-maze':
      return dfsMaze(input, rng)
    case 'random-walls':
      return scatter(input, rng, 0.28, 'walls')
    case 'random-weights':
      return scatter(input, rng, 0.3, 'weights')
  }
}

export const MAZES: { id: MazeId; label: string; hint: string }[] = [
  { id: 'recursive-division', label: 'Recursive division', hint: 'Splits the board with walls, leaving one gap each time' },
  { id: 'dfs-maze', label: 'Randomized DFS maze', hint: 'A perfect maze: exactly one route between any two cells' },
  { id: 'random-walls', label: 'Random walls', hint: 'Scatter walls across ~28% of the board' },
  { id: 'random-weights', label: 'Random weights', hint: 'Scatter weight-5 cells — try Dijkstra vs BFS' },
]
