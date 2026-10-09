import { Check, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { SortAlgorithm } from '../../algorithms/sorting/index.ts'
import { cn } from '../../lib/utils.ts'
import { complexityTone } from './complexity.ts'

export function Badge({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        ok ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400',
      )}
    >
      {ok ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
      {ok ? children : `Not ${children.toLowerCase()}`}
    </span>
  )
}

export function ComplexityGrid({ algorithm }: { algorithm: SortAlgorithm }) {
  const { complexity } = algorithm
  const cells: [string, string][] = [
    ['Best', complexity.best],
    ['Average', complexity.average],
    ['Worst', complexity.worst],
    ['Space', complexity.space],
  ]
  return (
    <dl className="grid grid-cols-2 gap-2">
      {cells.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-2 rounded-lg border border-white/[0.06] bg-slate-950/40 px-3 py-2">
          <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{label}</dt>
          <dd className={cn('font-mono text-[13px] font-medium whitespace-nowrap', complexityTone(value))}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Algorithm facts plus pseudocode with the executing line highlighted. */
export function InfoPanel({ algorithm, activeLine }: { algorithm: SortAlgorithm; activeLine: number }) {
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the active line visible inside the (scrollable) code block.
  useEffect(() => {
    const list = listRef.current
    const line = activeLine >= 0 ? list?.children[activeLine] : undefined
    if (!list || !(line instanceof HTMLElement)) return
    const top = line.offsetTop
    if (top < list.scrollTop || top + line.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - list.clientHeight / 2
    }
  }, [activeLine])

  return (
    <aside className="card flex flex-col gap-4 p-5" aria-label={`${algorithm.name} details`}>
      <div>
        <p className="eyebrow">How it works</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{algorithm.name}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge ok={algorithm.stable}>Stable</Badge>
          <Badge ok={algorithm.inPlace}>In-place</Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{algorithm.description}</p>
      </div>

      <div>
        <h3 className="eyebrow mb-2">Complexity</h3>
        <ComplexityGrid algorithm={algorithm} />
      </div>

      <div className="flex min-h-0 flex-col">
        <h3 className="eyebrow mb-2">Pseudocode</h3>
        <ol
          ref={listRef}
          className="relative max-h-[22rem] overflow-auto rounded-xl border border-white/[0.06] bg-slate-950/70 py-2 font-mono text-[12px] leading-[1.4rem]"
        >
          {algorithm.pseudocode.map((line, k) => {
            const active = k === activeLine
            return (
              <li
                key={k}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex border-l-2 pr-3 whitespace-pre transition-colors',
                  active ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100' : 'border-transparent text-slate-400',
                )}
              >
                <span className="w-8 shrink-0 pr-3 text-right text-slate-600 select-none" aria-hidden>
                  {k + 1}
                </span>
                {line}
              </li>
            )
          })}
        </ol>
      </div>
    </aside>
  )
}
