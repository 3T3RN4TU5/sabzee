export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const TAGS = [
  'Array',
  'String',
  'Hash Map',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Dynamic Programming',
  'Intervals',
  'Math',
  'Recursion',
  'Greedy',
  'Matrix',
] as const
export type Tag = (typeof TAGS)[number]

/**
 * How a returned value is checked against the expected one.
 * - `exact`: structural deep equality (order matters).
 * - `unordered`: the top-level array may be in any order; with `deep`, every
 *   nested array is order-insensitive as well (e.g. 3Sum triplets).
 * - `float`: numbers must match within a relative tolerance.
 */
export type Comparator =
  | { kind: 'exact' }
  | { kind: 'unordered'; deep?: boolean }
  | { kind: 'float'; tolerance: number }

export interface Param {
  name: string
  /** JSDoc type shown in the starter code, e.g. `number[]`. */
  type: string
}

export interface TestCase {
  input: unknown[]
  expected: unknown
  /** Hidden tests only run on Submit and never reveal their input. */
  hidden?: boolean
  /** Shown under the example when this (visible) test is rendered as an example. */
  explanation?: string
}

export interface Solution {
  /** Markdown-lite blocks explaining the approach. */
  approach: string[]
  code: string
  time: string
  space: string
}

export interface Problem {
  id: number
  slug: string
  title: string
  difficulty: Difficulty
  tags: Tag[]
  /**
   * Markdown-lite blocks: each entry is a paragraph, or a list when every line
   * starts with `- `. Inline `code`, **bold** and *italic* are supported.
   */
  description: string[]
  functionName: string
  params: Param[]
  /** JSDoc return type; `void` for in-place problems. */
  returns: string
  /** When set, the judge compares this argument (after the call) instead of the return value. */
  mutatesArg?: number
  comparator: Comparator
  constraints: string[]
  tests: TestCase[]
  hints: string[]
  solution: Solution
}
