import { OPEN, WALL, WEIGHT, colOf, rowOf, toIndex, type Grid, type SearchResult } from '../../algorithms/pathfinding/grid.ts'
import { getPathAlgorithm, type PathId } from '../../algorithms/pathfinding/index.ts'
import { generateMaze, snapToRoom, type MazeId, type MazePlan } from '../../algorithms/pathfinding/mazes.ts'
import { STORAGE_KEYS, isRecord, readStorage, writeStorage } from '../../lib/storage.ts'

export type BoardStatus = 'idle' | 'searching' | 'tracing' | 'generating' | 'done'
export type Brush = 'wall' | 'weight'

export interface SearchStats {
  algorithm: PathId
  visited: number
  found: boolean
  /** Number of moves on the path. */
  pathLength: number
  cost: number
  timeMs: number
}

export interface BoardSnapshot {
  rows: number
  cols: number
  status: BoardStatus
  /** Cells revealed so far by the running animation. */
  revealed: number
  stats: SearchStats | null
}

export interface BoardSettings {
  algorithm: PathId
  /** Index into {@link SPEED_LEVELS}. */
  speed: number
  brush: Brush
  reducedMotion: boolean
}

/** Cells per second for each animation phase. */
export const SPEED_LEVELS = [
  { label: 'Slow', visit: 25, path: 12, maze: 150, visitMs: 1100 },
  { label: 'Medium', visit: 70, path: 25, maze: 300, visitMs: 1000 },
  { label: 'Fast', visit: 180, path: 45, maze: 600, visitMs: 850 },
  { label: 'Very fast', visit: 500, path: 90, maze: 1200, visitMs: 650 },
  { label: 'Turbo', visit: 2000, path: 300, maze: 5000, visitMs: 450 },
] as const

const NONE = 0
const VISITED = 1
const PATH = 2

type Animation =
  | { kind: 'search'; result: SearchResult; stats: SearchStats; visit: number; path: number; budget: number; last: number }
  | { kind: 'maze'; plan: MazePlan; index: number; budget: number; last: number }

type Drag =
  | { mode: 'start' | 'target'; last: number }
  | { mode: 'paint'; terrain: number; last: number }

interface SavedGrid {
  rows: number
  cols: number
  cells: Uint8Array
  start: number
  target: number
}

function loadSavedGrid(): SavedGrid | null {
  return readStorage(STORAGE_KEYS.grid, (raw) => {
    if (!isRecord(raw)) return null
    const { rows, cols, cells, start, target } = raw
    if (typeof rows !== 'number' || typeof cols !== 'number' || typeof cells !== 'string') return null
    if (typeof start !== 'number' || typeof target !== 'number') return null
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 3 || cols < 3 || cells.length !== rows * cols) return null
    if (!/^[012]*$/.test(cells)) return null
    const size = rows * cols
    if (start < 0 || start >= size || target < 0 || target >= size || start === target) return null
    return { rows, cols, cells: Uint8Array.from(cells, (ch) => Number(ch)), start, target }
  })
}

/** Cells on the straight line between two cells (Bresenham), excluding `from`. */
function* lineBetween(cols: number, from: number, to: number): Generator<number> {
  let r = rowOf(cols, from)
  let c = colOf(cols, from)
  const r1 = rowOf(cols, to)
  const c1 = colOf(cols, to)
  const dr = Math.abs(r1 - r)
  const dc = Math.abs(c1 - c)
  const sr = r < r1 ? 1 : -1
  const sc = c < c1 ? 1 : -1
  let err = dc - dr
  while (r !== r1 || c !== c1) {
    const e2 = 2 * err
    if (e2 > -dr) {
      err -= dr
      c += sc
    }
    if (e2 < dc) {
      err += dc
      r += sr
    }
    yield toIndex(cols, r, c)
  }
}

/**
 * Owns the pathfinding grid outside React. Cells are painted by writing
 * `className` directly (and only when it changes), animations run on
 * requestAnimationFrame, and React subscribes to a small snapshot through
 * useSyncExternalStore — so a full-size grid never re-renders as a React tree.
 */
