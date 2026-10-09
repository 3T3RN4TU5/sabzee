import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Dashboard } from './components/dashboard/Dashboard.tsx'
import { NotFound } from './components/NotFound.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { TopBar } from './components/TopBar.tsx'
import { Workspace } from './components/Workspace.tsx'
import { SIDEBAR_TOGGLE_ID } from './lib/a11y.ts'
import { NO_FILTERS } from './lib/filters.ts'
import { useHash, useMinWidth } from './lib/hooks.ts'
import { settingsStore, statusOf, submissionsStore, updateSettings } from './lib/progress.ts'
import { useStore } from './lib/storage.ts'
import { findProblem, PROBLEMS } from './problems/index.ts'
import type { Problem } from './problems/types.ts'

type Route = { kind: 'problem'; problem: Problem } | { kind: 'progress' } | { kind: 'missing'; slug: string }

const PROGRESS_HASH = 'progress'

function resolveRoute(hash: string, lastSlug: string | null): Route {
  if (hash === PROGRESS_HASH) return { kind: 'progress' }
  if (hash) {
    const problem = findProblem(hash)
    return problem ? { kind: 'problem', problem } : { kind: 'missing', slug: hash }
  }
  return { kind: 'problem', problem: (lastSlug && findProblem(lastSlug)) || PROBLEMS[0] }
}

export default function App() {
  const hash = useHash()
  const settings = useStore(settingsStore)
  const submissions = useStore(submissionsStore)
  const isWide = useMinWidth(1280)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filters, setFilters] = useState(NO_FILTERS)
  const drawerRef = useRef<HTMLElement>(null)
  /** Focused element when the drawer opened (recorded before the page behind it turns inert and drops focus). */
  const drawerOpenerRef = useRef<Element | null>(null)
  /** Id of the sidebar toggle to focus once a wide-screen toggle has re-rendered. */
  const focusAfterToggle = useRef<string | null>(null)

  const route = resolveRoute(hash, settings.lastSlug)
  const activeSlug = route.kind === 'problem' ? route.problem.slug : null
  const currentSlug = activeSlug ?? ((settings.lastSlug && findProblem(settings.lastSlug)?.slug) || PROBLEMS[0].slug)

  useEffect(() => {
    if (activeSlug && activeSlug !== settingsStore.get().lastSlug) updateSettings({ lastSlug: activeSlug })
  }, [activeSlug])

  const pageTitle =
    route.kind === 'problem' ? `${route.problem.id}. ${route.problem.title}` : route.kind === 'progress' ? 'Progress' : 'Not found'
  useEffect(() => {
    document.title = `${pageTitle} · CodeArena`
  }, [pageTitle])

  // The drawer (below the xl breakpoint) takes focus when opened, closes on
  // Escape, and hands focus back to whatever opened it.
  useEffect(() => {
    if (!drawerOpen) return
    drawerRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      // After navigating to another problem the opener has been replaced, so focus stays put.
      const opener = drawerOpenerRef.current
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [drawerOpen])

  // On wide screens the clicked toggle unmounts with the sidebar, so move focus to its counterpart.
  useEffect(() => {
    if (focusAfterToggle.current === null) return
    document.getElementById(focusAfterToggle.current)?.focus()
    focusAfterToggle.current = null
  }, [settings.sidebarOpen])

  const unsolved = useMemo(() => PROBLEMS.filter((p) => statusOf(submissions[p.slug]) !== 'solved'), [submissions])

  const pickRandom = () => {
    const pool = unsolved.length > 1 ? unsolved.filter((p) => p.slug !== activeSlug) : unsolved
    if (pool.length === 0) return
    window.location.hash = pool[Math.floor(Math.random() * pool.length)].slug
  }

  const openSidebar = () => {
    if (isWide) {
      focusAfterToggle.current = SIDEBAR_TOGGLE_ID.close
      updateSettings({ sidebarOpen: true })
    } else {
      drawerOpenerRef.current = document.activeElement
      setDrawerOpen(true)
    }
  }
  const closeSidebar = () => {
    if (isWide) {
      focusAfterToggle.current = SIDEBAR_TOGGLE_ID.open
      updateSettings({ sidebarOpen: false })
    } else {
      setDrawerOpen(false)
    }
  }

  const index = PROBLEMS.findIndex((p) => p.slug === currentSlug)
  const renderTopBar = (center: ReactNode, extra: ReactNode) => (
    <TopBar
      // The drawer covers the top bar, so its opener stays mounted (and focusable again on close).
      sidebarOpen={isWide && settings.sidebarOpen}
      onOpenSidebar={openSidebar}
      prevSlug={index > 0 ? PROBLEMS[index - 1].slug : null}
      nextSlug={index < PROBLEMS.length - 1 ? PROBLEMS[index + 1].slug : null}
      onRandom={pickRandom}
      randomDisabled={unsolved.length === 0}
      active={route.kind === 'progress' ? 'progress' : 'problems'}
      problemsHref={`#${currentSlug}`}
      extra={extra}
    >
      {center}
    </TopBar>
  )

  const sidebar = (
    <Sidebar
      activeSlug={activeSlug}
      submissions={submissions}
      filters={filters}
      onFiltersChange={setFilters}
      onClose={closeSidebar}
      onNavigate={() => setDrawerOpen(false)}
    />
  )

  return (
    <div className="flex h-dvh overflow-hidden">
      {isWide
        ? settings.sidebarOpen && <aside className="w-80 shrink-0 border-r border-line">{sidebar}</aside>
        : drawerOpen && (
            <div className="fixed inset-0 z-40">
              <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden />
              <aside
                ref={drawerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Problem list"
                className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] animate-slide-in border-r border-line shadow-2xl shadow-black outline-none"
              >
                {sidebar}
              </aside>
            </div>
          )}

      <div className="flex min-w-0 flex-1 flex-col" inert={drawerOpen && !isWide}>
        {route.kind === 'problem' && <Workspace key={route.problem.slug} problem={route.problem} renderTopBar={renderTopBar} />}
        {route.kind === 'progress' && (
          <>
            {renderTopBar(null, null)}
            <Dashboard onRandom={pickRandom} randomDisabled={unsolved.length === 0} />
          </>
        )}
        {route.kind === 'missing' && (
          <>
            {renderTopBar(null, null)}
            <NotFound slug={route.slug} fallbackSlug={currentSlug} />
          </>
        )}
      </div>
    </div>
  )
}
