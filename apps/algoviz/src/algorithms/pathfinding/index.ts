import { bfs } from './bfs.ts'
import { astar, dijkstra, greedy } from './bestFirst.ts'
import { bidirectionalBfs } from './bidirectional.ts'
import { dfs } from './dfs.ts'
import type { Grid, SearchResult } from './grid.ts'

export type PathId = 'dijkstra' | 'astar' | 'bfs' | 'bidirectional' | 'greedy' | 'dfs'

export interface PathAlgorithm {
  id: PathId
  name: string
  short: string
  /** Whether cell weights influence the search. */
  weighted: boolean
  /** Whether the returned path is guaranteed to be a shortest one. */
  optimal: boolean
  /** Shortest by what measure, shown next to the guarantee. */
  optimalNote: string
  complexity: string
  description: string
  run: (grid: Grid) => SearchResult
}

export const PATH_ALGORITHMS: readonly PathAlgorithm[] = [
  {
    id: 'dijkstra',
    name: "Dijkstra's algorithm",
    short: 'Dijkstra',
    weighted: true,
    optimal: true,
    optimalNote: 'lowest total cost',
    complexity: 'O((V + E) log V)',
    description:
      'Expands cells in order of their distance from the start using a priority queue. The father of pathfinding algorithms: guarantees the cheapest path when edge costs are non-negative.',
    run: dijkstra,
  },
  {
    id: 'astar',
    name: 'A* search',
    short: 'A*',
    weighted: true,
    optimal: true,
    optimalNote: 'lowest total cost',
    complexity: 'O((V + E) log V)',
    description:
      'Dijkstra plus a Manhattan-distance heuristic that pulls the search toward the target. Because the heuristic never overestimates, A* still finds the cheapest path while expanding far fewer cells.',
    run: astar,
  },
  {
    id: 'bfs',
    name: 'Breadth-first search',
    short: 'BFS',
    weighted: false,
    optimal: true,
    optimalNote: 'fewest steps',
    complexity: 'O(V + E)',
    description:
      'Explores the grid ring by ring with a FIFO queue. Guarantees the path with the fewest steps, but ignores weights — compare its cost with Dijkstra on a weighted board.',
    run: bfs,
  },
  {
    id: 'bidirectional',
    name: 'Bidirectional BFS',
    short: 'Bidirectional',
    weighted: false,
    optimal: true,
    optimalNote: 'fewest steps',
    complexity: 'O(V + E)',
    description:
      'Runs two breadth-first searches at once — one from the start, one from the target — and stops when they meet. Each search only needs to reach about half the distance, so far fewer cells are explored.',
    run: bidirectionalBfs,
  },
  {
    id: 'greedy',
    name: 'Greedy best-first search',
    short: 'Greedy',
    weighted: false,
    optimal: false,
    optimalNote: '',
    complexity: 'O((V + E) log V)',
    description:
      'Always expands the cell that looks closest to the target by Manhattan distance, ignoring the cost so far. Often very fast, but easily lured into dead ends and long detours.',
    run: greedy,
  },
  {
    id: 'dfs',
    name: 'Depth-first search',
    short: 'DFS',
    weighted: false,
    optimal: false,
    optimalNote: '',
    complexity: 'O(V + E)',
    description:
      'Follows one direction as deep as possible (north, east, south, west) before backtracking. Finds a path if one exists, but typically a long, winding one — a great illustration of why DFS is not a shortest-path algorithm.',
    run: dfs,
  },
]

export function getPathAlgorithm(id: PathId): PathAlgorithm {
  const algorithm = PATH_ALGORITHMS.find((a) => a.id === id)
  if (!algorithm) throw new Error(`Unknown pathfinding algorithm: ${id}`)
  return algorithm
}
