import { findProblem, PROBLEMS } from '../problems/index.ts'
import { VERDICTS, type Verdict } from '../runner/verdict.ts'
import { asNumber, clamp, createPersistedStore, isRecord, readText, removeItem, writeText } from './storage.ts'

/* ---------- Submissions ---------- */

export interface Submission {
  id: string
  verdict: Verdict
  timestamp: number
  runtimeMs: number
  passed: number
  total: number
  code: string
  /** Timer reading when the submission was accepted, if the timer was used. */
  solveTimeMs?: number
}

export type SubmissionMap = Record<string, Submission[]>

const MAX_SUBMISSIONS_PER_PROBLEM = 30

const isDuration = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0
/** Out-of-range timestamps (valid JSON, invalid Date) would make the `Intl` date formatters throw. */
const isTimestamp = (value: unknown) => typeof value === 'number' && !Number.isNaN(new Date(value).getTime())

function isSubmission(value: unknown): value is Submission {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    VERDICTS.includes(value.verdict as Verdict) &&
    isTimestamp(value.timestamp) &&
    isDuration(value.runtimeMs) &&
    isCount(value.passed) &&
    isCount(value.total) &&
    value.passed <= value.total &&
    typeof value.code === 'string' &&
    (value.solveTimeMs === undefined || isDuration(value.solveTimeMs))
  )
}

function parseSubmissions(raw: unknown): SubmissionMap {
  if (!isRecord(raw)) return {}
  const result: SubmissionMap = {}
  for (const [slug, list] of Object.entries(raw)) {
    // Unknown slugs are dropped: removed problems, or a `__proto__` key that would replace `result`'s prototype.
    if (!findProblem(slug) || !Array.isArray(list)) continue
    const valid = list.filter(isSubmission)
    if (valid.length > 0) result[slug] = valid.slice(-MAX_SUBMISSIONS_PER_PROBLEM)
  }
  return result
}

export const submissionsStore = createPersistedStore<SubmissionMap>('submissions', parseSubmissions, {})

export function recordSubmission(slug: string, submission: Submission): void {
  submissionsStore.set((previous) => ({
    ...previous,
    [slug]: [...(previous[slug] ?? []), submission].slice(-MAX_SUBMISSIONS_PER_PROBLEM),
  }))
}

export type ProblemStatus = 'solved' | 'attempted' | 'todo'

export function statusOf(submissions: Submission[] | undefined): ProblemStatus {
  if (!submissions || submissions.length === 0) return 'todo'
  return submissions.some((s) => s.verdict === 'Accepted') ? 'solved' : 'attempted'
}

/* ---------- Per-problem flags (hints, give up) ---------- */

export interface ProblemFlags {
  hintsRevealed: number
  gaveUp: boolean
}

export type FlagMap = Record<string, ProblemFlags>

export const NO_FLAGS: ProblemFlags = { hintsRevealed: 0, gaveUp: false }

function parseFlags(raw: unknown): FlagMap {
  if (!isRecord(raw)) return {}
  const result: FlagMap = {}
  for (const [slug, value] of Object.entries(raw)) {
    const problem = findProblem(slug)
    if (!problem || !isRecord(value)) continue
    result[slug] = {
      hintsRevealed: clamp(Math.floor(asNumber(value.hintsRevealed, 0)), 0, problem.hints.length),
      gaveUp: value.gaveUp === true,
    }
  }
  return result
}

export const flagsStore = createPersistedStore<FlagMap>('flags', parseFlags, {})

function updateFlags(slug: string, update: (flags: ProblemFlags) => ProblemFlags): void {
  flagsStore.set((previous) => ({ ...previous, [slug]: update(previous[slug] ?? NO_FLAGS) }))
}

export function revealNextHint(slug: string, hintCount: number): void {
  updateFlags(slug, (flags) => ({ ...flags, hintsRevealed: Math.min(hintCount, flags.hintsRevealed + 1) }))
}

export function giveUp(slug: string): void {
  updateFlags(slug, (flags) => ({ ...flags, gaveUp: true }))
}

/* ---------- Timers ---------- */

