import type { Priority, Task } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const priorities: Record<Priority, { label: string; dot: string; badge: string; weight: number }> = {
  low: { label: 'Low', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200', weight: 0 },
  medium: { label: 'Medium', dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300', weight: 1 },
  high: { label: 'High', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', weight: 2 },
  urgent: { label: 'Urgent', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', weight: 3 },
}

export function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export function dueStatus(task: Pick<Task, 'dueDate'>, done: boolean): 'overdue' | 'today' | 'soon' | 'later' | null {
  if (!task.dueDate || done) return null
  const today = todayISO()
  if (task.dueDate < today) return 'overdue'
  if (task.dueDate === today) return 'today'
  if (task.dueDate <= todayISO(3)) return 'soon'
  return 'later'
}

export function formatDue(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
