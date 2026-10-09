import type { Comparator } from '../problems/types.ts'

/** Messages exchanged between the UI thread and `runner.worker.ts`. */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export interface LogLine {
  level: LogLevel
  text: string
}

export interface JudgeTest {
  input: unknown[]
  expected: unknown
}

/** One Run / Submit. Each request gets a fresh worker, which is discarded afterwards. */
export interface RunRequest {
  code: string
  functionName: string
  comparator: Comparator
  mutatesArg?: number
  tests: JudgeTest[]
}

export type TestStatus = 'passed' | 'failed' | 'error'

export interface TestReport {
  /** Position in `RunRequest.tests`. */
  index: number
  status: TestStatus
  /** Formatted return value (absent when the test threw). */
  actual?: string
  error?: string
  timeMs: number
  logs: LogLine[]
  logsTruncated: boolean
}

/** Why the code could not be turned into a callable function. */
export type LoadFailure = 'syntax' | 'runtime' | 'missing'

export type WorkerMessage =
  | { type: 'load-error'; failure: LoadFailure; error: string; logs: LogLine[] }
  | { type: 'test'; report: TestReport }
  | { type: 'done' }
