import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'quickSort(A, lo, hi)',
  '  if lo ≥ hi: return',
  '  p ← partition(A, lo, hi)',
  '  quickSort(A, lo, p − 1)',
  '  quickSort(A, p + 1, hi)',
  'partition(A, lo, hi)  // Lomuto',
  '  pivot ← A[hi]',
  '  i ← lo',
  '  for j ← lo to hi − 1',
  '    if A[j] < pivot',
  '      swap A[i], A[j]',
  '      i ← i + 1',
  '  swap A[i], A[hi]  // pivot is final',
  '  return i',
] as const

function quickSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)

  const partition = (lo: number, hi: number): number => {
    t.pivot(hi, 6)
    let i = lo
    for (let j = lo; j < hi; j++) {
      if (t.compare(j, hi, 9) < 0) {
        t.swap(i, j, 10)
        i++
      }
    }
    t.swap(i, hi, 12)
    t.pivot(-1, 12)
    t.sorted(i, i, 13)
    return i
  }

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) {
      if (lo === hi) t.sorted(lo, lo, 1)
      return
    }
    const p = partition(lo, hi)
    sort(lo, p - 1)
    sort(p + 1, hi)
  }

  sort(0, t.length - 1)
  return t.finish()
}

export const quick: SortAlgorithm = {
  id: 'quick',
  name: 'Quick Sort',
  description:
    'Lomuto partition scheme with the last element as pivot: everything smaller than the pivot is moved left of it, putting the pivot in its final slot, then both sides are sorted recursively. Blazing fast on random data, but degrades to O(n²) on already-sorted, reversed or duplicate-heavy input — try those presets.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
  stable: false,
  inPlace: true,
  pseudocode,
  run: quickSort,
}
