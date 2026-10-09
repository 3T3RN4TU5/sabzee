import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'for i ← 0 to n − 2',
  '  swapped ← false',
  '  for j ← 0 to n − 2 − i',
  '    if A[j] > A[j + 1]',
  '      swap A[j], A[j + 1]',
  '      swapped ← true',
  '  A[n − 1 − i] is in its final place',
  '  if not swapped: break  // early exit',
] as const

function bubbleSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)
  const n = t.length
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      if (t.compare(j, j + 1, 3) > 0) {
        t.swap(j, j + 1, 4)
        swapped = true
      }
    }
    t.sorted(n - 1 - i, n - 1 - i, 6)
    if (!swapped) {
      t.sorted(0, n - 2 - i, 7)
      break
    }
  }
  return t.finish()
}

export const bubble: SortAlgorithm = {
  id: 'bubble',
  name: 'Bubble Sort',
  description:
    'Repeatedly walks the array swapping adjacent out-of-order pairs, so the largest remaining value "bubbles" to the end on every pass. Stops early once a pass makes no swaps.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: true,
  inPlace: true,
  pseudocode,
  run: bubbleSort,
}
