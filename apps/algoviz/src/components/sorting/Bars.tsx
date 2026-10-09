import { memo } from 'react'
import type { SortFrame } from '../../algorithms/sorting/timeline.ts'
import { cn } from '../../lib/utils.ts'
import { BAR_STATES, type BarState } from './barStates.ts'

const BAR_CLASS: Record<BarState, string> = {
  idle: 'bg-linear-to-t from-indigo-500/60 to-sky-400/70',
  compare: 'bg-amber-300 shadow-[0_0_14px_rgb(252_211_77/0.55)]',
  swap: 'bg-rose-500 shadow-[0_0_14px_rgb(244_63_94/0.6)]',
  pivot: 'bg-fuchsia-400 shadow-[0_0_14px_rgb(232_121_249/0.55)]',
  sorted: 'bg-linear-to-t from-emerald-500/80 to-emerald-300',
}

function barState(i: number, frame: SortFrame): BarState {
  const { step } = frame
  if (step) {
    if (step.type === 'compare' && (step.i === i || step.j === i)) return 'compare'
    if (step.type === 'swap' && (step.i === i || step.j === i)) return 'swap'
    if (step.type === 'overwrite' && step.i === i) return 'swap'
  }
  if (frame.pivot === i) return 'pivot'
  return frame.sorted[i] ? 'sorted' : 'idle'
}

const gapFor = (n: number) => (n <= 16 ? 6 : n <= 40 ? 4 : n <= 80 ? 2 : 1)

/** Renders one bar per value; heights are percentages of the container. */
export const Bars = memo(function Bars({ frame, label, compact = false }: { frame: SortFrame; label: string; compact?: boolean }) {
  const n = frame.values.length
  const showValues = !compact && n <= 24
  return (
    <div className="flex h-full items-end" style={{ gap: gapFor(n) }} role="img" aria-label={label}>
      {frame.values.map((value, i) => (
        <div
          key={i}
          className={cn('relative min-w-0 flex-1 rounded-t-[3px]', BAR_CLASS[barState(i, frame)])}
          style={{ height: `${value}%` }}
        >
          {showValues && (
            <span className="absolute inset-x-0 -top-5 text-center text-[10px] font-medium text-slate-400 tabular-nums">
              {value}
            </span>
          )}
        </div>
      ))}
    </div>
  )
})

export function BarLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400', className)} aria-label="Colour legend">
      {BAR_STATES.map(({ state, label, swatch }) => (
        <li key={state} className="flex items-center gap-1.5">
          <span className={cn('h-3 w-3 rounded-sm', swatch)} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}
