import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlignLeft, CalendarDays, CheckSquare } from 'lucide-react'
import type { Label, Task } from '../types'
import { dueStatus, formatDue, priorities } from '../lib/utils'

const dueStyles = {
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  today: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  soon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  later: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
}

interface Props {
  task: Task
  labels: Label[]
  done: boolean
  onOpen?: () => void
  overlay?: boolean
}

export function TaskCardBody({ task, labels, done }: Omit<Props, 'onOpen' | 'overlay'>) {
  const p = priorities[task.priority]
  const due = dueStatus(task, done)
  const checked = task.checklist.filter((c) => c.done).length
  const taskLabels = labels.filter((l) => task.labels.includes(l.id))

  return (
    <>
      {taskLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <span key={l.id} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}
      <p className={`text-sm leading-snug font-semibold ${done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
        {task.title}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${p.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
          {p.label}
        </span>
        {task.dueDate && (
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${due ? dueStyles[due] : dueStyles.later}`}>
            <CalendarDays className="h-3 w-3" />
            {due === 'overdue' ? 'Overdue · ' : due === 'today' ? 'Today · ' : ''}
            {formatDue(task.dueDate)}
          </span>
        )}
        {task.checklist.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
              checked === task.checklist.length
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            {checked}/{task.checklist.length}
          </span>
        )}
        {task.description && <AlignLeft className="h-3.5 w-3.5 text-slate-400" aria-label="Has description" />}
      </div>
    </>
  )
}

export function TaskCard({ task, labels, done, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen?.()
        listeners?.onKeyDown?.(e)
      }}
      className={`group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/60 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardBody task={task} labels={labels} done={done} />
    </div>
  )
}
