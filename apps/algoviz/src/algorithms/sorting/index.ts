import { bubble } from './bubble.ts'
import { heap } from './heap.ts'
import { insertion } from './insertion.ts'
import { merge } from './merge.ts'
import { quick } from './quick.ts'
import { selection } from './selection.ts'
import { shell } from './shell.ts'
import type { SortAlgorithm, SortId } from './types.ts'

export const SORT_ALGORITHMS: readonly SortAlgorithm[] = [bubble, selection, insertion, merge, quick, heap, shell]

export const SORT_IDS = SORT_ALGORITHMS.map((a) => a.id)

export function getSortAlgorithm(id: SortId): SortAlgorithm {
  const algorithm = SORT_ALGORITHMS.find((a) => a.id === id)
  if (!algorithm) throw new Error(`Unknown sorting algorithm: ${id}`)
  return algorithm
}

export type { SortAlgorithm, SortId, SortStep, SortTrace } from './types.ts'