export class Board {
  private rows = 0
  private cols = 0
  private cells = new Uint8Array(0)
  private overlay = new Uint8Array(0)
  private start = -1
  private target = -1

  private settings: BoardSettings = { algorithm: 'dijkstra', speed: 2, brush: 'wall', reducedMotion: false }

  private container: HTMLElement | null = null
  private announcer: HTMLElement | null = null
  private els: HTMLElement[] = []
  private painted: string[] = []
  private cursor = -1
  private showCursor = false

  private drag: Drag | null = null
  private animation: Animation | null = null
  private frame = 0
  private recomputeFrame = 0
  private saved = loadSavedGrid()

  private listeners = new Set<() => void>()
  private snapshot: BoardSnapshot = { rows: 0, cols: 0, status: 'idle', revealed: 0, stats: null }

  // ─── store ────────────────────────────────────────────────────────────

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  private emit(patch: Partial<BoardSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }

  private get busy() {
    const { status } = this.snapshot
    return status === 'searching' || status === 'tracing' || status === 'generating'
  }

  /**
   * The grid handed to the algorithms. Endpoints always count as open ground:
   * one dropped onto a weight hides it, so the weight must not add hidden cost
   * (it is kept underneath and reappears when the endpoint moves on).
   */
  private get grid(): Grid {
    const cells = this.cells.slice()
    cells[this.start] = OPEN
    cells[this.target] = OPEN
    return { rows: this.rows, cols: this.cols, cells, start: this.start, target: this.target }
  }

  // ─── settings & layout ────────────────────────────────────────────────

  configure(next: BoardSettings) {
    const algorithmChanged = next.algorithm !== this.settings.algorithm
    this.settings = next
    this.container?.style.setProperty('--visit-ms', `${SPEED_LEVELS[next.speed].visitMs}ms`)
    if (algorithmChanged && this.snapshot.status === 'done') this.recompute()
  }

  /** Adopts new dimensions, carrying over whatever part of the old board fits. */
  resize(rows: number, cols: number) {
    if (rows === this.rows && cols === this.cols) return
    this.cancelAnimation()
    const source = this.rows > 0 ? { rows: this.rows, cols: this.cols, cells: this.cells, start: this.start, target: this.target } : this.saved
    this.saved = null
    const wasDone = this.snapshot.status === 'done'

    this.rows = rows
    this.cols = cols
    this.cells = new Uint8Array(rows * cols)
    this.overlay = new Uint8Array(rows * cols)
    const [defaultStart, defaultTarget] = this.defaultEndpoints()
    this.start = defaultStart
    this.target = defaultTarget

    if (source) {
      for (let r = 0; r < Math.min(rows, source.rows); r++) {
        for (let c = 0; c < Math.min(cols, source.cols); c++) this.cells[toIndex(cols, r, c)] = source.cells[toIndex(source.cols, r, c)]
      }
      const carry = (i: number) => {
        const r = rowOf(source.cols, i)
        const c = colOf(source.cols, i)
        return r < rows && c < cols ? toIndex(cols, r, c) : -1
      }
      const start = carry(source.start)
      const target = carry(source.target)
      if (start !== -1 && target !== -1 && start !== target) {
        this.start = start
        this.target = target
      }
    }
    this.cells[this.start] = OPEN
    this.cells[this.target] = OPEN
    this.cursor = this.start
    this.els = []
    this.painted = []
    this.emit({ rows, cols, status: wasDone ? 'done' : 'idle', revealed: 0, stats: wasDone ? this.snapshot.stats : null })
    if (wasDone) this.recompute()
    this.persist()
  }

  private defaultEndpoints(): [number, number] {
    const { rows, cols } = this
    const start = snapToRoom(rows, cols, toIndex(cols, Math.floor(rows / 2), Math.floor(cols / 4)))
    const target = toIndex(cols, rowOf(cols, start), cols - 1 - colOf(cols, start))
    return [start, target === start ? start + 2 : target]
  }

  // ─── DOM ──────────────────────────────────────────────────────────────

