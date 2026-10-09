import { ChartColumn, ChevronLeft, ChevronRight, CodeXml, PanelLeftOpen, Shuffle } from 'lucide-react'
import type { ReactNode } from 'react'
import { SIDEBAR_TOGGLE_ID } from '../lib/a11y.ts'
import { FOCUS_RING, ICON_BUTTON, SOURCE_URL } from '../lib/theme.ts'
import { GithubIcon, LogoMark } from './ui.tsx'

interface TopBarProps {
  sidebarOpen: boolean
  onOpenSidebar: () => void
  prevSlug: string | null
  nextSlug: string | null
  onRandom: () => void
  randomDisabled: boolean
  active: 'problems' | 'progress'
  /** Link back to the current (or last opened) problem. */
  problemsHref: string
  /** Centre slot, e.g. Run / Submit. */
  children?: ReactNode
  /** Right-hand slot before the global links, e.g. the timer. */
  extra?: ReactNode
}

const NAV_LINK = `flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors ${FOCUS_RING}`

export function TopBar({
  sidebarOpen,
  onOpenSidebar,
  prevSlug,
  nextSlug,
  onRandom,
  randomDisabled,
  active,
  problemsHref,
  children,
  extra,
}: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-1">
        {!sidebarOpen && (
          <>
            <button
              type="button"
              id={SIDEBAR_TOGGLE_ID.open}
              onClick={onOpenSidebar}
              className={ICON_BUTTON}
              aria-label="Show problem list"
              title="Problem list"
            >
              <PanelLeftOpen className="size-4" />
            </button>
            <a href={problemsHref} className={`mr-1 hidden rounded-md sm:block ${FOCUS_RING}`} aria-label="CodeArena home">
              <LogoMark className="size-6" />
            </a>
          </>
        )}
        <nav aria-label="Problem navigation" className="flex items-center">
          <div className="hidden items-center sm:flex">
            <NavArrow slug={prevSlug} direction="previous" />
            <NavArrow slug={nextSlug} direction="next" />
          </div>
          <button
            type="button"
            onClick={onRandom}
            disabled={randomDisabled}
            className={ICON_BUTTON}
            aria-label="Random unsolved problem"
            title={randomDisabled ? 'Every problem is solved!' : 'Random unsolved problem'}
          >
            <Shuffle className="size-4" />
          </button>
        </nav>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2">{children}</div>

      <div className="flex items-center gap-1">
        {extra}
        <div className="flex items-center rounded-lg bg-canvas/60 p-0.5" role="group" aria-label="Views">
          <a
            href={problemsHref}
            aria-current={active === 'problems' ? 'page' : undefined}
            className={`${NAV_LINK} ${active === 'problems' ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
            title="Problems"
          >
            <CodeXml className="size-4" aria-hidden />
            <span className="sr-only md:not-sr-only">Problems</span>
          </a>
          <a
            href="#progress"
            aria-current={active === 'progress' ? 'page' : undefined}
            className={`${NAV_LINK} ${active === 'progress' ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
            title="Progress dashboard"
          >
            <ChartColumn className="size-4" aria-hidden />
            <span className="sr-only md:not-sr-only">Progress</span>
          </a>
        </div>
        <div className="hidden sm:block">
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={ICON_BUTTON} aria-label="Source code on GitHub" title="Source code on GitHub">
            <GithubIcon />
          </a>
        </div>
      </div>
    </header>
  )
}

function NavArrow({ slug, direction }: { slug: string | null; direction: 'previous' | 'next' }) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  const label = direction === 'previous' ? 'Previous problem' : 'Next problem'
  if (!slug) {
    return (
      <span className={`${ICON_BUTTON} opacity-30`} aria-hidden>
        <Icon className="size-4" />
      </span>
    )
  }
  return (
    <a href={`#${slug}`} className={ICON_BUTTON} aria-label={label} title={label}>
      <Icon className="size-4" />
    </a>
  )
}
