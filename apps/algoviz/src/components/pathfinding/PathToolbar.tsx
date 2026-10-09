import { BrickWall, Eraser, FastForward, Play, Trash2, Weight } from 'lucide-react'
import { PATH_ALGORITHMS, type PathId } from '../../algorithms/pathfinding/index.ts'
import type { MazeId } from '../../algorithms/pathfinding/mazes.ts'
import { Button, RangeField, Segmented, SelectField } from '../ui/controls.tsx'
import { SPEED_LEVELS, type BoardStatus, type Brush } from './board.ts'
import { MazeMenu } from './MazeMenu.tsx'
import type { PathSettings } from './settings.ts'

const ALGORITHM_OPTIONS = PATH_ALGORITHMS.map((a) => ({
  value: a.id,
  label: a.name,
  group: a.weighted ? 'Weighted' : 'Unweighted',
}))
const BRUSH_OPTIONS = [
  { value: 'wall' as const, label: 'Wall', icon: <BrickWall className="size-4" aria-hidden /> },
  { value: 'weight' as const, label: 'Weight', icon: <Weight className="size-4" aria-hidden /> },
]

const item = 'min-w-[9.5rem] flex-1'

export function PathToolbar({
  settings,
  status,
  onChange,
  onVisualize,
  onSkip,
  onGenerate,
  onClearPath,
  onClearBoard,
}: {
  settings: PathSettings
  status: BoardStatus
  onChange: (patch: Partial<PathSettings>) => void
  onVisualize: () => void
  onSkip: () => void
  onGenerate: (id: MazeId) => void
  onClearPath: () => void
  onClearBoard: () => void
}) {
  const busy = status === 'searching' || status === 'tracing' || status === 'generating'
  return (
    <section className="card relative z-20 p-4" aria-label="Pathfinding controls">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <SelectField<PathId>
          label="Algorithm"
          className="min-w-[12rem] flex-[1.4]"
          value={settings.algorithm}
          options={ALGORITHM_OPTIONS}
          disabled={busy}
          onChange={(algorithm) => onChange({ algorithm })}
        />
        <Segmented<Brush>
          label="Brush"
          className="w-full sm:w-auto"
          value={settings.brush}
          options={BRUSH_OPTIONS}
          onChange={(brush) => onChange({ brush })}
        />
        <div className="min-w-[12rem] flex-1">
          <MazeMenu onGenerate={onGenerate} disabled={busy} />
        </div>
        <RangeField
          label="Speed"
          className={item}
          min={0}
          max={SPEED_LEVELS.length - 1}
          value={settings.speed}
          valueText={SPEED_LEVELS[settings.speed].label}
          onChange={(speed) => onChange({ speed })}
        />
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="ghost" onClick={onClearPath} disabled={status === 'generating'} title="Clear the visited cells and path">
            <Eraser className="size-4" aria-hidden />
            <span className="sm:sr-only 2xl:not-sr-only">Clear path</span>
          </Button>
          <Button variant="ghost" onClick={onClearBoard} disabled={status === 'generating'} title="Remove all walls and weights">
            <Trash2 className="size-4" aria-hidden />
            <span className="sm:sr-only 2xl:not-sr-only">Clear walls</span>
          </Button>
          {busy ? (
            <Button
              variant="secondary"
              className="order-first col-span-2 sm:order-none sm:w-36"
              // Skip replaces Visualize in place: ignore the second click of a double-click.
              onClick={(e) => {
                if (e.detail <= 1) onSkip()
              }}
            >
              <FastForward className="size-4" aria-hidden />
              Skip
            </Button>
          ) : (
            <Button variant="primary" className="order-first col-span-2 sm:order-none sm:w-36" onClick={onVisualize}>
              <Play className="size-4" aria-hidden />
              Visualize
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
