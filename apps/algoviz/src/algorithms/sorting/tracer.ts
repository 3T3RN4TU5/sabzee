import type { SortStep, SortTrace } from './types.ts'

/**
 * Wraps a working copy of the input and records every read-compare / write the
 * algorithm performs. Algorithms only touch the array through this class, which
 * keeps them honest: the recorded steps replay to exactly the same result.
 */
export class Tracer {
  readonly a: number[]
  readonly steps: SortStep[] = []
  private readonly finalized: Uint8Array

  constructor(input: readonly number[]) {
    this.a = input.slice()
    this.finalized = new Uint8Array(input.length)
  }

  get length(): number {
    return this.a.length
  }

  /** Records a comparison of A[i] and A[j] and returns A[i] − A[j]. */
  compare(i: number, j: number, line: number): number {
    this.steps.push({ type: 'compare', i, j, line })
    return this.a[i] - this.a[j]
  }

  /**
   * Records a comparison between two values that live outside the array
   * (e.g. merge sort's auxiliary buffer). `i` / `j` are the positions the
   * values came from and are what the visualiser highlights.
   */
  compareValues(i: number, j: number, x: number, y: number, line: number): number {
    this.steps.push({ type: 'compare', i, j, line })
    return x - y
  }

  /** Swaps A[i] and A[j]. Self-swaps are no-ops and are not recorded. */
  swap(i: number, j: number, line: number): void {
    if (i === j) return
    const { a } = this
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
    this.steps.push({ type: 'swap', i, j, line })
  }

  write(i: number, value: number, line: number): void {
    this.a[i] = value
    this.steps.push({ type: 'overwrite', i, value, line })
  }

  pivot(i: number, line: number): void {
    this.steps.push({ type: 'pivot', i, line })
  }

  sorted(from: number, to: number, line: number): void {
    if (from > to) return
    this.finalized.fill(1, from, to + 1)
    this.steps.push({ type: 'sorted', from, to, line })
  }

  /** Marks anything not yet finalised as sorted and returns the trace. */
  finish(): SortTrace {
    if (this.finalized.includes(0)) this.sorted(0, this.a.length - 1, -1)
    return { steps: this.steps, output: this.a }
  }
}
