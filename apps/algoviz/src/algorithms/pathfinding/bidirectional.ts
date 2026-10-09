import { neighbors, result, tracePath, type Grid, type SearchResult } from './grid.ts'

/**
 * Bidirectional BFS: grows one BFS ring from the start and one from the
 * target, always expanding the smaller frontier a full layer at a time.
 * Because whole layers are expanded, the first cell reached by both searches
 * lies on a shortest path (in step count).
 */
export function bidirectionalBfs(grid: Grid): SearchResult {
  const { start, target } = grid
  const size = grid.rows * grid.cols
  const nbrs = new Int32Array(4)
  const visited: number[] = [start, target]

  const side = (origin: number) => {
    const dist = new Int32Array(size).fill(-1)
    const parent = new Int32Array(size).fill(-1)
    dist[origin] = 0
    return { dist, parent, frontier: [origin] }
  }
  const fromStart = side(start)
  const fromTarget = side(target)

  while (fromStart.frontier.length > 0 && fromTarget.frontier.length > 0) {
    const [self, other] =
      fromStart.frontier.length <= fromTarget.frontier.length ? [fromStart, fromTarget] : [fromTarget, fromStart]
    const next: number[] = []
    for (const u of self.frontier) {
      const count = neighbors(grid, u, nbrs)
      for (let k = 0; k < count; k++) {
        const v = nbrs[k]
        if (self.dist[v] !== -1) continue
        self.dist[v] = self.dist[u] + 1
        self.parent[v] = u
        next.push(v)
        if (other.dist[v] !== -1) {
          // Frontiers met at v (already in `visited` from the other side):
          // stitch start → v → target.
          const head = tracePath(fromStart.parent, start, v)
          const tail = tracePath(fromTarget.parent, target, v).reverse()
          return result(grid, visited, head.concat(tail.slice(1)))
        }
        visited.push(v)
      }
    }
    self.frontier = next
  }
  return result(grid, visited, [])
}
