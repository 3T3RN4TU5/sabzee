import { PanelLeftClose, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { SIDEBAR_TOGGLE_ID } from '../lib/a11y.ts'
import { hasActiveFilters, matchesFilters, NO_FILTERS, type ProblemFilters, type StatusFilter } from '../lib/filters.ts'
import { statusOf, type SubmissionMap } from '../lib/progress.ts'
import { DIFFICULTY_TEXT, FOCUS_RING, ICON_BUTTON } from '../lib/theme.ts'
import { PROBLEMS } from '../problems/index.ts'
import { DIFFICULTIES, TAGS, type Tag } from '../problems/types.ts'
import { StatusIcon, Wordmark } from './ui.tsx'

interface SidebarProps {
  activeSlug: string | null
  submissions: SubmissionMap
  filters: ProblemFilters
  onFiltersChange: (filters: ProblemFilters) => void
  onClose: () => void
  /** Called after a problem link is followed (closes the drawer on small screens). */
  onNavigate: () => void
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'solved', label: 'Solved' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'todo', label: 'To do' },
]

const SELECT_CLASS = `h-8 w-full min-w-0 rounded-md border border-line bg-raised px-2 text-xs text-ink-muted hover:border-line-strong ${FOCUS_RING}`

export function Sidebar({ activeSlug, submissions, filters, onFiltersChange, onClose, onNavigate }: SidebarProps) {
  const { query, difficulty, status, tag } = filters
  const setFilter = (patch: Partial<ProblemFilters>) => onFiltersChange({ ...filters, ...patch })
  const listRef = useRef<HTMLUListElement>(null)

  // Keep the open problem visible, e.g. after following a deep link to #25. Only the list
  // scrolls: `scrollIntoView` would also move the browser's Tab starting point to the item,
  // so keyboard users would skip the top bar.
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector('[aria-current="page"]')
    if (!list || !item) return
    const listBox = list.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    if (itemBox.top < listBox.top) list.scrollTop -= listBox.top - itemBox.top
    else if (itemBox.bottom > listBox.bottom) list.scrollTop += itemBox.bottom - listBox.bottom
  }, [activeSlug])

  const statuses = useMemo(
    () => new Map(PROBLEMS.map((problem) => [problem.slug, statusOf(submissions[problem.slug])])),
    [submissions],
  )
  const solvedCount = [...statuses.values()].filter((s) => s === 'solved').length

  const filtered = useMemo(
    () => PROBLEMS.filter((problem) => matchesFilters(problem, statuses.get(problem.slug) ?? 'todo', filters)),
    [filters, statuses],
  )

  const hasFilters = hasActiveFilters(filters)
  const clearFilters = () => onFiltersChange(NO_FILTERS)

  return (
    <nav aria-label="Problem list" className="flex h-full w-full flex-col bg-panel">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-3">
        <a href={activeSlug ? `#${activeSlug}` : '#'} className={`rounded-md ${FOCUS_RING}`} onClick={onNavigate}>
          <Wordmark />
        </a>
        <button
          type="button"
          id={SIDEBAR_TOGGLE_ID.close}
          onClick={onClose}
          className={ICON_BUTTON}
          aria-label="Hide problem list"
          title="Hide problem list"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="space-y-3 border-b border-line p-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink-muted">Progress</span>
            <span className="tabular-nums text-ink-muted">
              <span className="font-semibold text-ink">{solvedCount}</span> / {PROBLEMS.length} solved
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-raised"
            role="progressbar"
            aria-label="Problems solved"
            aria-valuemin={0}
            aria-valuemax={PROBLEMS.length}
            aria-valuenow={solvedCount}
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
              style={{ width: `${(solvedCount / PROBLEMS.length) * 100}%` }}
            />
          </div>
        </div>

        <label className="relative block">
          <span className="sr-only">Search problems</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setFilter({ query: event.target.value })}
            placeholder="Search title, number or topic"
            className={`h-8 w-full rounded-md border border-line bg-raised pr-2 pl-8 text-sm text-ink placeholder:text-ink-faint hover:border-line-strong ${FOCUS_RING}`}
          />
        </label>

        <div className="grid grid-cols-4 gap-1 rounded-lg bg-raised p-1" role="group" aria-label="Filter by difficulty">
          {(['all', ...DIFFICULTIES] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={difficulty === value}
              onClick={() => setFilter({ difficulty: value })}
              className={`rounded-md py-1 text-xs font-medium transition-colors ${FOCUS_RING} ${
                difficulty === value
                  ? `bg-hover shadow-sm ${value === 'all' ? 'text-ink' : DIFFICULTY_TEXT[value]}`
                  : 'text-ink-faint hover:text-ink-muted'
              }`}
            >
              {value === 'all' ? 'All' : value}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={(event) => setFilter({ status: event.target.value as StatusFilter })} className={SELECT_CLASS}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by topic</span>
            <select value={tag} onChange={(event) => setFilter({ tag: event.target.value as Tag | 'all' })} className={SELECT_CLASS}>
              <option value="all">All topics</option>
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
        <span aria-live="polite">
          {filtered.length === PROBLEMS.length ? `${PROBLEMS.length} problems` : `${filtered.length} of ${PROBLEMS.length}`}
        </span>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className={`flex items-center gap-1 rounded normal-case tracking-normal text-ink-muted hover:text-ink ${FOCUS_RING}`}>
            <X className="size-3" aria-hidden /> Clear filters
          </button>
        )}
      </div>

      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filtered.map((problem) => {
          const active = problem.slug === activeSlug
          return (
            <li key={problem.slug}>
              <a
                href={`#${problem.slug}`}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={problem.tags.join(' · ')}
                className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${FOCUS_RING} ${
                  active ? 'bg-raised text-ink' : 'text-ink-muted hover:bg-raised/60 hover:text-ink'
                }`}
              >
                {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden />}
                <StatusIcon status={statuses.get(problem.slug) ?? 'todo'} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="tabular-nums text-ink-faint">{problem.id}.</span> {problem.title}
                </span>
                <span className={`shrink-0 text-xs font-medium ${DIFFICULTY_TEXT[problem.difficulty]}`}>
                  {problem.difficulty === 'Medium' ? 'Med.' : problem.difficulty}
                </span>
              </a>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-10 text-center text-sm text-ink-muted">
            <p className="font-medium text-ink">No problems match</p>
            <p className="mt-1">Try a different search or</p>
            <button type="button" onClick={clearFilters} className={`mt-3 rounded-md bg-raised px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover ${FOCUS_RING}`}>
              Clear filters
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