  attach(container: HTMLElement, announcer: HTMLElement | null) {
    this.container = container
    this.announcer = announcer
    this.els = Array.from(container.children) as HTMLElement[]
    this.painted = new Array<string>(this.els.length).fill('')
    container.style.setProperty('--visit-ms', `${SPEED_LEVELS[this.settings.speed].visitMs}ms`)
    this.syncBusyFlag()
    this.paintAll()
    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
    container.addEventListener('pointercancel', this.onPointerUp)
    container.addEventListener('lostpointercapture', this.onPointerUp)
    container.addEventListener('keydown', this.onKeyDown)
    container.addEventListener('focus', this.onFocus)
    container.addEventListener('blur', this.onBlur)
  }

  detach() {
    const { container } = this
    if (!container) return
    container.removeEventListener('pointerdown', this.onPointerDown)
    container.removeEventListener('pointermove', this.onPointerMove)
    container.removeEventListener('pointerup', this.onPointerUp)
    container.removeEventListener('pointercancel', this.onPointerUp)
    container.removeEventListener('lostpointercapture', this.onPointerUp)
    container.removeEventListener('keydown', this.onKeyDown)
    container.removeEventListener('focus', this.onFocus)
    container.removeEventListener('blur', this.onBlur)
    this.container = null
    this.announcer = null
    this.els = []
    this.painted = []
    this.drag = null
  }

  /** Stops timers; the board stays usable (safe under StrictMode re-mounts). */
  dispose() {
    this.cancelAnimation()
    cancelAnimationFrame(this.recomputeFrame)
    this.recomputeFrame = 0
  }

  private classFor(i: number): string {
    let cls = 'cell'
    if (i === this.start) cls += ' cell--start'
    else if (i === this.target) cls += ' cell--target'
    else if (this.cells[i] === WALL) cls += ' cell--wall'
    else {
      if (this.cells[i] === WEIGHT) cls += ' cell--weight'
      if (this.overlay[i] === PATH) cls += ' cell--path'
      else if (this.overlay[i] === VISITED) cls += ' cell--visited'
    }
    if (this.showCursor && i === this.cursor) cls += ' cell--cursor'
    return cls
  }

  /** Writes a cell's class if it changed. `animate` replays its entry keyframes. */
  private paint(i: number, animate = false) {
    const el = this.els[i]
    if (!el) return
    const cls = animate ? `${this.classFor(i)} is-new` : this.classFor(i)
    if (this.painted[i] === cls) return
    this.painted[i] = cls
    el.className = cls
  }

  private paintAll() {
    for (let i = 0; i < this.els.length; i++) this.paint(i)
  }

  private syncBusyFlag() {
    if (!this.container) return
    if (this.busy) this.container.dataset.busy = ''
    else delete this.container.dataset.busy
  }

  private setStatus(status: BoardStatus, patch: Partial<BoardSnapshot> = {}) {
    this.emit({ status, ...patch })
    this.syncBusyFlag()
  }

  // ─── search ───────────────────────────────────────────────────────────

  private search(): { result: SearchResult; stats: SearchStats } {
    const algorithm = this.settings.algorithm
    const t0 = performance.now()
    const result = getPathAlgorithm(algorithm).run(this.grid)
    const timeMs = performance.now() - t0
    return {
      result,
      stats: {
        algorithm,
        visited: result.visitedInOrder.length,
        found: result.path.length > 0,
        pathLength: Math.max(0, result.path.length - 1),
        cost: result.cost,
        timeMs,
      },
    }
  }

  /** Re-runs the search and paints the result immediately — used for live edits. */
  private recompute() {
    const { result, stats } = this.search()
    this.showResult(result, stats)
  }

  /** Paints a finished search without animation, touching only changed cells. */
  private showResult(result: SearchResult, stats: SearchStats) {
    const next = new Uint8Array(this.overlay.length)
    for (const i of result.visitedInOrder) next[i] = VISITED
    for (const i of result.path) next[i] = PATH
    const prev = this.overlay
    this.overlay = next
    for (let i = 0; i < next.length; i++) if (prev[i] !== next[i]) this.paint(i)
    this.setStatus('done', { stats, revealed: stats.visited })
  }

