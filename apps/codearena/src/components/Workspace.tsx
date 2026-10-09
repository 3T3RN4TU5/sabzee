import { CloudUpload, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { panelId, tabId } from '../lib/a11y.ts'
import { MOD_ARIA, MOD_KEY, useMinWidth } from '../lib/hooks.ts'
import {
  clearDraft,
  flagsStore,
  loadDraft,
  NO_FLAGS,
  pauseTimer,
  recordSubmission,
  saveDraft,
  settingsStore,
  SPLIT_X,
  SPLIT_Y,
  submissionsStore,
  timerElapsed,
  timersStore,
  updateSettings,
  type Submission,
} from '../lib/progress.ts'
import { useStore } from '../lib/storage.ts'
import { FOCUS_RING } from '../lib/theme.ts'
import { starterCode } from '../problems/index.ts'
import type { Problem } from '../problems/types.ts'
import { useRunner } from '../runner/useRunner.ts'
import type { RunMode, RunOutcome } from '../runner/verdict.ts'
import { EditorPane } from './EditorPane.tsx'
import { ProblemPane, type ProblemTab } from './problem/ProblemPane.tsx'
import { ResultsPane, type ResultsTab } from './results/ResultsPane.tsx'
import { SplitHandle } from './SplitHandle.tsx'
import { Tabs } from './Tabs.tsx'
import { Timer } from './Timer.tsx'
import { Kbd, Spinner } from './ui.tsx'

type MobileTab = 'problem' | 'code' | 'result'

interface WorkspaceProps {
  problem: Problem
  /** Renders the top bar; the workspace supplies Run / Submit and the timer. */
  renderTopBar: (center: ReactNode, extra: ReactNode) => ReactNode
}

const NO_SUBMISSIONS: Submission[] = []
const AUTOSAVE_DELAY_MS = 400
/** Below 360px the top bar cannot fit Run and Submit with their icons. */
const COMPACT_ACTION = 'max-[359px]:px-2.5 max-[359px]:[&>svg]:hidden'

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** One problem's working area: statement, editor, judge results. Keyed by slug. */
export function Workspace({ problem, renderTopBar }: WorkspaceProps) {
  const { slug } = problem
  const isDesktop = useMinWidth(1024)
  const settings = useStore(settingsStore)
  const submissions = useStore(submissionsStore)[slug] ?? NO_SUBMISSIONS
  const flags = useStore(flagsStore)[slug] ?? NO_FLAGS
  const { execute, running } = useRunner()

  const [code, setCode] = useState(() => loadDraft(slug) ?? starterCode(problem))
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [outcomeId, setOutcomeId] = useState(0)
  const [solveTimeMs, setSolveTimeMs] = useState<number | undefined>(undefined)
  const [problemTab, setProblemTab] = useState<ProblemTab>('description')
  const [resultsTab, setResultsTab] = useState<ResultsTab>('testcase')
  const [mobileTab, setMobileTab] = useState<MobileTab>('problem')
  const [dragX, setDragX] = useState<number | null>(null)
  const [dragY, setDragY] = useState<number | null>(null)

  const layoutRef = useRef<HTMLDivElement>(null)
  const rightColumnRef = useRef<HTMLDivElement>(null)
  /** Latest code, so leaving the problem can save edits the debounce has not written yet. */
  const codeRef = useRef(code)

  const persistDraft = useCallback(
    (value: string) => {
      // Untouched starter code is not stored.
      if (value === starterCode(problem)) clearDraft(slug)
      else saveDraft(slug, value)
    },
    [problem, slug],
  )

  // Debounced autosave of the draft.
  useEffect(() => {
    codeRef.current = code
    const id = window.setTimeout(() => {
      persistDraft(code)
      setSaveState('saved')
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [code, persistDraft])

  // Leaving the problem (or closing / reloading the tab) saves pending edits and pauses the timer.
  useEffect(() => {
    const leave = () => {
      persistDraft(codeRef.current)
      pauseTimer(slug)
    }
    window.addEventListener('pagehide', leave)
    return () => {
      window.removeEventListener('pagehide', leave)
      leave()
    }
  }, [persistDraft, slug])

  const changeCode = useCallback((next: string) => {
    setCode(next)
    setSaveState('saving')
  }, [])

  const judge = useCallback(
    async (mode: RunMode) => {
      if (running) return
      setResultsTab('result')
      setMobileTab('result')
      const result = await execute(problem, code, mode)
      // null: another run was still in progress, or the problem was closed mid-run.
      if (!result) return
      let solvedIn: number | undefined
      if (mode === 'submit') {
        const timer = timersStore.get()[slug]
        if (result.verdict === 'Accepted' && timer) {
          solvedIn = timerElapsed(timer, Date.now())
          pauseTimer(slug)
        }
        recordSubmission(slug, {
          id: newId(),
          verdict: result.verdict,
          timestamp: Date.now(),
          runtimeMs: result.runtimeMs,
          passed: result.passed,
          total: result.total,
          code,
          solveTimeMs: solvedIn,
        })
      }
      setSolveTimeMs(solvedIn)
      setOutcome(result)
      setOutcomeId((id) => id + 1)
    },
    [running, execute, problem, code, slug],
  )

  // Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits — also from inside the editor.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.altKey) return
      if (document.querySelector('dialog[open]')) return
      // Capture phase + stopPropagation keeps CodeMirror from inserting a newline.
      event.preventDefault()
      event.stopPropagation()
      // Holding the keys down must not queue up a run per auto-repeat.
      if (!event.repeat) void judge(event.shiftKey ? 'submit' : 'run')
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [judge])

  const resetCode = () => {
    setCode(starterCode(problem))
    clearDraft(slug)
    setSaveState('saved')
  }

  const loadCode = (next: string) => {
    changeCode(next)
    setMobileTab('code')
  }

  const actions = (
    <>
      <button
        type="button"
        onClick={() => void judge('run')}
        disabled={running !== null}
        title={`Run sample tests (${MOD_KEY}+Enter)`}
        aria-keyshortcuts={`${MOD_ARIA}+Enter`}
        className={`inline-flex h-8 items-center gap-2 rounded-md bg-raised px-3 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:opacity-60 ${COMPACT_ACTION} ${FOCUS_RING}`}
      >
        {running === 'run' ? <Spinner className="size-3.5" /> : <Play className="size-3.5 fill-current" aria-hidden />}
        Run
        <span className="hidden items-center gap-0.5 xl:flex" aria-hidden>
          <Kbd>{MOD_KEY}</Kbd>
          <Kbd>↵</Kbd>
        </span>
      </button>
      <button
        type="button"
        onClick={() => void judge('submit')}
        disabled={running !== null}
        title={`Submit against all tests (${MOD_KEY}+Shift+Enter)`}
        aria-keyshortcuts={`${MOD_ARIA}+Shift+Enter`}
        className={`inline-flex h-8 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60 ${COMPACT_ACTION} ${FOCUS_RING}`}
      >
        {running === 'submit' ? <Spinner className="size-3.5" /> : <CloudUpload className="size-4" aria-hidden />}
        Submit
        <span className="hidden items-center gap-0.5 xl:flex [&_kbd]:border-emerald-300/40 [&_kbd]:bg-emerald-700/50 [&_kbd]:text-emerald-50" aria-hidden>
          <Kbd>{MOD_KEY}</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>↵</Kbd>
        </span>
      </button>
    </>
  )

  const problemPane = (
    <ProblemPane
      problem={problem}
      submissions={submissions}
      flags={flags}
      tab={problemTab}
      onTabChange={setProblemTab}
      onLoadCode={loadCode}
    />
  )
  const editorPane = (
    <EditorPane
      problem={problem}
      code={code}
      onChange={changeCode}
      onReset={resetCode}
      fontSize={settings.fontSize}
      saveState={saveState}
    />
  )
  const resultsPane = (
    <ResultsPane
      problem={problem}
      outcome={outcome}
      outcomeId={outcomeId}
      running={running}
      tab={resultsTab}
      onTabChange={setResultsTab}
      solveTimeMs={solveTimeMs}
    />
  )

  if (!isDesktop) {
    return (
      <>
        {renderTopBar(actions, null)}
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-2 py-1.5">
          <Tabs<MobileTab>
            idPrefix="mobile"
            label="Workspace panels"
            stretch
            className="flex-1"
            active={mobileTab}
            onChange={setMobileTab}
            items={[
              { id: 'problem', label: 'Problem' },
              { id: 'code', label: 'Code' },
              { id: 'result', label: 'Result' },
            ]}
          />
          <Timer slug={slug} />
        </div>
        <div
          role="tabpanel"
          id={panelId('mobile', mobileTab)}
          aria-labelledby={tabId('mobile', mobileTab)}
          className="min-h-0 flex-1 p-2"
        >
          {mobileTab === 'problem' && problemPane}
          {mobileTab === 'code' && editorPane}
          {mobileTab === 'result' && resultsPane}
        </div>
      </>
    )
  }

  const splitX = dragX ?? settings.splitX
  const splitY = dragY ?? settings.splitY

  return (
    <>
      {renderTopBar(actions, <Timer slug={slug} />)}
      <div ref={layoutRef} className="flex min-h-0 flex-1 p-2">
        <div className="min-w-0" style={{ width: `${splitX}%` }}>
          {problemPane}
        </div>
        <SplitHandle
          axis="x"
          containerRef={layoutRef}
          value={splitX}
          min={SPLIT_X.min}
          max={SPLIT_X.max}
          label="Resize problem and editor panes"
          onChange={setDragX}
          onCommit={(value) => {
            updateSettings({ splitX: value })
            setDragX(null)
          }}
        />
        <div ref={rightColumnRef} className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0" style={{ height: `${splitY}%` }}>
            {editorPane}
          </div>
          <SplitHandle
            axis="y"
            containerRef={rightColumnRef}
            value={splitY}
            min={SPLIT_Y.min}
            max={SPLIT_Y.max}
            label="Resize editor and results panes"
            onChange={setDragY}
            onCommit={(value) => {
              updateSettings({ splitY: value })
              setDragY(null)
            }}
          />
          <div className="min-h-0 flex-1">{resultsPane}</div>
        </div>
      </div>
    </>
  )
}
