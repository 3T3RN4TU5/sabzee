import { FlaskConical, SquareTerminal } from 'lucide-react'
import { useState } from 'react'
import { panelId, tabId } from '../../lib/a11y.ts'
import { MOD_KEY } from '../../lib/hooks.ts'
import { FOCUS_RING } from '../../lib/theme.ts'
import type { Problem } from '../../problems/types.ts'
import { formatValue } from '../../runner/format.ts'
import { TIME_LIMIT_MS } from '../../runner/useRunner.ts'
import type { RunMode, RunOutcome } from '../../runner/verdict.ts'
import { Tabs } from '../Tabs.tsx'
import { EmptyState, Kbd, Spinner } from '../ui.tsx'
import { OutcomeView } from './OutcomeView.tsx'
import { ValueBlock } from './ValueBlock.tsx'

export type ResultsTab = 'testcase' | 'result'

interface ResultsPaneProps {
  problem: Problem
  outcome: RunOutcome | null
  /** Increments with every finished run so per-run UI state resets. */
  outcomeId: number
  running: RunMode | null
  tab: ResultsTab
  onTabChange: (tab: ResultsTab) => void
  solveTimeMs?: number
}

const ID_PREFIX = 'results'

export function ResultsPane({ problem, outcome, outcomeId, running, tab, onTabChange, solveTimeMs }: ResultsPaneProps) {
  const hiddenCount = problem.tests.filter((test) => test.hidden).length

  return (
    <section aria-label="Test results" className="@container flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-1.5">
        <Tabs
          idPrefix={ID_PREFIX}
          label="Test panels"
          active={tab}
          onChange={onTabChange}
          items={[
            { id: 'testcase', label: 'Testcase', icon: <FlaskConical className="size-3.5 text-pass" aria-hidden /> },
            { id: 'result', label: 'Test Result', icon: <SquareTerminal className="size-3.5 text-accent" aria-hidden /> },
          ]}
        />
        <p className="hidden items-center gap-3 pr-2 text-[11px] text-ink-faint @xl:flex">
          <span className="flex items-center gap-1">
            Run <Kbd>{MOD_KEY}</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <span className="flex items-center gap-1">
            Submit <Kbd>{MOD_KEY}</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>↵</Kbd>
          </span>
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {running ? 'Running tests' : outcome ? `${outcome.verdict}: ${outcome.passed} of ${outcome.total} tests passed` : ''}
      </p>
      <div
        role="tabpanel"
        id={panelId(ID_PREFIX, tab)}
        aria-labelledby={tabId(ID_PREFIX, tab)}
        tabIndex={0}
        aria-busy={running !== null}
        className="min-h-0 flex-1 overflow-y-auto p-4 focus-visible:outline-none"
      >
        {tab === 'testcase' ? (
          <SampleCases problem={problem} />
        ) : running ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-3 text-sm text-ink-muted" role="status">
            <Spinner className="size-6 text-accent" />
            <p>
              {running === 'run'
                ? 'Running the sample tests…'
                : `Judging against all ${problem.tests.length} tests…`}
            </p>
            <p className="text-xs text-ink-faint">Time limit: {TIME_LIMIT_MS / 1000} s per run</p>
          </div>
        ) : outcome ? (
          <OutcomeView key={outcomeId} problem={problem} outcome={outcome} solveTimeMs={solveTimeMs} />
        ) : (
          <EmptyState icon={<SquareTerminal className="size-5" />} title="Run your code to see results">
            <p>
              <strong className="text-ink">Run</strong> (<Kbd>{MOD_KEY}</Kbd> <Kbd>↵</Kbd>) checks the sample cases.{' '}
              <strong className="text-ink">Submit</strong> (<Kbd>{MOD_KEY}</Kbd> <Kbd>⇧</Kbd> <Kbd>↵</Kbd>) judges all{' '}
              {problem.tests.length} tests, {hiddenCount} of them hidden. Use <code className="font-mono text-ink">console.log</code>{' '}
              to debug — output appears per test.
            </p>
          </EmptyState>
        )}
      </div>
    </section>
  )
}

function SampleCases({ problem }: { problem: Problem }) {
  const samples = problem.tests.filter((test) => !test.hidden)
  const [selected, setSelected] = useState(0)
  const sample = samples[Math.min(selected, samples.length - 1)]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sample cases">
        {samples.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
            className={`rounded-md px-3 py-1 text-[13px] font-medium transition-colors ${FOCUS_RING} ${
              selected === i ? 'bg-hover text-ink' : 'text-ink-muted hover:bg-raised'
            }`}
          >
            Case {i + 1}
          </button>
        ))}
      </div>
      {problem.params.map((param, j) => (
        <ValueBlock key={param.name} label={`${param.name} =`} value={formatValue(sample.input[j])} />
      ))}
      <ValueBlock label="Expected" value={formatValue(sample.expected)} />
      <p className="text-xs text-ink-faint">
        Sample cases mirror the examples. Submit also runs {problem.tests.length - samples.length} hidden tests.
      </p>
    </div>
  )
}
