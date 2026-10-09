import { Tracer } from './tracer.ts'
import type { SortAlgorithm, SortTrace } from './types.ts'

const pseudocode = [
  'mergeSort(A, lo, hi)',
  '  if lo ≥ hi: return',
  '  mid ← ⌊(lo + hi) / 2⌋',
  '  mergeSort(A, lo, mid)',
  '  mergeSort(A, mid + 1, hi)',
  '  merge(A, lo, mid, hi)',
  'merge(A, lo, mid, hi)',
  '  B ← copy of A[lo..hi]',
  '  i ← lo; j ← mid + 1',
  '  for k ← lo to hi',
  '    if i > mid: A[k] ← B[j++]',
  '    else if j > hi: A[k] ← B[i++]',
  '    else if B[j] < B[i]: A[k] ← B[j++]',
  '    else: A[k] ← B[i++]',
] as const

function mergeSort(input: readonly number[]): SortTrace {
  const t = new Tracer(input)
  const n = t.length

  const merge = (lo: number, mid: number, hi: number) => {
    const aux = t.a.slice(lo, hi + 1)
    const isFinalMerge = lo === 0 && hi === n - 1
    let i = lo
    let j = mid + 1
    for (let k = lo; k <= hi; k++) {
      if (i > mid) {
        t.write(k, aux[j++ - lo], 10)
      } else if (j > hi) {
        t.write(k, aux[i++ - lo], 11)
      } else if (t.compareValues(j, i, aux[j - lo], aux[i - lo], 12) < 0) {
        t.write(k, aux[j++ - lo], 12)
      } else {
        t.write(k, aux[i++ - lo], 13)
      }
      // During the top-level merge every written slot is final.
      if (isFinalMerge) t.sorted(k, k, 9)
    }
  }

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return
    const mid = Math.floor((lo + hi) / 2)
    sort(lo, mid)
    sort(mid + 1, hi)
    merge(lo, mid, hi)
  }

  sort(0, n - 1)
  return t.finish()
}

export const merge: SortAlgorithm = {
  id: 'merge',
  name: 'Merge Sort',
  description:
    'Divide and conquer: split the array in half, sort each half recursively, then merge the two sorted runs through an auxiliary buffer. Guaranteed O(n log n) and stable, at the cost of O(n) extra memory. The highlighted pair are the heads of the two runs being merged.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  stable: true,
  inPlace: false,
  pseudocode,
  run: mergeSort,
}
