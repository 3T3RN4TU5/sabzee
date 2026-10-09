import { Flag, Trophy } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import type { SortAlgorithm } from '../../algorithms/sorting/index.ts'
import { SortTimeline, type SortFrame } from '../../algorithms/sorting/timeline.ts'
import { cn, formatNumber } from '../../lib/utils.ts'
import { BarLegend, Bars } from './Bars.tsx'
import { complexityTone } from './complexity.ts'
import { Badge } from './InfoPanel.tsx'
import { SPEEDS } from './settings.ts'
import { StepCaption } from './StepCaption.tsx'
import { Transport } from './Transport.tsx'
import { usePlayback } from './usePlayback.ts'
import { useSortShortcuts } from './useSortShortcuts.ts'

interface Props {
  input: readonly number[]
  first: SortAlgorithm
  second: SortAlgorithm
  speed: number
  active: boolean
  onNewArray: () => void
}

interface Lane {
  algorithm: SortAlgorithm
  timeline: SortTimeline
}

const LANE_ACCENT = ['text-cyan-300 border-cyan-400/30 bg-cyan-400/10', 'text-violet-300 border-violet-400/30 bg-violet-400/10']

/**
 * Two algorithms on the same input, advanced by a shared clock measured in
 * operations (one compare, swap or write each), so the one that does less
 * work finishes first.
 */
export function RaceStage({ input, first, second, speed, active, onNewArray }: Props) {
  const lanes = useMemo<Lane[]>(
    () => [first, second].map((algorithm) => ({ algorithm, timeline: new SortTimeline(input, algorithm.run(input).steps) })),
    [input, first, second],
  )
  const length = Math.max(...lanes.map((l) => l.timeline.totalCost))
  const player = usePlayback(length, SPEEDS[speed], active)
  useSortShortcuts(active, player, onNewArray)

  const frames = lanes.map(({ timeline }) => timeline.frameAt(timeline.indexForCost(player.position)))
  const costs = lanes.map((l) => l.timeline.totalCost)
  const winner = costs[0] === costs[1] ? -1 : costs[0] < costs[1] ? 0 : 1

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-4 p-4 sm:p-5" aria-label="Race visualisation">
        <div className="grid gap-4 md:grid-cols-2">
          {lanes.map((lane, k) => (
            <RaceLane
              key={k}
              index={k}
              lane={lane}
              frame={frames[k]}
              position={player.position}
              playing={player.playing}
              outcome={winner === -1 ? 'tie' : winner === k ? 'win' : 'lose'}
              size={input.length}
            />
          ))}
        </div>
        <Transport player={player} unit="Operation" />
        <BarLegend />
      </section>
      <RaceSummary lanes={lanes} winner={winner} finished={player.finished} />
    </div>
  )
}

function RaceLane({
  index,
  lane,
  frame,
  position,
  playing,
  outcome,
  size,
}: {
  index: number
  lane: Lane
  frame: SortFrame
  position: number
  playing: boolean
  outcome: 'win' | 'tie' | 'lose'
  size: number
}) {
  const total = lane.timeline.totalCost
  const done = Math.min(position, total)
  const finished = position >= total
  const status = !finished ? (position === 0 ? 'Ready' : 'Sorting…') : outcome === 'win' ? 'Finished first' : outcome === 'tie' ? 'Tied' : 'Finished'
  const highlight = finished && outcome !== 'lose'
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-semibold text-white">
          <span className={cn('grid size-6 shrink-0 place-items-center rounded-md border text-xs', LANE_ACCENT[index])}>
            {index === 0 ? 'A' : 'B'}
          </span>
          <span className="truncate">{lane.algorithm.name}</span>
        </h3>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            highlight ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-400',
          )}
        >
          {highlight && <Trophy className="size-3" aria-hidden />}
          {finished && !highlight && <Flag className="size-3" aria-hidden />}
          {status}
        </span>
      </div>
      <div className="h-48 px-1 pt-2 sm:h-56">
        <Bars frame={frame} compact label={`${lane.algorithm.name}: ${size} bars`} />
      </div>
      <StepCaption frame={frame} playing={playing} className="text-xs" />
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
        <div className={cn('h-full rounded-full', index === 0 ? 'bg-cyan-400' : 'bg-violet-400')} style={{ width: `${total ? (done / total) * 100 : 100}%` }} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <LaneStat label="Operations" value={`${formatNumber(done)}`} />
        <LaneStat label="Comparisons" value={formatNumber(frame.comparisons)} />
        <LaneStat label="Writes" value={formatNumber(frame.writes)} />
      </dl>
    </div>
  )
}

function LaneStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
      <dt className="text-[10px] tracking-wider text-slate-400 uppercase">{label}</dt>
      <dd className="font-semibold text-slate-100 tabular-nums">{value}</dd>
    </div>
  )
}

function RaceSummary({ lanes, winner, finished }: { lanes: Lane[]; winner: number; finished: boolean }) {
  const totals = useMemo(() => lanes.map((l) => l.timeline.frameAt(l.timeline.length)), [lanes])
  const costs = lanes.map((l) => l.timeline.totalCost)
  const ratio = winner === -1 ? 1 : costs[1 - winner] / Math.max(1, costs[winner])
  const rows: { label: string; render: (lane: Lane, k: number) => ReactNode }[] = [
    { label: 'Average time', render: (l) => <span className={cn('font-mono', complexityTone(l.algorithm.complexity.average))}>{l.algorithm.complexity.average}</span> },
    { label: 'Worst time', render: (l) => <span className={cn('font-mono', complexityTone(l.algorithm.complexity.worst))}>{l.algorithm.complexity.worst}</span> },
    { label: 'Extra space', render: (l) => <span className="font-mono text-slate-200">{l.algorithm.complexity.space}</span> },
    { label: 'Stable', render: (l) => <Badge ok={l.algorithm.stable}>Stable</Badge> },
    { label: 'Operations on this input', render: (_, k) => (finished ? formatNumber(costs[k]) : '—') },
    { label: 'Comparisons', render: (_, k) => (finished ? formatNumber(totals[k].comparisons) : '—') },
    { label: 'Array writes', render: (_, k) => (finished ? formatNumber(totals[k].writes) : '—') },
  ]
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="race-summary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="race-summary" className="font-semibold text-white">
          Head to head
        </h2>
        <p className="text-sm text-slate-400" aria-live="polite">
          {!finished
            ? 'Both lanes advance one operation (compare, swap or write) per tick.'
            : winner === -1
              ? `Dead heat — both used ${formatNumber(costs[0])} operations.`
              : `${lanes[winner].algorithm.name} wins with ${formatNumber(costs[winner])} operations — ${ratio.toFixed(1)}× fewer than ${lanes[1 - winner].algorithm.name}.`}
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th scope="col" className="pb-2 font-medium">
                <span className="sr-only">Metric</span>
              </th>
              {lanes.map((l, k) => (
                <th key={k} scope="col" className={cn('pr-3 pb-2 font-semibold', k === 0 ? 'text-cyan-300' : 'text-violet-300')}>
                  {k === 0 ? 'A' : 'B'} · {l.algorithm.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-400 sm:pr-4">
                  {row.label}
                </th>
                {lanes.map((l, k) => (
                  <td
                    key={k}
                    className={cn(
                      'py-2 pr-3 whitespace-nowrap tabular-nums',
                      finished && winner === k && row.label === 'Operations on this input' ? 'font-semibold text-emerald-300' : 'text-slate-100',
                    )}
                  >
                    {row.render(l, k)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
