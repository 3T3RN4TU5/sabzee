/** Builders for large generated test inputs, kept separate from the problem text. */

export function range(length: number, map: (i: number) => number = (i) => i): number[] {
  return Array.from({ length }, (_, i) => map(i))
}

/**
 * Every balanced parentheses string with `n` pairs, found by brute force over
 * all 2^(2n) strings. Deliberately independent of the backtracking reference
 * solution so the two cross-check each other.
 */
export function balancedParentheses(n: number): string[] {
  const result: string[] = []
  const length = 2 * n
  for (let mask = 0; mask < 1 << length; mask++) {
    let depth = 0
    let text = ''
    for (let bit = length - 1; bit >= 0 && depth >= 0; bit--) {
      const open = (mask >> bit) & 1
      depth += open ? 1 : -1
      text += open ? '(' : ')'
    }
    if (depth === 0 && text.length === length) result.push(text)
  }
  return result
}

/** Rotates a square matrix 90° clockwise into a new matrix (independent of the in-place reference). */
export function rotatedCopy(matrix: number[][]): number[][] {
  const n = matrix.length
  return range(n).map((r) => range(n).map((c) => matrix[n - 1 - c][r]))
}
