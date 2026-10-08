import { useEffect, useRef, useState } from 'react'
import { BarChart3, Menu, Search, X } from 'lucide-react'
import { useActiveBoard, useStore } from './store'
import { BoardView } from './components/BoardView'
import type { Filters } from './lib/filters'
import { Insights } from './components/Insights'
import { Sidebar } from './components/Sidebar'
import { TaskModal } from './components/TaskModal'
import { priorities } from './lib/utils'
import type { Priority } from './types'

export default function App() {
  const board = useActiveBoard()
  const labels = useStore((s) => s.labels)
  const dark = useStore((s) => s.dark)
  const renameBoard = useStore((s) => s.renameBoard)
  const [sidebar, setSidebar] = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ query: '', priority: 'all', label: 'all' })
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtering = filters.query || filters.priority !== 'all' || filters.label !== 'all'
  const openColumn = openTaskId ? board.columns.find((c) => c.taskIds.includes(openTaskId)) : undefined

  return (
    <div className="flex h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar open={sidebar} onClose={() => setSidebar(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
          <button type="button" onClick={() => setSidebar(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-2xl">{board.emoji}</span>
          <input
            key={board.id}
            defaultValue={board.name}
            aria-label="Board name"
            onBlur={(e) => e.target.value.trim() && renameBoard(board.id, e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-xl font-extrabold outline-none hover:bg-slate-100 focus:bg-slate-100 sm:flex-none dark:hover:bg-slate-900 dark:focus:bg-slate-900"
          />

          <div className="order-last flex w-full flex-wrap items-center gap-2 sm:order-none sm:ml-auto sm:w-auto">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                placeholder="Search tasks…  ( / )"
                aria-label="Search tasks"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:border-indigo-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as Priority | 'all' }))}
              aria-label="Filter by priority"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="all">All priorities</option>
              {(Object.keys(priorities) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {priorities[p].label}
                </option>
              ))}
            </select>
            <select
              value={filters.label}
              onChange={(e) => setFilters((f) => ({ ...f, label: e.target.value }))}
              aria-label="Filter by label"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="all">All labels</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {filtering && (
              <button
                type="button"
                onClick={() => setFilters({ query: '', priority: 'all', label: 'all' })}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInsights((s) => !s)}
              aria-pressed={showInsights}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                showInsights ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Insights
            </button>
          </div>
        </header>

        {showInsights && <Insights />}

        <main className="min-h-0 flex-1">
          <BoardView filters={filters} onOpenTask={setOpenTaskId} />
        </main>
      </div>

      {openTaskId && <TaskModal taskId={openTaskId} columnTitle={openColumn?.title ?? ''} onClose={() => setOpenTaskId(null)} />}
    </div>
  )
}
