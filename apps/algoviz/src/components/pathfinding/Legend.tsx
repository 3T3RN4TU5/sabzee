import { cn } from '../../lib/utils.ts'

const ITEMS = [
  { label: 'Start', cls: 'cell--start' },
  { label: 'Target', cls: 'cell--target' },
  { label: 'Wall', cls: 'cell--wall' },
  { label: 'Weight (cost 5)', cls: 'cell--weight' },
  { label: 'Visited', cls: 'cell--visited' },
  { label: 'Shortest path', cls: 'cell--path' },
]

/** Uses the board's own cell classes so the legend always matches the grid. */
export function GridLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400" aria-label="Legend">
      {ITEMS.map(({ label, cls }) => (
        <li key={label} className="flex items-center gap-2">
          <span className={cn('cell size-4 rounded-[4px] shadow-none ring-1 ring-white/10', cls)} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}
