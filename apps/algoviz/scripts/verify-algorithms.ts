/**
 * Correctness checks for every algorithm in src/algorithms. Run with
 * `npm test` (Node ≥ 22.18 strips the TypeScript types natively).
 *
 * Sorting: every algorithm must sort random, sorted, reversed and
 * duplicate-heavy arrays of many sizes, and its recorded steps must replay to
 * the same result with every slot marked as sorted.
 *
 * Pathfinding: on random grids, all optimal unweighted searches must agree on
 * path length, Dijkstra and A* must agree on weighted cost, every path must be
 * a valid walk, and the maze generators must leave the board connected.
 */
import { SORT_ALGORITHMS } from '../src/algorithms/sorting/index.ts'
import { generateInput, seededRng, type InputPreset } from '../src/algorithms/sorting/inputs.ts'
import { SortTimeline } from '../src/algorithms/sorting/timeline.ts'
import { PATH_ALGORITHMS, getPathAlgorithm } from '../src/algorithms/pathfinding/index.ts'
import { OPEN, WALL, WEIGHT, manhattan, pathCost, type Grid, type SearchResult } from '../src/algorithms/pathfinding/grid.ts'
import { generateMaze, snapToRoom, type MazeId } from '../src/algorithms/pathfinding/mazes.ts'

const failures: string[] = []
let checks = 0
function expect(condition: boolean, message: string): void {
  checks++
  if (!condition) failures.push(message)
}

// ─── Sorting ────────────────────────────────────────────────────────────────

const SIZES = [0, 1, 2, 3, 5, 8, 13, 32, 64, 150]
const PRESETS: InputPreset[] = ['random', 'nearly-sorted', 'reversed', 'few-unique']

function sortingCases(): { label: string; input: number[] }[] {
  const cases: { label: string; input: number[] }[] = []
  for (const n of SIZES) {
    for (const preset of PRESETS) {
      for (let seed = 1; seed <= 3; seed++) {
        cases.push({ label: `${preset} n=${n} seed=${seed}`, input: generateInput(preset, n, seededRng(seed * 7919 + n)) })
      }
    }
    const sorted = generateInput('reversed', n, seededRng(n)).reverse()
    cases.push({ label: `already sorted n=${n}`, input: sorted })
    cases.push({ label: `all equal n=${n}`, input: Array.from({ length: n }, () => 42) })
    const rng = seededRng(1000 + n)
    cases.push({ label: `duplicates (0-2) n=${n}`, input: Array.from({ length: n }, () => Math.floor(rng() * 3)) })
  }
  return cases
}

const cases = sortingCases()
for (const algorithm of SORT_ALGORITHMS) {
  for (const { label, input } of cases) {
    const where = `${algorithm.name} · ${label}`
    const frozen = input.slice()
    const { steps, output } = algorithm.run(input)
    const expected = input.slice().sort((a, b) => a - b)
    expect(JSON.stringify(input) === JSON.stringify(frozen), `${where}: mutated its input`)
    expect(JSON.stringify(output) === JSON.stringify(expected), `${where}: output is not sorted`)

    const n = input.length
    const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < n
    const badStep = steps.find((s) => {
      if (s.line < -1 || s.line >= algorithm.pseudocode.length) return true
      switch (s.type) {
        case 'compare':
        case 'swap':
          return !inRange(s.i) || !inRange(s.j)
        case 'overwrite':
          return !inRange(s.i)
        case 'pivot':
          return s.i !== -1 && !inRange(s.i)
        case 'sorted':
          return !inRange(s.from) || !inRange(s.to) || s.from > s.to
      }
    })
    expect(badStep === undefined, `${where}: invalid step ${JSON.stringify(badStep)}`)

    // Each step must highlight a pseudocode line that actually does that operation.
    const LINE_SHAPE = { compare: /[<>≤≥]/, swap: /swap/, overwrite: /←/ } as const
    const mislabelled = steps.find((s) => {
      if (s.line === -1 || !(s.type in LINE_SHAPE)) return false
      return !LINE_SHAPE[s.type as keyof typeof LINE_SHAPE].test(algorithm.pseudocode[s.line])
    })
    expect(mislabelled === undefined, `${where}: step ${JSON.stringify(mislabelled)} points at "${mislabelled ? algorithm.pseudocode[mislabelled.line] : ''}"`)

    const timeline = new SortTimeline(input, steps)
    const last = timeline.frameAt(timeline.length)
    expect(JSON.stringify(last.values) === JSON.stringify(expected), `${where}: replaying steps does not sort`)
    expect(last.sorted.every((f) => f === 1), `${where}: not every slot is marked sorted at the end`)
    if (n >= 2) expect(last.comparisons > 0, `${where}: recorded no comparisons`)

    // Random access must agree with sequential replay.
    const probe = Math.floor(timeline.length / 2)
    const viaSeek = timeline.frameAt(probe)
    timeline.frameAt(timeline.length)
    const again = timeline.frameAt(probe)
    expect(JSON.stringify(viaSeek.values) === JSON.stringify(again.values), `${where}: seeking is not deterministic`)
    expect(timeline.indexForCost(timeline.totalCost) === timeline.length, `${where}: indexForCost does not reach the end`)
  }
}

