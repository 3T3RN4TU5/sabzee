import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useActiveBoard, useStore } from '../store'
import type { Task } from '../types'
import { matches, type Filters } from '../lib/filters'
import { Column } from './Column'
import { TaskCardBody } from './TaskCard'

export function BoardView({ filters, onOpenTask }: { filters: Filters; onOpenTask: (id: string) => void }) {
  const board = useActiveBoard()
  const tasks = useStore((s) => s.tasks)
  const labels = useStore((s) => s.labels)
  const moveTask = useStore((s) => s.moveTask)
  const addColumn = useStore((s) => s.addColumn)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newColumn, setNewColumn] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const findColumn = (id: string) => board.columns.find((c) => c.id === id || c.taskIds.includes(id))

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = findColumn(String(active.id))
    const to = findColumn(String(over.id))
    if (!from || !to || from.id === to.id) return
    const overIndex = to.taskIds.indexOf(String(over.id))
    moveTask(String(active.id), to.id, overIndex >= 0 ? overIndex : to.taskIds.length)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const column = findColumn(String(active.id))
    if (!column || column.id !== findColumn(String(over.id))?.id) return
    const oldIndex = column.taskIds.indexOf(String(active.id))
    const newIndex = over.id === column.id ? column.taskIds.length - 1 : column.taskIds.indexOf(String(over.id))
    if (newIndex >= 0 && oldIndex !== newIndex) moveTask(String(active.id), column.id, newIndex)
  }

  const activeTask = activeId ? tasks[activeId] : null
  const lastColumnId = board.columns[board.columns.length - 1]?.id

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex h-full items-start gap-4 overflow-x-auto p-4 sm:p-6">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={column.taskIds.map((id) => tasks[id]).filter((t): t is Task => Boolean(t) && matches(t, filters))}
            labels={labels}
            isDoneColumn={column.id === lastColumnId}
            canDelete={board.columns.length > 1}
            onOpenTask={onOpenTask}
          />
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newColumn.trim()) return
            addColumn(newColumn.trim())
            setNewColumn('')
          }}
          className="w-72 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 p-3 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-slate-400" />
            <input
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              placeholder="Add another list"
              aria-label="New list title"
              className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>
        </form>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-66 rotate-2 cursor-grabbing rounded-xl border border-indigo-300 bg-white p-3 shadow-2xl dark:border-indigo-500 dark:bg-slate-800">
            <TaskCardBody task={activeTask} labels={labels} done={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
