import type { DifficultyProgress } from '../../lib/stats.ts'
import { DIFFICULTY_MARK } from '../../lib/theme.ts'

const SIZE = 148
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Surface-coloured gap between adjacent segments, in px along the arc. */
const GAP = 3

/**
 * Donut showing solved problems out of the whole bank, one segment per
 * difficulty. The track represents unsolved problems.
 */
export function SolvedRing({ byDifficulty, solved, total }: { byDifficulty: DifficultyProgress[]; solved: number; total: number }) {
  const lengths = byDifficulty.filter((d) => d.solved > 0).map((d) => ({ ...d, length: (d.solved / total) * CIRCUMFERENCE }))
  const segments = lengths.map((d, i) => ({ ...d, offset: lengths.slice(0, i).reduce((sum, prev) => sum + prev.length, 0) }))

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        role="img"
        aria-label={`${solved} of ${total} problems solved: ${byDifficulty.map((d) => `${d.solved} ${d.difficulty}`).join(', ')}`}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-raised)" strokeWidth={STROKE} />
        {segments.map((segment) => {
          const visible = Math.max(segment.length - (segments.length > 1 || solved < total ? GAP : 0), 1)
          return (
            <circle
              key={segment.difficulty}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={DIFFICULTY_MARK[segment.difficulty]}
              strokeWidth={STROKE}
              strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
              strokeDashoffset={-segment.offset}
              className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
            >
              <title>{`${segment.difficulty}: ${segment.solved} solved`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">{solved}</span>
        <span className="text-xs text-ink-muted">of {total} solved</span>
      </div>
    </div>
  )
}