  private queueRecompute() {
    if (this.recomputeFrame) return
    this.recomputeFrame = requestAnimationFrame(() => {
      this.recomputeFrame = 0
      if (this.snapshot.status === 'done') this.recompute()
    })
  }

  private clearOverlay() {
    const prev = this.overlay
    this.overlay = new Uint8Array(prev.length)
    for (let i = 0; i < prev.length; i++) if (prev[i] !== NONE) this.paint(i)
  }

  visualize() {
    if (this.busy || this.rows === 0) return
    this.clearOverlay()
    const { result, stats } = this.search()
    this.animation = { kind: 'search', result, stats, visit: 0, path: 0, budget: 1, last: 0 }
    this.setStatus('searching', { revealed: 0, stats: null })
    this.startLoop()
  }

  /**
   * Starts the animation loop one frame late, so cells cleared just now get a
   * style recalc before they are re-added and their keyframes restart.
   */
  private startLoop() {
    this.frame = requestAnimationFrame(() => {
      if (this.animation) this.animation.last = performance.now()
      this.frame = requestAnimationFrame(this.tick)
    })
  }

  /** Jumps the running animation (search or maze) to its end. */
  skip() {
    const anim = this.animation
    if (!anim) return
    cancelAnimationFrame(this.frame)
    this.animation = null
    if (anim.kind === 'search') {
      this.showResult(anim.result, anim.stats)
      this.announce(this.describeStats(anim.stats))
    } else {
      for (let k = anim.index; k < anim.plan.cells.length; k++) this.applyPlanCell(anim.plan, anim.plan.cells[k], false)
      this.finishMaze()
    }
  }

  private cancelAnimation() {
    if (!this.animation) return
    cancelAnimationFrame(this.frame)
    // A half-generated maze is still a valid board, so keep what was drawn.
    if (this.animation.kind === 'maze') this.persist()
    this.animation = null
  }

  private tick = (now: number) => {
    const anim = this.animation
    if (!anim) return
    const dt = Math.min(0.1, (now - anim.last) / 1000)
    anim.last = now
    const level = SPEED_LEVELS[this.settings.speed]

    if (anim.kind === 'maze') {
      anim.budget += dt * level.maze
      const { cells } = anim.plan
      while (anim.budget >= 1 && anim.index < cells.length) {
        this.applyPlanCell(anim.plan, cells[anim.index++], true)
        anim.budget--
      }
      if (anim.index >= cells.length) {
        this.finishMaze()
        return
      }
    } else {
      const { visitedInOrder, path } = anim.result
      if (anim.visit < visitedInOrder.length) {
        anim.budget += dt * level.visit
        while (anim.budget >= 1 && anim.visit < visitedInOrder.length) {
          const i = visitedInOrder[anim.visit++]
          this.overlay[i] = VISITED
          this.paint(i, true)
          anim.budget--
        }
        this.emit({ revealed: anim.visit })
        if (anim.visit >= visitedInOrder.length && path.length > 0) {
          anim.budget = 1
          this.setStatus('tracing')
        }
      } else if (anim.path < path.length) {
        anim.budget += dt * level.path
        while (anim.budget >= 1 && anim.path < path.length) {
          const i = path[anim.path++]
          this.overlay[i] = PATH
          this.paint(i, true)
          anim.budget--
        }
      } else {
        this.animation = null
        this.setStatus('done', { stats: anim.stats, revealed: anim.stats.visited })
        this.announce(this.describeStats(anim.stats))
        return
      }
    }
    this.frame = requestAnimationFrame(this.tick)
  }

  private describeStats(stats: SearchStats) {
    const name = getPathAlgorithm(stats.algorithm).short
    return stats.found
      ? `${name} found a path of ${stats.pathLength} steps with cost ${stats.cost} after visiting ${stats.visited} cells.`
      : `${name} visited ${stats.visited} cells and found no path to the target.`
  }

