import { CalendarDays, Flame, History, Shuffle, Tag, Target, Trash2, Trophy } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { formatClock, formatPercent, formatRelative, formatRuntime } from '../../lib/format.ts'
import { useNow } from '../../lib/hooks.ts'
import { resetAllProgress, submissionsStore } from '../../lib/progress.ts'
import { computeStreaks, summarize } from '../../lib/stats.ts'
import { useStore } from '../../lib/storage.ts'
import { DIFFICULTY_MARK, DIFFICULTY_TEXT, FOCUS_RING } from '../../lib/theme.ts'
import { PROBLEMS } from '../../problems/index.ts'
import { ConfirmDialog } from '../ConfirmDialog.tsx'
import { VerdictText } from '../results/VerdictText.tsx'
import { ActivityHeatmap } from './ActivityHeatmap.tsx'
import { SolvedRing } from './SolvedRing.tsx'

interface DashboardProps {
  onRandom: () => void
  randomDisabled: boolean
}

export function Dashboard({ onRandom, randomDisabled }: DashboardProps) {
  const submissions = useStore(submissionsStore)
  const now = useNow(60_000)
  const [confirmReset, setConfirmReset] = useState(false)

  const summary = useMemo(() => summarize(PROBLEMS, submissions), [submissions])
  const streaks = useMemo(() => computeStreaks(new Set(summary.activityByDay.keys()), now), [summary, now])
  const hasActivity = summary.totalSubmissions > 0

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Your progress</h1>
            <p className="mt-1 text-sm text-ink-muted">Stats are computed from your submissions and stored privately in this browser.</p>
          </div>
          <button
            type="button"
            onClick={onRandom}
            disabled={randomDisabled}
            className={`inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-canvas shadow-lg shadow-amber-500/10 transition-colors hover:bg-accent-strong disabled:opacity-50 ${FOCUS_RING}`}
          >
            <Shuffle className="size-4" aria-hidden />
            {randomDisabled ? 'Everything solved!' : 'Pick a random unsolved problem'}
          </button>
        </div>

        {!hasActivity && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
            <p className="text-ink-muted">
              <strong className="text-ink">No submissions yet.</strong> Solve your first problem and this dashboard fills up with
              your streak, acceptance rate and activity.
            </p>
            <a href={`#${PROBLEMS[0].slug}`} className={`rounded-md font-semibold text-accent hover:text-accent-strong ${FOCUS_RING}`}>
              Start with {PROBLEMS[0].title} →
            </a>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Solved problems" icon={<Trophy className="size-4" />} className="lg:col-span-2">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <SolvedRing byDifficulty={summary.byDifficulty} solved={summary.solved} total={summary.total} />
              <div className="w-full flex-1 space-y-4">
                {summary.byDifficulty.map((d) => (
                  <div key={d.difficulty}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className={`font-medium ${DIFFICULTY_TEXT[d.difficulty]}`}>{d.difficulty}</span>
                      <span className="tabular-nums text-ink-muted">
                        <span className="font-semibold text-ink">{d.solved}</span> / {d.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
                      <div
                        className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
                        style={{ width: `${(d.solved / d.total) * 100}%`, background: DIFFICULTY_MARK[d.difficulty] }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-ink-faint">
                  {summary.attempted > 0
                    ? `${summary.attempted} more attempted but not yet accepted.`
                    : 'Problems you submit without passing show up as attempted.'}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card title="Acceptance rate" icon={<Target className="size-4" />}>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {summary.acceptanceRate === null ? '—' : formatPercent(summary.acceptanceRate)}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {summary.acceptedSubmissions} accepted of {summary.totalSubmissions} submission{summary.totalSubmissions === 1 ? '' : 's'}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
                <div className="h-full rounded-full bg-pass" style={{ width: `${(summary.acceptanceRate ?? 0) * 100}%` }} />
              </div>
            </Card>
            <Card title="Daily streak" icon={<Flame className="size-4" />}>
              <p className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">{streaks.current}</span>
                <span className="text-sm text-ink-muted">day{streaks.current === 1 ? '' : 's'}</span>
                {streaks.current > 0 && <Flame className="size-5 self-center fill-orange-500/30 text-orange-400" aria-hidden />}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {streaks.activeToday
                  ? 'You practised today — nice.'
                  : streaks.current > 0
                    ? 'Submit something today to keep it going.'
                    : 'Submit on consecutive days to build a streak.'}
              </p>
              <p className="mt-2 text-xs text-ink-faint">Longest streak: {streaks.longest} day{streaks.longest === 1 ? '' : 's'}</p>
            </Card>
          </div>

          <Card title="Activity" icon={<CalendarDays className="size-4" />} className="lg:col-span-2">
            <ActivityHeatmap activity={summary.activityByDay} now={now} />
          </Card>

          <Card title="Recent submissions" icon={<History className="size-4" />} className="lg:row-span-2">
            {summary.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">Your latest submissions will be listed here.</p>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {summary.recent.map((submission) => (
                  <li key={submission.id}>
                    <a
                      href={`#${submission.problem.slug}`}
                      className={`flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-raised ${FOCUS_RING}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{submission.problem.title}</span>
                        <VerdictText verdict={submission.verdict} className="text-xs font-medium" />
                        {submission.verdict === 'Accepted' && (
                          <span className="text-xs text-ink-faint">
                            {' '}
                            · {formatRuntime(submission.runtimeMs)}
                            {submission.solveTimeMs !== undefined && ` · ${formatClock(submission.solveTimeMs)}`}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint">{formatRelative(submission.timestamp, now)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Topics" icon={<Tag className="size-4" />} className="lg:col-span-2">
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {summary.byTag.map((t) => (
                <li key={t.tag}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-ink-muted">{t.tag}</span>
                    <span className="text-xs tabular-nums text-ink-faint">
                      <span className="font-semibold text-ink">{t.solved}</span> / {t.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(t.solved / t.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {hasActivity && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-ink-faint hover:bg-raised hover:text-hard ${FOCUS_RING}`}
            >
              <Trash2 className="size-3.5" aria-hidden /> Reset all progress
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all progress?"
        message="This permanently deletes every submission, revealed hint, timer and saved draft stored in this browser."
        confirmLabel="Delete everything"
        tone="danger"
        onConfirm={resetAllProgress}
        onClose={() => setConfirmReset(false)}
      />
    </main>
  )
}

function Card({ title, icon, className = '', children }: { title: string; icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-5 ${className}`} aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <span className="text-accent" aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
