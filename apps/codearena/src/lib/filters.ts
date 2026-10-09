import type { Difficulty, Problem, Tag } from '../problems/types.ts'
import type { ProblemStatus } from './progress.ts'

export type StatusFilter = 'all' | ProblemStatus

/** Problem-list filters. Held by App so they survive the drawer closing or the sidebar collapsing. */
export interface ProblemFilters {
  query: string
  difficulty: Difficulty | 'all'
  status: StatusFilter
  tag: Tag | 'all'
}

export const NO_FILTERS: ProblemFilters = { query: '', difficulty: 'all', status: 'all', tag: 'all' }

export function hasActiveFilters({ query, difficulty, status, tag }: ProblemFilters): boolean {
  return query !== '' || difficulty !== 'all' || status !== 'all' || tag !== 'all'
}

/** Search matches the title, the exact problem number or a topic. */
export function matchesFilters(problem: Problem, status: ProblemStatus, filters: ProblemFilters): boolean {
  if (filters.difficulty !== 'all' && problem.difficulty !== filters.difficulty) return false
  if (filters.status !== 'all' && status !== filters.status) return false
  if (filters.tag !== 'all' && !problem.tags.includes(filters.tag)) return false
  const needle = filters.query.trim().toLowerCase()
  if (!needle) return true
  return (
    problem.title.toLowerCase().includes(needle) ||
    String(problem.id) === needle ||
    problem.tags.some((tag) => tag.toLowerCase().includes(needle))
  )
}
