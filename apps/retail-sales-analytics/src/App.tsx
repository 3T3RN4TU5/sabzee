import { BarChart3, FolderGit2 } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { ErrorState, Loading } from './components/ui.tsx'
import type { Filters } from './lib/cube.ts'
import { useData } from './lib/data.ts'
import { defaultFilters, filtersFromParams, paramsFromFilters } from './lib/filters.ts'
import { dateLabel, fmt } from './lib/format.ts'
import { REPO_URL } from './lib/config.ts'
import { PAGES, useRoute, type PageId } from './lib/route.ts'

const Overview = lazy(() => import('./pages/Overview.tsx'))
const CustomersPage = lazy(() => import('./pages/Customers.tsx'))
const ProductsPage = lazy(() => import('./pages/Products.tsx'))
const ExperimentPage = lazy(() => import('./pages/Experiment.tsx'))
const QualityPage = lazy(() => import('./pages/Quality.tsx'))
const Methodology = lazy(() => import('./pages/Methodology.tsx'))


export default function App() {
  const [route, navigate] = useRoute()
  const base = useData('meta', 'cube')
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])

  const cube = base.status === 'ready' ? base.data.cube : null
  const filters = useMemo(() => (cube ? filtersFromParams(cube, route.params) : null), [cube, route.params])
  const setFilters = useCallback(
    (f: Filters) => cube && navigate(route.page, paramsFromFilters(cube, f), true),
    [cube, navigate, route.page],
  )

  useEffect(() => {
    const label = PAGES.find((p) => p.id === route.page)?.label
    document.title = `${label} · Retail Sales Analytics`
    window.scrollTo({ top: 0 })
  }, [route.page])

  const pageHref = (id: PageId) => {
    const q = route.params.toString()
    return `#/${id}${q ? `?${q}` : ''}`
  }

  // WAI-ARIA tabs: arrow keys move between tabs
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = PAGES.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault()
    tabRefs.current[next]?.focus()
    navigate(PAGES[next].id, route.params)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded bg-sky-500 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-3 sm:px-6">
          <a href="#/overview" className="flex items-center gap-2.5 py-1">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/20">
              <BarChart3 className="size-4.5 text-white" aria-hidden />
            </span>
            <span>
              <span className="block text-sm leading-tight font-bold text-white">Retail Sales Analytics</span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {base.status === 'ready'
                  ? `UK online gift wholesaler · ${dateLabel(base.data.meta.period_start)} – ${dateLabel(base.data.meta.period_end)}`
                  : 'UK online gift wholesaler'}
              </span>
            </span>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:border-white/20 hover:text-white"
          >
            <FolderGit2 className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Source &amp; SQL</span>
          </a>
          <nav className="-mb-px w-full overflow-x-auto" aria-label="Sections">
            <div role="tablist" aria-label="Dashboard pages" className="flex min-w-max gap-1">
              {PAGES.map((p, i) => {
                const active = p.id === route.page
                return (
                  <a
                    key={p.id}
                    ref={(el) => {
                      tabRefs.current[i] = el
                    }}
                    role="tab"
                    aria-selected={active}
                    aria-controls="main"
                    tabIndex={active ? 0 : -1}
                    href={pageHref(p.id)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                      active ? 'border-sky-400 text-white' : 'border-transparent text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </a>
                )
              })}
            </div>
          </nav>
        </div>
      </header>

      <main id="main" role="tabpanel" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6" tabIndex={-1}>
        {base.status === 'loading' && <Loading />}
        {base.status === 'error' && <ErrorState message={base.error} onRetry={base.retry} />}
        {base.status === 'ready' && filters && (
          <Suspense fallback={<Loading label="Loading page…" />}>
            {route.page === 'overview' && (
              <Overview cube={base.data.cube} meta={base.data.meta} filters={filters} defaults={defaultFilters(base.data.cube)} onFilters={setFilters} />
            )}
            {route.page === 'customers' && <CustomersPage />}
            {route.page === 'products' && (
              <ProductsPage cube={base.data.cube} filters={filters} defaults={defaultFilters(base.data.cube)} onFilters={setFilters} />
            )}
            {route.page === 'experiment' && <ExperimentPage />}
            {route.page === 'quality' && <QualityPage meta={base.data.meta} />}
            {route.page === 'methodology' && <Methodology meta={base.data.meta} />}
          </Suspense>
        )}
      </main>

      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
        <p>
          Built by{' '}
          <a className="text-slate-300 hover:text-white" href="https://github.com/3T3RN4TU5" target="_blank" rel="noreferrer">
            Jeevan
          </a>{' '}
          · Data: UCI Online Retail (CC BY 4.0)
          {base.status === 'ready' && ` · ${fmt.int(base.data.meta.raw_rows)} raw rows → ${fmt.int(base.data.meta.clean_lines)} clean lines`}
          {' '}· Experiment data is simulated
        </p>
      </footer>
    </div>
  )
}
