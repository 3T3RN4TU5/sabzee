import { useElementWidth } from '../../lib/hooks.ts'
import { dayKey, startOfDay } from '../../lib/stats.ts'

/** A 12px cell plus a 3px gap. */
const COLUMN_PX = 15
/** Weekday labels plus the gap next to them. */
const LABELS_PX = 34
const LEVELS = [
  'var(--color-raised)',
  'color-mix(in oklab, var(--color-accent) 30%, var(--color-raised))',
  'color-mix(in oklab, var(--color-accent) 55%, var(--color-raised))',
  'color-mix(in oklab, var(--color-accent) 80%, var(--color-raised))',
  'var(--color-accent-strong)',
]
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
const monthLabel = new Intl.DateTimeFormat('en', { month: 'short' })

function level(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

interface Cell {
  key: string
  time: number
  count: number
  future: boolean
}

/** GitHub-style calendar of submissions per day; shows as many weeks as fit. */
export function ActivityHeatmap({ activity, now }: { activity: Map<string, number>; now: number }) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const weeksShown = width === 0 ? 20 : Math.min(53, Math.max(8, Math.floor((width - LABELS_PX) / COLUMN_PX)))
  const today = startOfDay(now)
  const todayWeekday = new Date(today).getDay()
  // Start on the Sunday (weeksShown - 1) weeks before this week's Sunday.
  const first = startOfDay(today, -todayWeekday - (weeksShown - 1) * 7)

  const weeks: Cell[][] = []
  let total = 0
  for (let w = 0; w < weeksShown; w++) {
    const week: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const time = startOfDay(first, w * 7 + d)
      const key = dayKey(time)
      const count = activity.get(key) ?? 0
      total += count
      week.push({ key, time, count, future: time > today })
    }
    weeks.push(week)
  }

  // Label each week that contains the 1st of a month; label the first column
  // too unless a month label follows closely and would collide with it.
  const monthStarts = weeks.map((week) => week.find((cell) => new Date(cell.time).getDate() === 1))
  const nextStart = monthStarts.findIndex(Boolean)
  const monthLabels = monthStarts.map((cell, w) => {
    if (cell) return monthLabel.format(cell.time)
    if (w === 0 && (nextStart === -1 || nextStart >= 3)) return monthLabel.format(weeks[0][0].time)
    return ''
  })

  return (
    <div ref={containerRef}>
      <div className="flex gap-2 pb-1">
        <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-5 text-[10px] leading-3 text-ink-faint" aria-hidden>
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="h-3">
              {label}
            </span>
          ))}
        </div>
        <div role="img" aria-label={`${total} submissions in the last ${weeksShown} weeks`}>
          <div className="flex h-5 gap-[3px] text-[10px] text-ink-faint" aria-hidden>
            {monthLabels.map((label, w) => (
              <span key={w} className="w-3 overflow-visible whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, w) => (
              <div key={w} className="grid grid-rows-7 gap-[3px]">
                {week.map((cell) => (
                  <span
                    key={cell.key}
                    title={cell.future ? undefined : `${cell.count} submission${cell.count === 1 ? '' : 's'} · ${dateLabel.format(cell.time)}`}
                    className={`size-3 rounded-[3px] ${cell.future ? 'opacity-0' : ''} ${cell.time === today ? 'ring-1 ring-ink-faint' : ''}`}
                    style={{ background: LEVELS[level(cell.count)] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-ink-faint">
        <span>
          <span className="font-semibold text-ink-muted tabular-nums">{total}</span> submissions in the last {weeksShown} weeks
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          Less
          {LEVELS.map((color) => (
            <span key={color} className="size-3 rounded-[3px]" style={{ background: color }} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
