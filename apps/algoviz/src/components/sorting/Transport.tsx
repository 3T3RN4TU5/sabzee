import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useId, type CSSProperties } from 'react'
import { formatNumber } from '../../lib/utils.ts'
import { Button } from '../ui/controls.tsx'
import type { Playback } from './usePlayback.ts'

/** Play / pause / step / reset buttons plus a scrubbable timeline. */
export function Transport({ player, unit }: { player: Playback; unit: string }) {
  const sliderId = useId()
  const { position, length, playing, finished } = player
  const fill = length === 0 ? 0 : (position / length) * 100
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" onClick={player.reset} disabled={position === 0} aria-label="Reset to the beginning (R)" title="Reset (R)">
          <RotateCcw className="size-4" />
        </Button>
        <Button variant="secondary" onClick={() => player.stepBy(-1)} disabled={position === 0} aria-label="Step back (←)" title="Step back (←)">
          <SkipBack className="size-4" />
        </Button>
        <Button
          variant="primary"
          className="w-28"
          onClick={player.toggle}
          aria-label={playing ? 'Pause (Space)' : finished ? 'Replay (Space)' : 'Play (Space)'}
          title="Play / pause (Space)"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
        </Button>
        <Button variant="secondary" onClick={() => player.stepBy(1)} disabled={finished} aria-label="Step forward (→)" title="Step forward (→)">
          <SkipForward className="size-4" />
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <label htmlFor={sliderId} className="sr-only">
          Timeline
        </label>
        <input
          id={sliderId}
          type="range"
          className="range flex-1"
          min={0}
          max={length}
          value={position}
          aria-valuetext={`${unit} ${position} of ${length}`}
          style={{ '--fill': `${fill}%` } as CSSProperties}
          onChange={(e) => {
            player.pause()
            player.seek(Number(e.target.value))
          }}
        />
        <span className="shrink-0 text-xs text-slate-400 tabular-nums">
          {unit} <span className="font-semibold text-slate-200">{formatNumber(position)}</span> / {formatNumber(length)}
        </span>
      </div>
    </div>
  )
}
