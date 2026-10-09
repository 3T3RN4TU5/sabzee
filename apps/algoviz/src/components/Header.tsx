import { BarChart3, CircleHelp, Route } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { REPO_URL, type Tab } from '../config.ts'
import { cn } from '../lib/utils.ts'
import { GithubIcon, LogoMark } from './ui/icons.tsx'

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'sorting', label: 'Sorting', icon: BarChart3 },
  { id: 'pathfinding', label: 'Pathfinding', icon: Route },
]

export function Header({ tab, onHelp }: { tab: Tab; onHelp: () => void }) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const select = (id: Tab) => {
    // Hash navigation gives each mode a shareable URL and back-button support.
    if (id !== tab) window.location.assign(`#${id}`)
  }

  // WAI-ARIA tabs: arrow keys move between tabs (automatic activation).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = TABS.findIndex((t) => t.id === tab)
    const next =
      e.key === 'ArrowRight' ? (current + 1) % TABS.length : e.key === 'ArrowLeft' ? (current - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1
    if (next === -1) return
    e.preventDefault()
    select(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <a href="#sorting" className="flex items-center gap-2.5 rounded-lg" aria-label="AlgoViz home">
          <LogoMark className="size-9" />
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-white">AlgoViz</span>
            <span className="hidden text-xs text-slate-400 sm:block">Algorithm visualizer for DSA prep</span>
          </span>
        </a>

        <div
          role="tablist"
          aria-label="Visualizer mode"
          onKeyDown={onKeyDown}
          className="order-last flex w-full rounded-xl border border-white/10 bg-slate-900/80 p-1 sm:order-none sm:mx-auto sm:w-auto"
        >
          {TABS.map(({ id, label, icon: Icon }, k) => {
            const selected = id === tab
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[k] = el
                }}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition sm:flex-none',
                  selected ? 'bg-linear-to-r from-cyan-400/20 to-violet-500/20 text-white shadow-inner ring-1 ring-white/10' : 'text-slate-400 hover:text-white',
                )}
              >
                <Icon className={cn('size-4', selected ? 'text-cyan-300' : '')} aria-hidden />
                {label}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onHelp}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <CircleHelp className="size-4" aria-hidden />
            <span className="hidden sm:inline">How to use</span>
            <span className="sr-only sm:hidden">How to use</span>
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Source code on GitHub"
          >
            <GithubIcon className="size-5" />
          </a>
        </div>
      </div>
    </header>
  )
}
