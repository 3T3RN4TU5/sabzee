import { AlarmClock, CheckCircle2, Layers, TrendingUp } from 'lucide-react'
import { useActiveBoard, useStore } from '../store'
import type { Priority, Task } from '../types'
import { dueStatus, priorities } from '../lib/utils'

export function Insights() {
  const board = useActiveBoard()
  const tasks = useStore((s) => s.tasks)
  const doneColumn = board.columns[board.columns.length - 1]
  const all = board.columns.flatMap((c) => c.taskIds.map((id) => tasks[id]).filter((t): t is Task => Boolean(t)))
  const doneIds = new Set(doneColumn?.taskIds ?? [])
  const done = all.filter((t) => doneIds.has(t.id)).length
  const overdue = all.filter((t) => dueStatus(t, doneIds.has(t.id)) === 'overdue').length
  const completion = all.length ? Math.round((done / all.length) * 100) : 0
  const byPriority = (Object.keys(priorities) as Priority[]).map((p) => ({ p, n: all.filter((t) => t.priority === p && !doneIds.has(t.id)).length }))
  const maxP = Math.max(1, ...byPriority.map((x) => x.n))

  const stats = [
    { icon: Layers, label: 'Total tasks', value: all.length, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300' },
    { icon: CheckCircle2, label: 'Completed', value: done, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300' },
    { icon: AlarmClock, label: 'Overdue', value: overdue, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-300' },
    { icon: TrendingUp, label: 'Completion', value: `${completion}%`, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300' },
  ]

  return (
    <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:grid-cols-[repeat(4,1fr)_1.4fr] dark:border-slate-800 dark:bg-slate-950">
      {stats.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
        <p className="text-xs font-bold text-slate-500">Open work by priority</p>
        <div className="mt-2 space-y-1.5">
          {byPriority.map(({ p, n }) => (
            <div key={p} className="flex items-center gap-2 text-xs">
              <span className="w-12 font-semibold text-slate-600 dark:text-slate-300">{priorities[p].label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${priorities[p].dot}`} style={{ width: `${(n / maxP) * 100}%` }} />
              </div>
              <span className="w-4 text-right font-bold text-slate-700 dark:text-slate-200">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
