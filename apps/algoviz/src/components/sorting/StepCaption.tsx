import type { SortFrame } from '../../algorithms/sorting/timeline.ts'
import { cn } from '../../lib/utils.ts'
import { describeStep } from './describeStep.ts'

const DOT: Record<string, string> = {
  compare: 'bg-amber-300',
  swap: 'bg-rose-500',
  overwrite: 'bg-rose-500',
  pivot: 'bg-fuchsia-400',
  sorted: 'bg-emerald-400',
}

/** What the algorithm is doing right now. Announced to screen readers only while paused. */
export function StepCaption({ frame, playing, className }: { frame: SortFrame; playing: boolean; className?: string }) {
  return (
    <p className={cn('flex min-h-6 items-center gap-2 text-sm text-slate-300', className)} aria-live={playing ? 'off' : 'polite'}>
      <span className={cn('size-2 shrink-0 rounded-full', frame.step ? DOT[frame.step.type] : 'bg-slate-600')} aria-hidden />
      <span className="truncate">{describeStep(frame)}</span>
    </p>
  )
}
