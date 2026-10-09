import type { Difficulty, Problem, Tag } from '../problems/types.ts'
import { statusOf, type Submission, type SubmissionMap } from './progress.ts'

const DAY_MS = 24 * 60 * 60 * 1000

/** Local calendar day, e.g. `2026-10-08`. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Midnight (local time) of the day containing `timestamp`, shifted by `offsetDays`. */
export function startOfDay(timestamp: number, offsetDays = 0): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.getTime()
}

export interface Streaks {
  current: number
  longest: number
  activeToday: boolean
}

/**
 * A streak counts consecutive days with at least one submission. Today does
 * not break the streak until it is over, so a run ending yesterday is current.
 */
export function computeStreaks(activeDays: Set<string>, now: number): Streaks {
  const activeToday = activeDays.has(dayKey(now))
  let current = 0
  for (let offset = activeToday ? 0 : -1; activeDays.has(dayKey(startOfDay(now, offset))); offset--) {
    current++
  }

  let longest = 0
  let run = 0
  let previous: number | null = null
  for (const key of [...activeDays].sort()) {
    const [y, m, d] = key.split('-').map(Number)
    const time = new Date(y, m - 1, d).getTime()
    // Round to tolerate 23/25-hour days around daylight-saving changes.
    run = previous !== null && Math.round((time - previous) / DAY_MS) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = time
  }
  return { current, longest, activeToday }
}

export interface DifficultyProgress {
  difficulty: Difficulty
  solved: number
  total: number
}

export interface TagProgress {
  tag: Tag
  solved: number
  total: number
}

export interface RecentSubmission extends Submission {
  problem: Problem
}

export interface ProgressSummary {
  solved: number
  attempted: number
  total: number
  byDifficulty: DifficultyProgress[]
  byTag: TagProgress[]
  totalSubmissions: number
  acceptedSubmissions: number
  /** Accepted submissions / all submissions, 0–1, or null without submissions. */
  acceptanceRate: number | null
  activityByDay: Map<string, number>
  recent: RecentSubmission[]
}

export function summarize(problems: readonly Problem[], submissions: SubmissionMap): ProgressSummary {
  const byDifficulty = new Map<Difficulty, DifficultyProgress>()
  const byTag = new Map<Tag, TagProgress>()
  const activityByDay = new Map<string, number>()
  const recent: RecentSubmission[] = []
  let solved = 0
  let attempted = 0
  let totalSubmissions = 0
  let acceptedSubmissions = 0

  for (const problem of problems) {
    const list = submissions[problem.slug] ?? []
    const status = statusOf(list)
    const isSolved = status === 'solved'
    if (isSolved) solved++
    else if (status === 'attempted') attempted++

    const difficulty = byDifficulty.get(problem.difficulty) ?? { difficulty: problem.difficulty, solved: 0, total: 0 }
    difficulty.total++
    if (isSolved) difficulty.solved++
    byDifficulty.set(problem.difficulty, difficulty)

    for (const tag of problem.tags) {
      const entry = byTag.get(tag) ?? { tag, solved: 0, total: 0 }
      entry.total++
      if (isSolved) entry.solved++
      byTag.set(tag, entry)
    }

    for (const submission of list) {
      totalSubmissions++
      if (submission.verdict === 'Accepted') acceptedSubmissions++
      const key = dayKey(submission.timestamp)
      activityByDay.set(key, (activityByDay.get(key) ?? 0) + 1)
      recent.push({ ...submission, problem })
    }
  }

  const order: Difficulty[] = ['Easy', 'Medium', 'Hard']
  return {
    solved,
    attempted,
    total: problems.length,
    byDifficulty: order.map((d) => byDifficulty.get(d) ?? { difficulty: d, solved: 0, total: 0 }),
    byTag: [...byTag.values()].sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag)),
    totalSubmissions,
    acceptedSubmissions,
    acceptanceRate: totalSubmissions === 0 ? null : acceptedSubmissions / totalSubmissions,
    activityByDay,
    recent: recent.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8),
  }
}
