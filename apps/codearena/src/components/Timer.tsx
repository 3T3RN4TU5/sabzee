import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { formatClock } from '../lib/format.ts'
import { useNow } from '../lib/hooks.ts'
import { pauseTimer, resetTimer, startTimer, STOPPED_TIMER, timerElapsed, timersStore } from '../lib/progress.ts'
import { useStore } from '../lib/storage.ts'
import { FOCUS_RING } from '../lib/theme.ts'

const TIMER_BUTTON = `inline-flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink ${FOCUS_RING}`

/** Per-problem stopwatch (start / pause / reset), persisted across reloads. */
export function Timer({ slug }: { slug: string }) {
  const timer = useStore(timersStore)[slug] ?? STOPPED_TIMER
  const running = timer.startedAt !== null
  const now = useNow(500, running)
  const elapsed = timerElapsed(timer, running ? now : 0)

  if (!running && elapsed === 0) {
    return (
      <button
        type="button"
        onClick={() => startTimer(slug)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink-muted hover:bg-hover hover:text-ink ${FOCUS_RING}`}
        title="Start a timer for this problem"
      >
        <TimerIcon className="size-4" aria-hidden />
        <span className="hidden lg:inline">Timer</span>
        <span className="sr-only lg:hidden">Start timer</span>
      </button>
    )
  }

  return (
    <div className="flex h-8 items-center gap-0.5 rounded-md border border-line bg-canvas/50 pl-2" role="group" aria-label="Problem timer">
      <TimerIcon className={`size-3.5 ${running ? 'text-accent' : 'text-ink-faint'}`} aria-hidden />
      <span
        className={`min-w-[3.25rem] px-1 font-mono text-[13px] tabular-nums ${running ? 'text-accent-strong' : 'text-ink-muted'}`}
        aria-live="off"
        role="timer"
      >
        {formatClock(elapsed)}
      </span>
      {running ? (
        <button type="button" onClick={() => pauseTimer(slug)} className={TIMER_BUTTON} aria-label="Pause timer" title="Pause">
          <Pause className="size-3.5" />
        </button>
      ) : (
        <button type="button" onClick={() => startTimer(slug)} className={TIMER_BUTTON} aria-label="Resume timer" title="Resume">
          <Play className="size-3.5" />
        </button>
      )}
      <button type="button" onClick={() => resetTimer(slug)} className={TIMER_BUTTON} aria-label="Reset timer" title="Reset">
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  )
}
