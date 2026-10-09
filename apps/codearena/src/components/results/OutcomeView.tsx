import { CircleAlert, CircleCheck, Hourglass, Lock, PartyPopper } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatClock, formatRuntime } from '../../lib/format.ts'
import { FOCUS_RING } from '../../lib/theme.ts'
import type { Problem } from '../../problems/types.ts'
import { formatValue } from '../../runner/format.ts'
import type { LogLine } from '../../runner/protocol.ts'
import { TIME_LIMIT_MS } from '../../runner/useRunner.ts'
import type { CaseResult, CaseStatus, RunOutcome } from '../../runner/verdict.ts'
import { ValueBlock } from './ValueBlock.tsx'
import { VerdictText } from './VerdictText.tsx'

interface OutcomeViewProps {
  problem: Problem
  outcome: RunOutcome
  solveTimeMs?: number
}

const DOT: Record<CaseStatus, string> = {
  passed: 'bg-pass',
  failed: 'bg-fail',
  error: 'bg-fail',
  timeout: 'bg-medium',
  skipped: 'bg-line-strong',
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  passed: 'passed',
  failed: 'wrong answer',
  error: 'runtime error',
  timeout: 'time limit exceeded',
  skipped: 'not run',
}

export function OutcomeView({ problem, outcome, solveTimeMs }: OutcomeViewProps) {
  const firstFailing = outcome.cases.findIndex((c) => c.status !== 'passed')
  const [selected, setSelected] = useState(Math.max(0, firstFailing))
  const isRun = outcome.mode === 'run'
  const allPassed = outcome.verdict === 'Accepted'
  const selectedCase = outcome.cases[selected]

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {isRun && allPassed ? <span className="text-pass">Sample tests passed</span> : <VerdictText verdict={outcome.verdict} />}
          </h2>
          <p className="text-xs text-ink-faint">{isRun ? 'Run · sample tests only' : 'Submit · all tests, including hidden'}</p>
        </div>
        {!outcome.loadError && (
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink tabular-nums">
              {outcome.passed} / {outcome.total}
            </span>{' '}
            testcases passed
            {outcome.verdict !== 'Time Limit Exceeded' && (
              <>
                {' '}
                · Runtime <span className="font-mono text-ink">{formatRuntime(outcome.runtimeMs)}</span>
              </>
            )}
          </p>
        )}
      </div>

      {!isRun && allPassed && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-pass" aria-hidden />
          <div>
            <p className="font-semibold text-pass">Problem solved!</p>
            <p className="text-ink-muted">
              All {outcome.total} tests passed{solveTimeMs !== undefined ? `, ${formatClock(solveTimeMs)} on the timer` : ''}. The
              reference solution is now unlocked in the Solution tab.
            </p>
          </div>
        </div>
      )}

      {isRun && allPassed && (
        <p className="text-sm text-ink-muted">
          Nice — now <strong className="text-ink">Submit</strong> to judge against the {problem.tests.filter((t) => t.hidden).length}{' '}
          hidden tests as well.
        </p>
      )}

      {outcome.verdict === 'Time Limit Exceeded' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-medium" aria-hidden />
          <p className="text-ink-muted">
            Execution was stopped after {TIME_LIMIT_MS / 1000} s. Look for an infinite loop, or an algorithm that is slower than the
            constraints allow.
          </p>
        </div>
      )}

      {outcome.loadError ? (
        <div className="space-y-3">
          <pre className="overflow-x-auto rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-[13px] leading-5 whitespace-pre-wrap text-fail">
            {outcome.loadError}
          </pre>
          <Logs lines={outcome.loadLogs} truncated={false} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Test cases">
            {outcome.cases.map((result, i) => (
              <button
                key={result.ordinal}
                type="button"
                aria-pressed={selected === i}
                aria-label={`${result.hidden ? 'Hidden test' : isRun ? 'Case' : 'Test'} ${result.ordinal}: ${STATUS_LABEL[result.status]}`}
                onClick={() => setSelected(i)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${FOCUS_RING} ${
                  selected === i ? 'bg-hover text-ink' : 'text-ink-muted hover:bg-raised'
                }`}
              >
                <span className={`size-1.5 rounded-full ${DOT[result.status]}`} aria-hidden />
                {result.hidden && <Lock className="size-3 text-ink-faint" aria-hidden />}
                {isRun ? 'Case' : 'Test'} {result.ordinal}
              </button>
            ))}
          </div>
          {selectedCase && <CaseDetails problem={problem} result={selectedCase} />}
        </>
      )}
    </div>
  )
}

function CaseDetails({ problem, result }: { problem: Problem; result: CaseResult }) {
  const test = problem.tests[result.testIndex]
  const timing = result.status === 'passed' || result.status === 'failed' ? ` in ${formatRuntime(result.timeMs)}` : ''

  if (result.hidden) {
    return (
      <div className="space-y-3">
        <Notice status={result.status}>
          {result.status === 'passed' && `Hidden test ${result.ordinal} passed${timing}.`}
          {result.status === 'failed' &&
            `Hidden test ${result.ordinal} failed. Its input stays hidden — revisit the constraints and edge cases (empty input, duplicates, negatives, very large inputs).`}
          {result.status === 'error' && `Hidden test ${result.ordinal} threw an error.`}
          {result.status === 'timeout' && `Hidden test ${result.ordinal} exceeded the time limit.`}
          {result.status === 'skipped' && `Hidden test ${result.ordinal} was not run because judging stopped at an earlier test.`}
        </Notice>
        {result.error && <ErrorBlock message={result.error} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {result.status === 'timeout' && <Notice status="timeout">This test exceeded the time limit.</Notice>}
      {result.status === 'skipped' && <Notice status="skipped">Not run — judging stopped at an earlier test.</Notice>}
      {problem.params.map((param, j) => (
        <ValueBlock key={param.name} label={`${param.name} =`} value={formatValue(test.input[j])} />
      ))}
      {result.error ? (
        <ErrorBlock message={result.error} />
      ) : (
        result.actual !== undefined && (
          <ValueBlock
            label={problem.mutatesArg === undefined ? `Output${timing}` : `${problem.params[problem.mutatesArg].name} after your function${timing}`}
            value={result.actual}
            tone={result.status === 'passed' ? 'pass' : 'fail'}
          />
        )
      )}
      <ValueBlock label="Expected" value={formatValue(test.expected)} />
      <Logs lines={result.logs} truncated={result.logsTruncated} />
    </div>
  )
}

function Notice({ status, children }: { status: CaseStatus; children: ReactNode }) {
  const passed = status === 'passed'
  const Icon = passed ? CircleCheck : status === 'timeout' ? Hourglass : CircleAlert
  const tone = passed ? 'text-pass' : status === 'timeout' ? 'text-medium' : status === 'skipped' ? 'text-ink-faint' : 'text-fail'
  return (
    <p className="flex items-start gap-2 rounded-lg bg-raised px-3 py-2.5 text-sm text-ink-muted">
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-faint">Error</p>
      <pre className="overflow-x-auto rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[13px] leading-5 whitespace-pre-wrap text-fail">
        {message}
      </pre>
    </div>
  )
}

const LOG_TONE: Record<LogLine['level'], string> = {
  log: 'text-ink-muted',
  info: 'text-sky-300',
  debug: 'text-ink-faint',
  warn: 'text-medium',
  error: 'text-fail',
}

function Logs({ lines, truncated }: { lines: LogLine[]; truncated: boolean }) {
  if (lines.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-faint">Stdout</p>
      <pre className="max-h-48 overflow-auto rounded-lg bg-canvas px-3 py-2 font-mono text-[12.5px] leading-5 whitespace-pre-wrap">
        {lines.map((line, i) => (
          <span key={i} className={`block ${LOG_TONE[line.level]}`}>
            {line.text}
          </span>
        ))}
        {truncated && <span className="block text-ink-faint italic">… output truncated</span>}
      </pre>
    </div>
  )
}
