import { useCallback, useEffect, useRef, useState } from 'react'
import type { Problem } from '../problems/types.ts'
import type { RunRequest, TestReport, WorkerMessage } from './protocol.ts'
import { buildOutcome, type PlannedCase, type RunEnding, type RunMode, type RunOutcome } from './verdict.ts'

/** Wall-clock budget for one Run / Submit, including loading the code. */
export const TIME_LIMIT_MS = 3000

function createWorker() {
  return new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' })
}

/**
 * Owns the judge workers. Every run gets a pristine worker that is discarded
 * afterwards, so globals, patched built-ins or timers left behind by user code
 * never leak into the next run. A run that exceeds the time limit (an infinite
 * loop, say) is stopped by terminating its worker, so the page never freezes.
 */
export function useRunner() {
  /** The warmed-up worker for the next run (null while a run owns it). */
  const spareRef = useRef<Worker | null>(null)
  /** Aborts the in-flight run; set only while a run is active. */
  const abortRef = useRef<(() => void) | null>(null)
  const [running, setRunning] = useState<RunMode | null>(null)

  useEffect(() => {
    // Warm a worker up so the first run does not pay for module loading.
    spareRef.current = createWorker()
    return () => {
      abortRef.current?.()
      spareRef.current?.terminate()
      spareRef.current = null
    }
  }, [])

  /**
   * Judges `code` against the problem's tests. Resolves to null when another
   * run is already in progress, or when the component unmounts mid-run.
   */
  const execute = useCallback((problem: Problem, code: string, mode: RunMode): Promise<RunOutcome | null> => {
    if (abortRef.current) return Promise.resolve(null)

    const planned: PlannedCase[] = []
    const tests: RunRequest['tests'] = []
    problem.tests.forEach((test, testIndex) => {
      if (mode === 'run' && test.hidden) return
      planned.push({ testIndex, hidden: test.hidden ?? false })
      tests.push({ input: test.input, expected: test.expected })
    })

    const worker = spareRef.current ?? createWorker()
    spareRef.current = null
    setRunning(mode)

    return new Promise<RunOutcome | null>((resolve) => {
      const reports: TestReport[] = []
      let settled = false

      /** Ends the run exactly once; `null` means it was aborted. */
      const settle = (ending: RunEnding | null) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        worker.terminate()
        abortRef.current = null
        if (ending === null) {
          resolve(null)
          return
        }
        spareRef.current = createWorker()
        setRunning(null)
        resolve(buildOutcome(mode, planned, reports, ending))
      }

      worker.addEventListener('message', (event: MessageEvent<WorkerMessage | null>) => {
        // User code shares the worker's global scope, so ignore anything that is not a judge message.
        const message = event.data
        switch (message?.type) {
          case 'test':
            reports.push(message.report)
            break
          case 'done':
            settle({ kind: 'done' })
            break
          case 'load-error':
            settle({ kind: 'load-error', failure: message.failure, error: message.error, logs: message.logs })
            break
        }
      })
      worker.addEventListener('error', (event) => {
        event.preventDefault()
        settle({ kind: 'crash', error: event.message || 'The judge stopped unexpectedly (out of memory?).' })
      })

      const timer = window.setTimeout(() => settle({ kind: 'timeout' }), TIME_LIMIT_MS)
      abortRef.current = () => settle(null)

      const request: RunRequest = {
        code,
        functionName: problem.functionName,
        comparator: problem.comparator,
        mutatesArg: problem.mutatesArg,
        tests,
      }
      worker.postMessage(request)
    })
  }, [])

  return { execute, running }
}
