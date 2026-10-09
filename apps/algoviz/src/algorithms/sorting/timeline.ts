import type { SortStep } from './types.ts'

/** The visual state of the array after a number of steps have been applied. */
export interface SortFrame {
  values: number[]
  /** 1 when the slot is known to be in its final position. */
  sorted: Uint8Array
  /** Index of the current pivot / key, or -1. */
  pivot: number
  comparisons: number
  swaps: number
  /** Total array writes (a swap counts as two). */
  writes: number
  /** The most recently applied step — the one being "executed". */
  step: SortStep | undefined
}

/** Steps that represent real work; markers (pivot / sorted) are free. */
function isCostly(step: SortStep): boolean {
  return step.type === 'compare' || step.type === 'swap' || step.type === 'overwrite'
}

interface Checkpoint {
  values: number[]
  sorted: Uint8Array
  pivot: number
  comparisons: number
  swaps: number
  writes: number
}

const CHECKPOINT_EVERY = 256

function apply(state: Checkpoint, step: SortStep): void {
  switch (step.type) {
    case 'compare':
      state.comparisons++
      break
    case 'swap': {
      const { values } = state
      const tmp = values[step.i]
      values[step.i] = values[step.j]
      values[step.j] = tmp
      state.swaps++
      state.writes += 2
      break
    }
    case 'overwrite':
      state.values[step.i] = step.value
      state.writes++
      break
    case 'pivot':
      state.pivot = step.i
      break
    case 'sorted':
      state.sorted.fill(1, step.from, step.to + 1)
      break
  }
}

const cloneState = (s: Checkpoint): Checkpoint => ({ ...s, values: s.values.slice(), sorted: s.sorted.slice() })

/**
 * Random access over a recorded run. Snapshots are stored every
 * {@link CHECKPOINT_EVERY} steps so seeking anywhere (scrubbing, stepping
 * backwards) replays at most a few hundred operations.
 */
export class SortTimeline {
  readonly steps: readonly SortStep[]
  /** `costBefore[k]` = number of costly steps among the first `k` steps. */
  readonly costBefore: Int32Array
  private readonly checkpoints: Checkpoint[] = []

  constructor(initial: readonly number[], steps: readonly SortStep[]) {
    this.steps = steps
    this.costBefore = new Int32Array(steps.length + 1)
    const state: Checkpoint = {
      values: initial.slice(),
      sorted: new Uint8Array(initial.length),
      pivot: -1,
      comparisons: 0,
      swaps: 0,
      writes: 0,
    }
    for (let k = 0; k <= steps.length; k++) {
      if (k % CHECKPOINT_EVERY === 0) this.checkpoints.push(cloneState(state))
      if (k === steps.length) break
      this.costBefore[k + 1] = this.costBefore[k] + (isCostly(steps[k]) ? 1 : 0)
      apply(state, steps[k])
    }
  }

  get length(): number {
    return this.steps.length
  }

  /** Total number of costly operations in the run. */
  get totalCost(): number {
    return this.costBefore[this.steps.length]
  }

  /** State after applying the first `k` steps (clamped to the valid range). */
  frameAt(k: number): SortFrame {
    const target = Math.max(0, Math.min(this.steps.length, Math.floor(k)))
    const base = Math.floor(target / CHECKPOINT_EVERY)
    const state = cloneState(this.checkpoints[base])
    for (let s = base * CHECKPOINT_EVERY; s < target; s++) apply(state, this.steps[s])
    return { ...state, step: target > 0 ? this.steps[target - 1] : undefined }
  }

  /**
   * The largest step index reached after spending `cost` costly operations
   * (free marker steps that immediately follow are included). Used to race
   * two algorithms fairly on a shared clock.
   */
  indexForCost(cost: number): number {
    const { costBefore } = this
    if (cost >= this.totalCost) return this.steps.length
    // Largest k with costBefore[k] <= cost.
    let lo = 0
    let hi = this.steps.length
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (costBefore[mid] <= cost) lo = mid
      else hi = mid - 1
    }
    return lo
  }
}
