import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Board, Label, Task } from './types'
import { defaultLabels, seedBoards, seedTasks } from './lib/seed'
import { uid } from './lib/utils'

interface State {
  boards: Board[]
  tasks: Record<string, Task>
  labels: Label[]
  activeBoardId: string
  dark: boolean

  setActiveBoard: (id: string) => void
  addBoard: (name: string, emoji: string) => void
  renameBoard: (id: string, name: string) => void
  deleteBoard: (id: string) => void

  addColumn: (title: string) => void
  renameColumn: (columnId: string, title: string) => void
  deleteColumn: (columnId: string) => void

  addTask: (columnId: string, title: string) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, toColumnId: string, toIndex: number) => void

  toggleDark: () => void
  resetDemo: () => void
}

const mapActiveBoard = (s: State, fn: (b: Board) => Board) => ({
  boards: s.boards.map((b) => (b.id === s.activeBoardId ? fn(b) : b)),
})

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      boards: seedBoards,
      tasks: seedTasks,
      labels: defaultLabels,
      activeBoardId: seedBoards[0].id,
      dark: false,

      setActiveBoard: (id) => set({ activeBoardId: id }),

      addBoard: (name, emoji) => {
        const id = uid()
        const board: Board = {
          id,
          name,
          emoji,
          columns: ['To Do', 'In Progress', 'Done'].map((title) => ({ id: uid(), title, taskIds: [] })),
        }
        set((s) => ({ boards: [...s.boards, board], activeBoardId: id }))
      },

      renameBoard: (id, name) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, name } : b)) })),

      deleteBoard: (id) =>
        set((s) => {
          const board = s.boards.find((b) => b.id === id)
          if (!board || s.boards.length === 1) return s
          const removed = new Set(board.columns.flatMap((c) => c.taskIds))
          const boards = s.boards.filter((b) => b.id !== id)
          return {
            boards,
            tasks: Object.fromEntries(Object.entries(s.tasks).filter(([taskId]) => !removed.has(taskId))),
            activeBoardId: s.activeBoardId === id ? boards[0].id : s.activeBoardId,
          }
        }),

      addColumn: (title) =>
        set((s) => mapActiveBoard(s, (b) => ({ ...b, columns: [...b.columns, { id: uid(), title, taskIds: [] }] }))),

      renameColumn: (columnId, title) =>
        set((s) => mapActiveBoard(s, (b) => ({ ...b, columns: b.columns.map((c) => (c.id === columnId ? { ...c, title } : c)) }))),

      deleteColumn: (columnId) =>
        set((s) => {
          const board = s.boards.find((b) => b.id === s.activeBoardId)
          const column = board?.columns.find((c) => c.id === columnId)
          if (!column) return s
          const removed = new Set(column.taskIds)
          return {
            ...mapActiveBoard(s, (b) => ({ ...b, columns: b.columns.filter((c) => c.id !== columnId) })),
            tasks: Object.fromEntries(Object.entries(s.tasks).filter(([taskId]) => !removed.has(taskId))),
          }
        }),

      addTask: (columnId, title) => {
        const id = uid()
        const task: Task = {
          id,
          title,
          description: '',
          priority: 'medium',
          labels: [],
          dueDate: null,
          checklist: [],
          createdAt: Date.now(),
        }
        set((s) => ({
          tasks: { ...s.tasks, [id]: task },
          ...mapActiveBoard(s, (b) => ({
            ...b,
            columns: b.columns.map((c) => (c.id === columnId ? { ...c, taskIds: [...c.taskIds, id] } : c)),
          })),
        }))
        return id
      },

      updateTask: (id, patch) => set((s) => ({ tasks: { ...s.tasks, [id]: { ...s.tasks[id], ...patch } } })),

      deleteTask: (id) =>
        set((s) => {
          const tasks = { ...s.tasks }
          delete tasks[id]
          return {
            tasks,
            boards: s.boards.map((b) => ({
              ...b,
              columns: b.columns.map((c) => ({ ...c, taskIds: c.taskIds.filter((t) => t !== id) })),
            })),
          }
        }),

      moveTask: (taskId, toColumnId, toIndex) =>
        set((s) =>
          mapActiveBoard(s, (b) => {
            const columns = b.columns.map((c) => ({ ...c, taskIds: c.taskIds.filter((t) => t !== taskId) }))
            return {
              ...b,
              columns: columns.map((c) => {
                if (c.id !== toColumnId) return c
                const ids = [...c.taskIds]
                ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, taskId)
                return { ...c, taskIds: ids }
              }),
            }
          }),
        ),

      toggleDark: () => set({ dark: !get().dark }),

      resetDemo: () => set({ boards: seedBoards, tasks: seedTasks, labels: defaultLabels, activeBoardId: seedBoards[0].id }),
    }),
    { name: 'taskflow-v1' },
  ),
)

export const useActiveBoard = () => useStore((s) => s.boards.find((b) => b.id === s.activeBoardId) ?? s.boards[0])
