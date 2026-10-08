import { useState } from 'react'
import { Moon, Plus, RotateCcw, Sun, Trash2, X } from 'lucide-react'
import { useStore } from '../store'

const emojis = ['📋', '🚀', '💼', '🎯', '📚', '🛠️', '🎨', '🏠', '💡', '🧪']

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const boards = useStore((s) => s.boards)
  const tasks = useStore((s) => s.tasks)
  const activeBoardId = useStore((s) => s.activeBoardId)
  const setActiveBoard = useStore((s) => s.setActiveBoard)
  const addBoard = useStore((s) => s.addBoard)
  const deleteBoard = useStore((s) => s.deleteBoard)
  const dark = useStore((s) => s.dark)
  const toggleDark = useStore((s) => s.toggleDark)
  const resetDemo = useStore((s) => s.resetDemo)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(emojis[0])

  return (
    <>
      {open && <button type="button" aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-950 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-lg text-white shadow-md">⚡</span>
          <div>
            <p className="text-lg leading-none font-extrabold text-slate-900 dark:text-white">TaskFlow</p>
            <p className="text-[11px] text-slate-500">Kanban for focused teams</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-500 lg:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <p className="px-2 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Boards ({boards.length})</p>
          <ul className="space-y-1">
            {boards.map((b) => {
              const count = b.columns.reduce((n, c) => n + c.taskIds.filter((id) => tasks[id]).length, 0)
              const active = b.id === activeBoardId
              return (
                <li key={b.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBoard(b.id)
                      onClose()
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-lg">{b.emoji}</span>
                    <span className="flex-1 truncate">{b.name}</span>
                    <span className="text-xs text-slate-400 group-hover:opacity-0">{count}</span>
                  </button>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete board ${b.name}`}
                      onClick={() => confirm(`Delete board "${b.name}" and all its tasks?`) && deleteBoard(b.id)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                addBoard(name.trim(), emoji)
                setName('')
                setCreating(false)
                onClose()
              }}
              className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
                aria-label="Board name"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`grid h-7 w-7 place-items-center rounded-md text-base ${emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-400 dark:bg-indigo-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                  Create
                </button>
                <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              <Plus className="h-4 w-4" /> New board
            </button>
          )}
        </nav>

        <div className="space-y-1 border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleDark}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            type="button"
            onClick={() => confirm('Reset everything to the demo data?') && resetDemo()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <RotateCcw className="h-4 w-4" /> Reset demo data
          </button>
        </div>
      </aside>
    </>
  )
}