// ─── Pathfinding ────────────────────────────────────────────────────────────

const pathAlgorithms = PATH_ALGORITHMS
const isAdjacent = (cols: number, a: number, b: number) => manhattan(cols, a, b) === 1

function validatePath(grid: Grid, res: SearchResult, where: string): void {
  if (res.path.length === 0) return
  expect(res.path[0] === grid.start, `${where}: path does not begin at start`)
  expect(res.path[res.path.length - 1] === grid.target, `${where}: path does not end at target`)
  for (let k = 0; k < res.path.length; k++) {
    const cell = res.path[k]
    expect(grid.cells[cell] !== WALL, `${where}: path crosses a wall at ${cell}`)
    if (k > 0) expect(isAdjacent(grid.cols, res.path[k - 1], cell), `${where}: path jumps between ${res.path[k - 1]} and ${cell}`)
  }
  expect(new Set(res.path).size === res.path.length, `${where}: path revisits a cell`)
  expect(res.cost === pathCost(grid, res.path), `${where}: reported cost ${res.cost} differs from path cost`)
  expect(new Set(res.visitedInOrder).size === res.visitedInOrder.length, `${where}: a cell was visited twice`)
}

function randomGrid(rows: number, cols: number, wallDensity: number, weightDensity: number, seed: number): Grid {
  const rng = seededRng(seed)
  const cells = new Uint8Array(rows * cols)
  for (let i = 0; i < cells.length; i++) {
    const roll = rng()
    cells[i] = roll < wallDensity ? WALL : roll < wallDensity + weightDensity ? WEIGHT : OPEN
  }
  const start = Math.floor(rng() * cells.length)
  let target = Math.floor(rng() * cells.length)
  if (target === start) target = (start + 1) % cells.length
  cells[start] = OPEN
  cells[target] = OPEN
  return { rows, cols, cells, start, target }
}

let reachable = 0
let unreachable = 0
for (let seed = 1; seed <= 400; seed++) {
  const rows = 5 + (seed % 17)
  const cols = 5 + ((seed * 7) % 41)
  const weighted = seed % 2 === 0
  const grid = randomGrid(rows, cols, 0.12 + (seed % 5) * 0.06, weighted ? 0.25 : 0, seed)
  const results = Object.fromEntries(pathAlgorithms.map((a) => [a.id, a.run(grid)])) as Record<string, SearchResult>
  const where = `grid seed=${seed} ${rows}x${cols}${weighted ? ' weighted' : ''}`
  for (const a of pathAlgorithms) validatePath(grid, results[a.id], `${a.short} · ${where}`)

  const found = results.bfs.path.length > 0
  if (found) reachable++
  else unreachable++
  for (const a of pathAlgorithms) {
    expect((results[a.id].path.length > 0) === found, `${a.short} · ${where}: disagrees with BFS on reachability`)
  }
  if (!found) continue

  // Unweighted optimality: BFS, bidirectional BFS agree on steps; with no
  // weights, Dijkstra and A* must match too.
  expect(results.bidirectional.path.length === results.bfs.path.length, `${where}: bidirectional BFS length ${results.bidirectional.path.length} ≠ BFS ${results.bfs.path.length}`)
  if (!weighted) {
    expect(results.dijkstra.path.length === results.bfs.path.length, `${where}: Dijkstra length ≠ BFS`)
    expect(results.astar.path.length === results.bfs.path.length, `${where}: A* length ≠ BFS`)
  }
  // Weighted optimality: Dijkstra and A* agree on cost and nothing beats them.
  expect(results.astar.cost === results.dijkstra.cost, `${where}: A* cost ${results.astar.cost} ≠ Dijkstra ${results.dijkstra.cost}`)
  for (const a of pathAlgorithms) {
    expect(results[a.id].cost >= results.dijkstra.cost, `${a.short} · ${where}: beat Dijkstra's optimal cost`)
    expect(results[a.id].path.length >= results.bfs.path.length, `${a.short} · ${where}: shorter than BFS`)
  }
}
expect(reachable > 50 && unreachable > 10, `random grids should cover both reachable (${reachable}) and unreachable (${unreachable}) cases`)

