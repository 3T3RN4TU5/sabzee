import { Github } from 'lucide-react'
import { PAGES, REPO_URL, type PageId } from '../config.ts'
import { cn } from '../lib/format.ts'

export function Header({ page }: { page: PageId }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <a href="#nn" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-slate-50">
            ML <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">Playground</span>
          </span>
        </a>
        <nav aria-label="Pages" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:pb-0">
          {PAGES.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              aria-current={page === p.id ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
                page === p.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )}
            >
              {p.label}
            </a>
          ))}
        </nav>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-slate-100">
          <Github size={18} /> <span className="hidden sm:inline">Source</span>
        </a>
      </div>
    </header>
  )
}
