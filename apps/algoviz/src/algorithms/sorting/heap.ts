import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'heapSort(A, n)',
  '  for i ← ⌊n/2⌋ − 1 downto 0  // heapify',
  '    siftDown(A, i, n)',
  '  for end ← n − 1 downto 1',
  '    swap A[0], A[end]  // max to the end',
  '    siftDown(A, 0, end)',
  'siftDown(A, i, size)',
  '  while 2i + 1 < size',
  '    c ← 2i + 1  // left child',
  '    if c + 1 < size and A[c + 1] > A[c]',
  '      c ← c + 1  // larger child',
  '    if A[i] ≥ A[c]: return',
  '    swap A[i], A[c]',
  '    i ← c',
] as const

function heapSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)
  const n = t.length

  const siftDown = (start: number, size: number) => {
    let i = start
    while (2 * i + 1 < size) {
      let c = 2 * i + 1
      if (c + 1 < size && t.compare(c + 1, c, 9) > 0) c++
      if (t.compare(i, c, 11) >= 0) return
      t.swap(i, c, 12)
      i = c
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n)
  for (let end = n - 1; end > 0; end--) {
    t.swap(0, end, 4)
    t.sorted(end, end, 4)
    siftDown(0, end)
  }
  return t.finish()
}

export const heap: SortAlgorithm = {
  id: 'heap',
  name: 'Heap Sort',
  description:
    'Turns the array into a binary max-heap (children of i live at 2i + 1 and 2i + 2), then repeatedly swaps the root — the maximum — to the end and sifts the new root down. O(n log n) in every case with O(1) extra space, but not stable and cache-unfriendly.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  pseudocode,
  run: heapSort,
}
