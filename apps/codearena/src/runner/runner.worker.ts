import { loadSolution, runTest } from './execute.ts'
import { formatLogArgs, formatValue } from './format.ts'
import type { LogLevel, LogLine, RunRequest, WorkerMessage } from './protocol.ts'

/**
 * Judge worker. Untrusted user code only ever runs here, so an infinite loop
 * blocks this thread, never the UI. Each worker judges a single request; the
 * main thread enforces the time limit by terminating it.
 */

interface WorkerScope {
  postMessage(message: WorkerMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<RunRequest>) => void): void
}

const scope = self as unknown as WorkerScope

const MAX_LOG_LINES = 50
const MAX_LOG_CHARS = 8000

class LogCollector {
  readonly lines: LogLine[] = []
  truncated = false
  private chars = 0

  push(level: LogLevel, args: unknown[]) {
    if (this.truncated) return
    const text = formatLogArgs(args)
    if (this.lines.length >= MAX_LOG_LINES || this.chars + text.length > MAX_LOG_CHARS) {
      this.truncated = true
      return
    }
    this.chars += text.length
    this.lines.push({ level, text })
  }
}

let activeLogs: LogCollector | null = null

// Route console output from user code into the collector of the running test.
const CONSOLE_LEVELS = {
  log: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
  dir: 'log',
  table: 'log',
  trace: 'log',
} as const satisfies Record<string, LogLevel>

for (const method of Object.keys(CONSOLE_LEVELS) as (keyof typeof CONSOLE_LEVELS)[]) {
  const level = CONSOLE_LEVELS[method]
  console[method] = (...args: unknown[]) => activeLogs?.push(level, args)
}

scope.addEventListener('message', (event) => {
  void judge(event.data)
})

async function judge(request: RunRequest) {
  const { tests, comparator, mutatesArg } = request

  const loadLogs = new LogCollector()
  activeLogs = loadLogs
  const loaded = loadSolution(request.code, request.functionName)
  activeLogs = null

  if (!loaded.ok) {
    scope.postMessage({ type: 'load-error', failure: loaded.failure, error: loaded.error, logs: loadLogs.lines })
    return
  }

  for (let index = 0; index < tests.length; index++) {
    const logs = new LogCollector()
    // Output printed while the file itself was evaluated belongs to the first test.
    if (index === 0) logs.lines.push(...loadLogs.lines)
    activeLogs = logs
    const outcome = await runTest(loaded.fn, tests[index], comparator, mutatesArg)
    activeLogs = null

    scope.postMessage({
      type: 'test',
      report: {
        index,
        status: outcome.status,
        actual: outcome.status === 'error' ? undefined : formatValue(outcome.actual),
        error: outcome.error,
        timeMs: outcome.timeMs,
        logs: logs.lines,
        logsTruncated: logs.truncated || (index === 0 && loadLogs.truncated),
      },
    })
  }

  scope.postMessage({ type: 'done' })
}