  // ─── editing ──────────────────────────────────────────────────────────

  private setTerrain(i: number, terrain: number) {
    if (i === this.start || i === this.target || this.cells[i] === terrain) return
    this.cells[i] = terrain
    if (terrain === WALL) this.overlay[i] = NONE
    this.paint(i, terrain !== OPEN)
    if (this.snapshot.status === 'done') this.queueRecompute()
  }

  private moveEndpoint(which: 'start' | 'target', i: number) {
    const other = which === 'start' ? this.target : this.start
    if (i === other || this.cells[i] === WALL) return
    const old = this[which]
    if (old === i) return
    this[which] = i
    this.paint(old)
    this.paint(i)
    if (this.snapshot.status === 'done') this.queueRecompute()
  }

  clearPath() {
    if (this.snapshot.status === 'generating') return
    this.cancelAnimation()
    this.clearOverlay()
    this.setStatus('idle', { stats: null, revealed: 0 })
  }

  /** Removes every wall and weight, keeping start and target. */
  clearTerrain() {
    if (this.snapshot.status === 'generating') return
    this.cancelAnimation()
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] === OPEN) continue
      this.cells[i] = OPEN
      this.paint(i)
    }
    this.clearOverlay()
    this.setStatus('idle', { stats: null, revealed: 0 })
    this.persist()
  }

  generate(id: MazeId) {
    if (this.busy || this.rows === 0) return
    this.clearOverlay()
    this.setStatus('generating', { stats: null, revealed: 0 })

    if (id === 'recursive-division' || id === 'dfs-maze') this.snapEndpointsToRooms()
    const plan = generateMaze(
      id,
      { rows: this.rows, cols: this.cols, start: this.start, target: this.target, isWall: (i) => this.cells[i] === WALL },
      Math.random,
    )
    // Prepare the canvas the plan expects, then apply its cells in order.
    for (let i = 0; i < this.cells.length; i++) {
      const before = this.cells[i]
      if (plan.kind === 'walls') this.cells[i] = OPEN
      else if (plan.kind === 'carve') this.cells[i] = i === this.start || i === this.target ? OPEN : WALL
      else if (before === WEIGHT) this.cells[i] = OPEN
      if (before !== this.cells[i]) this.paint(i)
    }

    if (this.settings.reducedMotion) {
      for (const i of plan.cells) this.applyPlanCell(plan, i, false)
      this.finishMaze()
      return
    }
    this.animation = { kind: 'maze', plan, index: 0, budget: 1, last: 0 }
    this.startLoop()
  }

  private applyPlanCell(plan: MazePlan, i: number, animate: boolean) {
    this.cells[i] = plan.kind === 'walls' ? WALL : plan.kind === 'carve' ? OPEN : WEIGHT
    this.paint(i, animate && plan.kind !== 'carve')
  }

  private finishMaze() {
    this.animation = null
    this.setStatus('idle')
    this.persist()
  }

  /** Mazes keep odd/odd "room" cells open, so endpoints must sit on rooms. */
  private snapEndpointsToRooms() {
    const { rows, cols } = this
    const oldStart = this.start
    const oldTarget = this.target
    this.start = snapToRoom(rows, cols, this.start)
    let target = snapToRoom(rows, cols, this.target)
    if (target === this.start) {
      const c = colOf(cols, target)
      target = snapToRoom(rows, cols, c + 2 < cols - 1 ? target + 2 : target - 2)
    }
    this.target = target
    for (const i of [oldStart, oldTarget, this.start, this.target]) this.paint(i)
  }

  private persist() {
    if (this.rows === 0) return
    writeStorage(STORAGE_KEYS.grid, {
      rows: this.rows,
      cols: this.cols,
      cells: this.cells.join(''),
      start: this.start,
      target: this.target,
    })
  }

  // ─── pointer input ────────────────────────────────────────────────────

  private cellAt(x: number, y: number): number {
    const rect = this.container?.getBoundingClientRect()
    if (!rect) return -1
    const col = Math.floor(((x - rect.left) / rect.width) * this.cols)
    const row = Math.floor(((y - rect.top) / rect.height) * this.rows)
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return -1
    return toIndex(this.cols, row, col)
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || this.busy || !this.container) return
    const i = this.cellAt(e.clientX, e.clientY)
    if (i === -1) return
    e.preventDefault()
    this.container.focus({ preventScroll: true })
    this.container.setPointerCapture(e.pointerId)
    this.setCursor(i, false)
    if (i === this.start || i === this.target) {
      this.drag = { mode: i === this.start ? 'start' : 'target', last: i }
    } else {
      const brush = this.settings.brush === 'wall' ? WALL : WEIGHT
      const terrain = this.cells[i] === brush ? OPEN : brush
      this.drag = { mode: 'paint', terrain, last: i }
      this.setTerrain(i, terrain)
    }
    this.container.dataset.dragging = this.drag.mode
  }

  private onPointerMove = (e: PointerEvent) => {
    const { drag } = this
    if (!drag) return
    const i = this.cellAt(e.clientX, e.clientY)
    if (i === -1 || i === drag.last) return
    if (drag.mode === 'paint') {
      for (const cell of lineBetween(this.cols, drag.last, i)) this.setTerrain(cell, drag.terrain)
    } else {
      this.moveEndpoint(drag.mode, i)
    }
    drag.last = i
  }

  private onPointerUp = () => {
    if (!this.drag) return
    this.drag = null
    if (this.container) delete this.container.dataset.dragging
    this.persist()
  }

  // ─── keyboard input ───────────────────────────────────────────────────

  private onFocus = () => {
    // Only show the cell cursor for keyboard focus, not mouse clicks.
    if (this.container?.matches(':focus-visible')) this.setCursor(this.cursor < 0 ? this.start : this.cursor, true)
  }

  private onBlur = () => this.setCursor(this.cursor, false)

  private setCursor(i: number, visible: boolean) {
    const prev = this.cursor
    this.cursor = i
    this.showCursor = visible
    if (prev >= 0) this.paint(prev)
    if (i >= 0) this.paint(i)
    if (visible) this.announce(this.describeCell(i))
  }

  private describeCell(i: number) {
    const what =
      i === this.start
        ? 'start'
        : i === this.target
          ? 'target'
          : this.cells[i] === WALL
            ? 'wall'
            : `${this.cells[i] === WEIGHT ? 'weight, ' : ''}${this.overlay[i] === PATH ? 'on path' : this.overlay[i] === VISITED ? 'visited' : 'empty'}`
    return `Row ${rowOf(this.cols, i) + 1}, column ${colOf(this.cols, i) + 1}: ${what}`
  }

  private announce(message: string) {
    if (this.announcer) this.announcer.textContent = message
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const { rows, cols } = this
    const i = this.cursor < 0 ? this.start : this.cursor
    const r = rowOf(cols, i)
    const c = colOf(cols, i)
    const move = (next: number) => this.setCursor(next, true)
    switch (e.key) {
      case 'ArrowUp':
        if (r > 0) move(i - cols)
        break
      case 'ArrowDown':
        if (r < rows - 1) move(i + cols)
        break
      case 'ArrowLeft':
        if (c > 0) move(i - 1)
        break
      case 'ArrowRight':
        if (c < cols - 1) move(i + 1)
        break
      case ' ':
      case 'Enter':
      case 'w':
      case 'W': {
        if (this.busy) break
        const brush = e.key === 'w' || e.key === 'W' ? WEIGHT : this.settings.brush === 'wall' ? WALL : WEIGHT
        this.setTerrain(i, this.cells[i] === brush ? OPEN : brush)
        this.setCursor(i, true)
        this.persist()
        break
      }
      case 's':
      case 'S':
      case 't':
      case 'T':
        if (this.busy) break
        this.moveEndpoint(e.key.toLowerCase() === 's' ? 'start' : 'target', i)
        this.setCursor(i, true)
        this.persist()
        break
      default:
        return
    }
    e.preventDefault()
  }
}