// ─── Mazes ──────────────────────────────────────────────────────────────────

function applyPlan(rows: number, cols: number, id: MazeId, seed: number): Grid {
  let start = snapToRoom(rows, cols, Math.floor(rows / 2) * cols + Math.floor(cols / 4))
  let target = snapToRoom(rows, cols, Math.floor(rows / 2) * cols + Math.floor((3 * cols) / 4))
  if (target === start) target = snapToRoom(rows, cols, start + 2)
  const cells = new Uint8Array(rows * cols)
  const plan = generateMaze(id, { rows, cols, start, target, isWall: (i) => cells[i] === WALL }, seededRng(seed))
  if (plan.kind === 'carve') cells.fill(WALL)
  for (const i of plan.cells) cells[i] = plan.kind === 'walls' ? WALL : plan.kind === 'carve' ? OPEN : WEIGHT
  expect(cells[start] !== WALL && cells[target] !== WALL, `${id} ${rows}x${cols}: start/target walled in`)
  return { rows, cols, cells, start, target }
}

function openCellsConnected(grid: Grid): boolean {
  const open: number[] = []
  for (let i = 0; i < grid.cells.length; i++) if (grid.cells[i] !== WALL) open.push(i)
  const seen = getPathAlgorithm('bfs').run({ ...grid, target: -1 }).visitedInOrder
  return seen.length === open.length
}

for (const [rows, cols] of [
  [21, 51],
  [21, 15],
  [13, 31],
  [20, 40],
  [7, 7],
]) {
  for (let seed = 1; seed <= 25; seed++) {
    for (const id of ['recursive-division', 'dfs-maze'] as const) {
      const grid = applyPlan(rows, cols, id, seed)
      expect(openCellsConnected(grid), `${id} ${rows}x${cols} seed=${seed}: open cells are not all connected`)
      expect(getPathAlgorithm('bfs').run(grid).path.length > 0, `${id} ${rows}x${cols} seed=${seed}: unsolvable`)
    }
    // A perfect maze is a spanning tree: open cells = edges + 1 on the room lattice.
    const maze = applyPlan(rows, cols, 'dfs-maze', seed)
    const rooms = Math.floor((rows - 1) / 2) * Math.floor((cols - 1) / 2)
    const open = Array.from(maze.cells).filter((c) => c !== WALL).length
    expect(open === 2 * rooms - 1, `dfs-maze ${rows}x${cols} seed=${seed}: not a perfect maze (${open} open cells, ${rooms} rooms)`)
    const walls = applyPlan(rows, cols, 'random-walls', seed)
    expect(walls.cells[walls.start] === OPEN && walls.cells[walls.target] === OPEN, `random-walls seed=${seed}: covered start/target`)
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ ${failures.length} of ${checks} checks failed:`)
  for (const f of failures.slice(0, 25)) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ ${checks.toLocaleString('en-US')} checks passed`)
console.log(`  sorting:     ${SORT_ALGORITHMS.length} algorithms × ${cases.length} inputs`)
console.log(`  pathfinding: ${pathAlgorithms.length} algorithms × 400 random grids (${reachable} solvable, ${unreachable} blocked)`)
console.log('  mazes:       recursive division, DFS maze and random walls on 5 board sizes')
