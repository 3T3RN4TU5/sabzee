import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'h ← 1',
  'while h < ⌊n/3⌋: h ← 3h + 1  // 1, 4, 13…',
  'while h ≥ 1',
  '  for i ← h to n − 1  // h-sort',
  '    j ← i',
  '    while j ≥ h and A[j − h] > A[j]',
  '      swap A[j − h], A[j]',
  '      j ← j − h',
  '  h ← (h − 1) / 3',
] as const

function shellSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)
  const n = t.length
  let h = 1
  while (h < Math.floor(n / 3)) h = 3 * h + 1
  while (h >= 1) {
    for (let i = h; i < n; i++) {
      let j = i
      while (j >= h && t.compare(j - h, j, 5) > 0) {
        t.swap(j - h, j, 6)
        j -= h
      }
    }
    h = (h - 1) / 3
  }
  return t.finish()
}

export const shell: SortAlgorithm = {
  id: 'shell',
  name: 'Shell Sort',
  description:
    "A generalised insertion sort: first sort elements that are h apart (using Knuth's gap sequence 1, 4, 13, 40…), shrinking h until it reaches 1. Long-distance moves early on mean the final insertion pass has almost nothing to do.",
  complexity: { best: 'O(n log n)', average: '≈ O(n^1.25)', worst: 'O(n^1.5)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  pseudocode,
  run: shellSort,
}
