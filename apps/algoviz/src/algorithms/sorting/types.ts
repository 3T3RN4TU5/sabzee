/**
 * A single recorded operation. Every step carries the pseudocode `line` that
 * produced it (an index into the algorithm's `pseudocode`, or -1 for none) so
 * the UI can highlight the executing line while replaying.
 */
export type SortStep =
  | { type: 'compare'; i: number; j: number; line: number }
  | { type: 'swap'; i: number; j: number; line: number }
  | { type: 'overwrite'; i: number; value: number; line: number }
  /** Marks `i` as the current pivot / key; `i = -1` clears the marker. */
  | { type: 'pivot'; i: number; line: number }
  /** Marks the inclusive range `from..to` as being in its final position. */
  | { type: 'sorted'; from: number; to: number; line: number }

export interface SortTrace {
  steps: SortStep[]
  /** The array after the algorithm finished (must equal the sorted input). */
  output: number[]
}

export type SortId = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'shell'

export interface Complexity {
  best: string
  average: string
  worst: string
  space: string
}

export interface SortAlgorithm {
  id: SortId
  name: string
  description: string
  complexity: Complexity
  stable: boolean
  inPlace: boolean
  pseudocode: readonly string[]
  run: (input: readonly number[]) => SortTrace
}
