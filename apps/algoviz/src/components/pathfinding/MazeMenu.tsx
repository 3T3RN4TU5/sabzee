import { ChevronDown, Grid3x3 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { MAZES, type MazeId } from '../../algorithms/pathfinding/mazes.ts'
import { cn } from '../../lib/utils.ts'

/** Disclosure menu listing the maze and pattern generators. */
export function MazeMenu({ onGenerate, disabled }: { onGenerate: (id: MazeId) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        // Close when keyboard focus moves outside the menu (e.g. tabbing past it).
        if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <span className="eyebrow mb-1.5 block" aria-hidden>
        Patterns
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Grid3x3 className="size-4 text-cyan-300" aria-hidden />
          Mazes &amp; patterns
        </span>
        <ChevronDown className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul
          id={panelId}
          className="absolute top-full right-0 left-0 z-20 mt-2 min-w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl shadow-black/50 backdrop-blur sm:right-auto"
        >
          {MAZES.map((maze) => (
            <li key={maze.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onGenerate(maze.id)
                }}
                className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/5 focus-visible:bg-white/5"
              >
                <span className="block text-sm font-medium text-slate-100">{maze.label}</span>
                <span className="block text-xs text-slate-400">{maze.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
