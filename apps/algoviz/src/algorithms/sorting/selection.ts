import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'for i ← 0 to n − 2',
  '  min ← i',
  '  for j ← i + 1 to n − 1',
  '    if A[j] < A[min]',
  '      min ← j',
  '  swap A[i], A[min]',
  '  A[i] is in its final place',
] as const

function selectionSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)
  const n = t.length
  for (let i = 0; i < n - 1; i++) {
    let min = i
    t.pivot(min, 1)
    for (let j = i + 1; j < n; j++) {
      if (t.compare(j, min, 3) < 0) {
        min = j
        t.pivot(min, 4)
      }
    }
    t.swap(i, min, 5)
    t.pivot(-1, 6)
    t.sorted(i, i, 6)
  }
  return t.finish()
}

export const selection: SortAlgorithm = {
  id: 'selection',
  name: 'Selection Sort',
  description:
    'Scans the unsorted suffix for its minimum (shown as the pivot / key marker) and swaps it into place. It always makes ~n²/2 comparisons but at most n − 1 swaps, which matters when writes are expensive.',
  complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  pseudocode,
  run: selectionSort,
}
