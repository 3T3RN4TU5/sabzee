import { Lightbulb, Lock } from 'lucide-react'
import { revealNextHint } from '../../lib/progress.ts'
import { FOCUS_RING } from '../../lib/theme.ts'
import type { Problem } from '../../problems/types.ts'
import { Inline } from '../RichText.tsx'

export function HintsTab({ problem, revealed }: { problem: Problem; revealed: number }) {
  const total = problem.hints.length
  const allRevealed = revealed >= total

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Hints</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Hints unlock one at a time, from a gentle nudge to the key insight. Try to make progress after each one before
          revealing the next.
        </p>
      </div>

      <ol className="space-y-3">
        {problem.hints.map((hint, i) => {
          const visible = i < revealed
          return (
            <li
              key={i}
              className={`rounded-lg border p-4 ${
                visible ? 'animate-fade-in border-amber-500/25 bg-amber-500/5' : 'border-dashed border-line text-ink-faint'
              }`}
            >
              <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${visible ? 'text-accent' : ''}`}>
                {visible ? <Lightbulb className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                Hint {i + 1}
              </p>
              {visible ? (
                <p className="text-sm leading-6 text-ink">
                  <Inline text={hint} />
                </p>
              ) : (
                <p className="text-sm">Locked</p>
              )}
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={() => revealNextHint(problem.slug, total)}
        disabled={allRevealed}
        className={`inline-flex items-center gap-2 rounded-md bg-raised px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:cursor-default disabled:opacity-50 ${FOCUS_RING}`}
      >
        <Lightbulb className="size-4 text-accent" aria-hidden />
        {allRevealed ? 'All hints revealed' : `Reveal hint ${revealed + 1} of ${total}`}
      </button>
    </div>
  )
}
