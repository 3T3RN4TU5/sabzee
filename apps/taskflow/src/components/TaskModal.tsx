import { useEffect, useState } from 'react'
import { CalendarDays, CheckSquare, Flag, Tag, Trash2, X } from 'lucide-react'
import { useStore } from '../store'
import type { Priority } from '../types'
import { priorities, uid } from '../lib/utils'

export function TaskModal({ taskId, columnTitle, onClose }: { taskId: string; columnTitle: string; onClose: () => void }) {
  const task = useStore((s) => s.tasks[taskId])
  const labels = useStore((s) => s.labels)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!task) return null

  const done = task.checklist.filter((c) => c.done).length
  const progress = task.checklist.length ? Math.round((done / task.checklist.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10" role="dialog" aria-modal="true" aria-labelledby="task-title">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500">
              in list <span className="text-indigo-600 dark:text-indigo-400">{columnTitle}</span>
            </p>
            <input
              id="task-title"
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              className="mt-1 w-full rounded-lg bg-transparent px-1 py-1 text-xl font-bold text-slate-900 outline-none focus:bg-slate-100 dark:text-white dark:focus:bg-slate-800"
            />
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <Flag className="h-3.5 w-3.5" /> Priority
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(priorities) as Priority[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateTask(task.id, { priority: key })}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    task.priority === key ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-500/30' : 'border-slate-200 dark:border-slate-700'
                  } ${priorities[key].badge}`}
                >
                  <span className={`h-2 w-2 rounded-full ${priorities[key].dot}`} />
                  {priorities[key].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="due" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <CalendarDays className="h-3.5 w-3.5" /> Due date
            </label>
            <div className="flex gap-2">
              <input
                id="due"
                type="date"
                value={task.dueDate ?? ''}
                onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
              />
              {task.dueDate && (
                <button type="button" onClick={() => updateTask(task.id, { dueDate: null })} className="text-xs font-semibold text-slate-500 hover:text-rose-600">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
            <Tag className="h-3.5 w-3.5" /> Labels
          </p>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => {
              const on = task.labels.includes(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateTask(task.id, { labels: on ? task.labels.filter((x) => x !== l.id) : [...task.labels, l.id] })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${on ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                  style={on ? { backgroundColor: l.color } : undefined}
                >
                  {on && '✓ '}
                  {l.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="desc" className="mb-2 block text-xs font-bold tracking-wide text-slate-500 uppercase">
            Description
          </label>
          <textarea
            id="desc"
            value={task.description}
            onChange={(e) => updateTask(task.id, { description: e.target.value })}
            rows={4}
            placeholder="Add more details…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <CheckSquare className="h-3.5 w-3.5" /> Checklist
            </p>
            {task.checklist.length > 0 && <span className="text-xs font-bold text-slate-500">{progress}%</span>}
          </div>
          {task.checklist.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
            </div>
          )}
          <ul className="space-y-1">
            {task.checklist.map((item) => (
              <li key={item.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={item.text}
                  onChange={() =>
                    updateTask(task.id, { checklist: task.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)) })
                  }
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className={`flex-1 text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{item.text}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item.text}`}
                  onClick={() => updateTask(task.id, { checklist: task.checklist.filter((c) => c.id !== item.id) })}
                  className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newItem.trim()) return
              updateTask(task.id, { checklist: [...task.checklist, { id: uid(), text: newItem.trim(), done: false }] })
              setNewItem('')
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item"
              aria-label="New checklist item"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-700">
              Add
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-400">Created {new Date(task.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this task?')) {
                deleteTask(task.id)
                onClose()
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" /> Delete task
          </button>
        </div>
      </div>
    </div>
  )
}