export interface TimerState {
  /** Time accumulated before the current running stretch. */
  elapsedMs: number
  /** Epoch ms when the timer was last started, or null while paused. */
  startedAt: number | null
}

export type TimerMap = Record<string, TimerState>

export const STOPPED_TIMER: TimerState = { elapsedMs: 0, startedAt: null }

function parseTimers(raw: unknown): TimerMap {
  if (!isRecord(raw)) return {}
  const result: TimerMap = {}
  for (const [slug, value] of Object.entries(raw)) {
    if (!findProblem(slug) || !isRecord(value)) continue
    result[slug] = {
      elapsedMs: Math.max(0, asNumber(value.elapsedMs, 0)),
      startedAt: isTimestamp(value.startedAt) ? (value.startedAt as number) : null,
    }
  }
  return result
}

export const timersStore = createPersistedStore<TimerMap>('timers', parseTimers, {})

export function timerElapsed(timer: TimerState, now: number): number {
  return timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt))
}

export function startTimer(slug: string): void {
  timersStore.set((previous) => {
    const timer = previous[slug] ?? STOPPED_TIMER
    if (timer.startedAt !== null) return previous
    return { ...previous, [slug]: { ...timer, startedAt: Date.now() } }
  })
}

export function pauseTimer(slug: string): void {
  timersStore.set((previous) => {
    const timer = previous[slug]
    if (!timer || timer.startedAt === null) return previous
    return { ...previous, [slug]: { elapsedMs: timerElapsed(timer, Date.now()), startedAt: null } }
  })
}

export function resetTimer(slug: string): void {
  timersStore.set((previous) => {
    const rest = { ...previous }
    delete rest[slug]
    return rest
  })
}

/* ---------- Settings ---------- */

export interface Settings {
  fontSize: number
  sidebarOpen: boolean
  /** Problem pane width as a percentage of the workspace. */
  splitX: number
  /** Editor height as a percentage of the right column. */
  splitY: number
  lastSlug: string | null
}

export const FONT_SIZE = { min: 11, max: 22, default: 14 }
export const SPLIT_X = { min: 25, max: 65, default: 42 }
export const SPLIT_Y = { min: 30, max: 80, default: 62 }

const DEFAULT_SETTINGS: Settings = {
  fontSize: FONT_SIZE.default,
  sidebarOpen: true,
  splitX: SPLIT_X.default,
  splitY: SPLIT_Y.default,
  lastSlug: null,
}

function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULT_SETTINGS
  return {
    fontSize: clamp(Math.round(asNumber(raw.fontSize, FONT_SIZE.default)), FONT_SIZE.min, FONT_SIZE.max),
    sidebarOpen: typeof raw.sidebarOpen === 'boolean' ? raw.sidebarOpen : DEFAULT_SETTINGS.sidebarOpen,
    splitX: clamp(asNumber(raw.splitX, SPLIT_X.default), SPLIT_X.min, SPLIT_X.max),
    splitY: clamp(asNumber(raw.splitY, SPLIT_Y.default), SPLIT_Y.min, SPLIT_Y.max),
    lastSlug: typeof raw.lastSlug === 'string' ? raw.lastSlug : null,
  }
}

export const settingsStore = createPersistedStore<Settings>('settings', parseSettings, DEFAULT_SETTINGS)

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((previous) => ({ ...previous, ...patch }))
}

/* ---------- Code drafts (one key per problem, written often) ---------- */

const draftKey = (slug: string) => `code:${slug}`

export function loadDraft(slug: string): string | null {
  return readText(draftKey(slug))
}

export function saveDraft(slug: string, code: string): void {
  writeText(draftKey(slug), code)
}

export function clearDraft(slug: string): void {
  removeItem(draftKey(slug))
}

/** Wipes submissions, hints, timers and saved code. Settings are kept. */
export function resetAllProgress(): void {
  submissionsStore.set(() => ({}))
  flagsStore.set(() => ({}))
  timersStore.set(() => ({}))
  for (const problem of PROBLEMS) clearDraft(problem.slug)
}
