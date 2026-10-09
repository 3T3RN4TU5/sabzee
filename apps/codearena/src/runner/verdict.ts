import type { LoadFailure, LogLine, TestReport, TestStatus } from './protocol.ts'

export type RunMode = 'run' | 'submit'

export const VERDICTS = [
  'Accepted',
  'Wrong Answer',
  'Runtime Error',
  'Compile Error',
  'Time Limit Exceeded',
] as const
export type Verdict = (typeof VERDICTS)[number]

export type CaseStatus = TestStatus | 'timeout' | 'skipped'

export interface CaseResult {
  /** 1-based position within this run. */
  ordinal: number
  /** Index into `problem.tests`. */
  testIndex: number
  hidden: boolean
  status: CaseStatus
  actual?: string
  error?: string
  timeMs: number
  logs: LogLine[]
  logsTruncated: boolean
}

export interface RunOutcome {
  mode: RunMode
  verdict: Verdict
  cases: CaseResult[]
  /** Set when the code could not be loaded at all (syntax error, missing function…). */
  loadError?: string
  loadLogs: LogLine[]
  passed: number
  total: number
  /** Sum of per-test execution time. */
  runtimeMs: number
}

export type RunEnding =
  | { kind: 'done' }
  | { kind: 'timeout' }
  | { kind: 'crash'; error: string }
  | { kind: 'load-error'; failure: LoadFailure; error: string; logs: LogLine[] }

export interface PlannedCase {
  testIndex: number
  hidden: boolean
}

type FailedStatus = Exclude<CaseStatus, 'passed' | 'skipped'>

const VERDICT_BY_STATUS: Record<FailedStatus, Verdict> = {
  failed: 'Wrong Answer',
  error: 'Runtime Error',
  timeout: 'Time Limit Exceeded',
}

function isFailed(result: CaseResult): result is CaseResult & { status: FailedStatus } {
  return result.status in VERDICT_BY_STATUS
}

/**
 * Merges streamed worker reports with how the run ended. The first test that
 * did not pass decides the verdict, mirroring how online judges stop at the
 * first failing case.
 */
export function buildOutcome(
  mode: RunMode,
  planned: PlannedCase[],
  reports: TestReport[],
  ending: RunEnding,
): RunOutcome {
  const byIndex = new Map(reports.map((report) => [report.index, report]))
  let endingAssigned = false

  const cases = planned.map((plan, i): CaseResult => {
    const base = { ordinal: i + 1, testIndex: plan.testIndex, hidden: plan.hidden }
    const report = byIndex.get(i)
    if (report) {
      const { status, actual, error, timeMs, logs, logsTruncated } = report
      return { ...base, status, actual, error, timeMs, logs, logsTruncated }
    }
    // The first test without a report is the one the run ended on; later ones were never reached.
    let status: CaseStatus = 'skipped'
    let error: string | undefined
    if (!endingAssigned && ending.kind !== 'load-error') {
      endingAssigned = true
      if (ending.kind === 'timeout') {
        status = 'timeout'
      } else {
        status = 'error'
        // A `done` with tests missing only happens when user code posts messages itself.
        error = ending.kind === 'crash' ? ending.error : 'The judge finished without reporting this test.'
      }
    }
    return { ...base, status, error, timeMs: 0, logs: [], logsTruncated: false }
  })

  const passed = cases.filter((c) => c.status === 'passed').length
  const runtimeMs = cases.reduce((sum, c) => sum + c.timeMs, 0)

  if (ending.kind === 'load-error') {
    return {
      mode,
      verdict: ending.failure === 'runtime' ? 'Runtime Error' : 'Compile Error',
      cases: cases.map((c) => ({ ...c, status: 'skipped' })),
      loadError: ending.error,
      loadLogs: ending.logs,
      passed: 0,
      total: cases.length,
      runtimeMs: 0,
    }
  }

  const firstFailure = cases.find(isFailed)
  const verdict = firstFailure ? VERDICT_BY_STATUS[firstFailure.status] : 'Accepted'

  return { mode, verdict, cases, loadLogs: [], passed, total: cases.length, runtimeMs }
}
