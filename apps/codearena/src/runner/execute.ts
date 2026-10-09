import type { Comparator } from '../problems/types.ts'
import { matches } from './compare.ts'
import { formatValue } from './format.ts'
import type { JudgeTest, LoadFailure, TestStatus } from './protocol.ts'

/**
 * Pure judging core shared by the Web Worker and `scripts/verify-problems.ts`.
 * It has no DOM or worker dependencies so it runs unchanged in Node.
 */

export type SolutionFn = (...args: unknown[]) => unknown

export type LoadResult =
  | { ok: true; fn: SolutionFn }
  | { ok: false; failure: LoadFailure; error: string }

export interface TestOutcome {
  status: TestStatus
  actual?: unknown
  error?: string
  timeMs: number
}

const SOURCE_URL = 'solution.js'
/** `function anonymous(` + `) {` + `"use strict";` precede the user's first line. */
const PRELUDE_LINES = 3

/** Evaluates the user's source and returns the function named `functionName`. */
export function loadSolution(code: string, functionName: string): LoadResult {
  try {
    // Parse the user's code on its own first so syntax errors are not blamed
    // on the lookup statement appended below.
    new Function(`"use strict";\n${code}`)
  } catch (err) {
    return { ok: false, failure: 'syntax', error: describeError(err) }
  }

  let factory: () => unknown
  try {
    factory = new Function(
      `"use strict";\n${code}\n;return typeof ${functionName} === "function" ? ${functionName} : undefined;\n//# sourceURL=${SOURCE_URL}`,
    ) as () => unknown
  } catch (err) {
    return { ok: false, failure: 'syntax', error: describeError(err) }
  }

  let fn: unknown
  try {
    fn = factory()
  } catch (err) {
    return { ok: false, failure: 'runtime', error: describeError(err) }
  }

  if (typeof fn !== 'function') {
    return {
      ok: false,
      failure: 'missing',
      error: `Function "${functionName}" was not found. Keep the signature from the starter code: function ${functionName}(…) { … }`,
    }
  }
  return { ok: true, fn: fn as SolutionFn }
}

/** Runs one test against a fresh deep copy of its input and judges the result. */
export async function runTest(
  fn: SolutionFn,
  test: JudgeTest,
  comparator: Comparator,
  mutatesArg?: number,
): Promise<TestOutcome> {
  const args = structuredClone(test.input)
  const start = performance.now()
  try {
    let returned = fn(...args)
    if (isThenable(returned)) returned = await returned
    const timeMs = performance.now() - start
    const actual = mutatesArg === undefined ? returned : args[mutatesArg]
    return { status: matches(actual, test.expected, comparator) ? 'passed' : 'failed', actual, timeMs }
  } catch (err) {
    return { status: 'error', error: describeError(err), timeMs: performance.now() - start }
  }
}

/** Turns anything thrown by user code into a one-line, readable message. */
function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err instanceof RangeError && /call stack/i.test(err.message)) {
      return `RangeError: ${err.message} — check that your recursion has a base case`
    }
    const line = userLine(err.stack)
    return `${err.name}: ${err.message}${line === null ? '' : ` (line ${line})`}`
  }
  return `Uncaught ${formatValue(err)}`
}

function userLine(stack: string | undefined): number | null {
  const match = stack?.match(/solution\.js:(\d+):\d+/)
  if (!match) return null
  const line = Number(match[1]) - PRELUDE_LINES
  return line >= 1 ? line : null
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}
