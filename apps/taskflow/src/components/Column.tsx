import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Column as ColumnType, Label, Task } from '../types'
import { useStore } from '../store'
import { TaskCard } from './TaskCard'

interface Props {
  column: ColumnType
  tasks: Task[]
  labels: Label[]
  isDoneColumn: boolean
  canDelete: boolean
  onOpenTask: (id: string) => void
}

export function Column({ column, tasks, labels, isDoneColumn, canDelete, onOpenTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const addTask = useStore((s) => s.addTask)
  const renameColumn = useStore((s) => s.renameColumn)
  const deleteColumn = useStore((s) => s.deleteColumn)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    addTask(column.id, draft.trim())
    setDraft('')
  }

  return (
    <section className="flex max-h-full w-72 shrink-0 flex-col rounded-2xl bg-slate-100/80 dark:bg-slate-900/60" aria-label={column.title}>
      <header className="relative flex items-center gap-2 px-3 pt-3 pb-2">
        {editing ? (
          <input
            autoFocus
            defaultValue={column.title}
            aria-label="Column title"
            onBlur={(e) => {
              if (e.target.value.trim()) renameColumn(column.id, e.target.value.trim())
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-sm font-bold outline-none dark:bg-slate-800"
          />
        ) : (
          <h2 onDoubleClick={() => setEditing(true)} className="flex-1 truncate text-sm font-bold text-slate-700 dark:text-slate-200">
            {isDoneColumn && '✅ '}
            {column.title}
          </h2>
        )}
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {tasks.length}
        </span>
        <button
          type="button"
          aria-label="Column options"
          onClick={() => setMenu((m) => !m)}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menu && (
          <div className="absolute top-10 right-3 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <button type="button" onClick={() => { setEditing(true); setMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Pencil className="h-3.5 w-3.5" /> Rename
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => {
                if (confirm(`Delete "${column.title}" and its ${tasks.length} task(s)?`)) deleteColumn(column.id)
                setMenu(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete column
            </button>
          </div>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2 transition ${isOver ? 'rounded-xl bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} labels={labels} done={isDoneColumn} onOpen={() => onOpenTask(task.id)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !adding && (
          <p className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-xs font-medium text-slate-400 dark:border-slate-700">
            Drop tasks here
          </p>
        )}
      </div>

      <div className="p-3 pt-1">
        {adding ? (
          <form onSubmit={submit}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e)
                if (e.key === 'Escape') setAdding(false)
              }}
              rows={2}
              placeholder="What needs to be done?"
              aria-label="New task title"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-2 flex gap-2">
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
                Add task
              </button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Plus className="h-4 w-4" /> Add a task
          </button>
        )}
      </div>
    </section>
  )
}
