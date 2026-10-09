import { useMemo } from 'react'
import type { SortAlgorithm } from '../../algorithms/sorting/index.ts'
import { SortTimeline } from '../../algorithms/sorting/timeline.ts'
import { formatNumber } from '../../lib/utils.ts'
import { StatTile } from '../ui/controls.tsx'
import { BarLegend, Bars } from './Bars.tsx'
import { InfoPanel } from './InfoPanel.tsx'
import { SPEEDS } from './settings.ts'
import { StepCaption } from './StepCaption.tsx'
import { Transport } from './Transport.tsx'
import { usePlayback } from './usePlayback.ts'
import { useSortShortcuts } from './useSortShortcuts.ts'

interface Props {
  input: readonly number[]
  algorithm: SortAlgorithm
  speed: number
  active: boolean
  onNewArray: () => void
}

/** One algorithm on one input, with full playback controls and pseudocode. */
export function SingleStage({ input, algorithm, speed, active, onNewArray }: Props) {
  const timeline = useMemo(() => new SortTimeline(input, algorithm.run(input).steps), [input, algorithm])
  const player = usePlayback(timeline.length, SPEEDS[speed], active)
  const frame = useMemo(() => timeline.frameAt(player.position), [timeline, player.position])
  useSortShortcuts(active, player, onNewArray)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <section className="card flex min-w-0 flex-col gap-4 p-4 sm:p-5" aria-label={`${algorithm.name} visualisation`}>
        <StepCaption frame={frame} playing={player.playing} />
        <div className="h-64 rounded-xl border border-white/[0.04] bg-slate-950/50 px-2 pt-7 sm:h-[22rem] sm:px-3">
          <Bars frame={frame} label={`${algorithm.name}: ${input.length} bars, step ${player.position} of ${timeline.length}`} />
        </div>
        <Transport player={player} unit="Step" />
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Comparisons" value={formatNumber(frame.comparisons)} />
          <StatTile label="Swaps" value={formatNumber(frame.swaps)} />
          <StatTile label="Array writes" value={formatNumber(frame.writes)} hint="Every swap counts as two writes" />
          <StatTile label="Step" value={`${formatNumber(player.position)} of ${formatNumber(timeline.length)}`} />
        </dl>
        <BarLegend />
      </section>
      <InfoPanel algorithm={algorithm} activeLine={frame.step?.line ?? -1} />
    </div>
  )
}
