import { Check, Clock, Copy, Flag, HardDrive, Lightbulb, Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { giveUp } from '../../lib/progress.ts'
import { FOCUS_RING } from '../../lib/theme.ts'
import type { Problem } from '../../problems/types.ts'
import { ConfirmDialog } from '../ConfirmDialog.tsx'
import { Editor } from '../editor/Editor.tsx'
import { RichText } from '../RichText.tsx'

interface SolutionTabProps {
  problem: Problem
  unlocked: boolean
  onShowHints: () => void
}

export function SolutionTab({ problem, unlocked, onShowHints }: SolutionTabProps) {
  const [confirming, setConfirming] = useState(false)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyResetTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(copyResetTimer.current), [])

  if (!unlocked) {
    return (
      <div className="flex h-full animate-fade-in flex-col items-center justify-center px-4 py-10 text-center">
        <div className="grid size-14 place-items-center rounded-2xl border border-line bg-raised">
          <Lock className="size-6 text-ink-faint" aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold text-ink">The solution is locked</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          Submit your code at least once to unlock the reference solution — or give up if you are truly stuck.
          Wrestling with a problem first is where most of the learning happens.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onShowHints}
            className={`inline-flex items-center gap-2 rounded-md bg-raised px-3.5 py-2 text-sm font-medium text-ink hover:bg-hover ${FOCUS_RING}`}
          >
            <Lightbulb className="size-4 text-accent" aria-hidden /> Try a hint first
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`inline-flex items-center gap-2 rounded-md border border-rose-500/40 px-3.5 py-2 text-sm font-medium text-hard hover:bg-rose-500/10 ${FOCUS_RING}`}
          >
            <Flag className="size-4" aria-hidden /> Give up &amp; show solution
          </button>
        </div>
        <ConfirmDialog
          open={confirming}
          title="Give up on this problem?"
          message="The reference solution will be revealed. You can still solve the problem yourself afterwards."
          confirmLabel="Show solution"
          tone="danger"
          onConfirm={() => giveUp(problem.slug)}
          onClose={() => setConfirming(false)}
        />
      </div>
    )
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(problem.solution.code)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
    window.clearTimeout(copyResetTimer.current)
    copyResetTimer.current = window.setTimeout(() => setCopy('idle'), 2000)
  }

  return (
    <article className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-base font-semibold text-ink">Approach</h2>
        <RichText blocks={problem.solution.approach} className="mt-2 text-[15px] leading-7 text-ink/90" />
      </div>

      <dl className="flex flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-raised/60 px-3 py-1.5">
          <Clock className="size-4 text-accent" aria-hidden />
          <dt className="text-ink-muted">Time</dt>
          <dd className="font-mono text-[13px] text-ink">{problem.solution.time}</dd>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-raised/60 px-3 py-1.5">
          <HardDrive className="size-4 text-accent" aria-hidden />
          <dt className="text-ink-muted">Space</dt>
          <dd className="font-mono text-[13px] text-ink">{problem.solution.space}</dd>
        </div>
      </dl>

      <div className="overflow-hidden rounded-lg border border-line bg-canvas/40">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="text-xs font-medium text-ink-muted">JavaScript · reference solution</span>
          <button
            type="button"
            onClick={copyCode}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-ink-muted hover:bg-hover hover:text-ink ${FOCUS_RING}`}
          >
            {copy === 'copied' ? <Check className="size-3.5 text-pass" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            <span aria-live="polite">{copy === 'copied' ? 'Copied' : copy === 'failed' ? 'Copy failed' : 'Copy'}</span>
          </button>
        </div>
        <Editor value={problem.solution.code} readOnly fontSize={13} label={`Reference solution for ${problem.title}`} />
      </div>
    </article>
  )
}
