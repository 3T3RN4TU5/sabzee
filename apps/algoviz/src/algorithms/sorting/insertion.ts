import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'for i ← 1 to n − 1',
  '  j ← i',
  '  while j > 0 and A[j − 1] > A[j]',
  '    swap A[j − 1], A[j]',
  '    j ← j − 1',
] as const

function insertionSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)
  const n = t.length
  for (let i = 1; i < n; i++) {
    let j = i
    while (j > 0 && t.compare(j - 1, j, 2) > 0) {
      t.swap(j - 1, j, 3)
      j--
    }
  }
  return t.finish()
}

export const insertion: SortAlgorithm = {
  id: 'insertion',
  name: 'Insertion Sort',
  description:
    'Grows a sorted prefix one element at a time, sliding each new element left until it meets a smaller one (shown here as adjacent swaps). Very fast on small or nearly sorted inputs — which is why hybrid sorts like Timsort use it for short runs.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: true,
  inPlace: true,
  pseudocode,
  run: insertionSort,
}
