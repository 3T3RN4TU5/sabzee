import { ChevronDown, History } from 'lucide-react'
import { useState } from 'react'
import { formatClock, formatDateTime, formatRelative, formatRuntime } from '../../lib/format.ts'
import { MOD_KEY, useNow } from '../../lib/hooks.ts'
import type { Submission } from '../../lib/progress.ts'
import { FOCUS_RING } from '../../lib/theme.ts'
import { EmptyState, Kbd } from '../ui.tsx'
import { VerdictText } from '../results/VerdictText.tsx'

interface SubmissionsTabProps {
  submissions: Submission[]
  onLoadCode: (code: string) => void
}

export function SubmissionsTab({ submissions, onLoadCode }: SubmissionsTabProps) {
  const now = useNow(30_000)
  const [openId, setOpenId] = useState<string | null>(null)

  if (submissions.length === 0) {
    return (
      <EmptyState icon={<History className="size-5" />} title="No submissions yet">
        Press <strong className="text-ink">Submit</strong> (<Kbd>{MOD_KEY}</Kbd> <Kbd>⇧</Kbd> <Kbd>↵</Kbd>) to judge your
        code against every test, including the hidden ones. Your history appears here.
      </EmptyState>
    )
  }

  const newestFirst = [...submissions].reverse()

  return (
    <div className="animate-fade-in">
      <h2 className="mb-3 text-base font-semibold text-ink">
        Submissions <span className="text-sm font-normal text-ink-faint">({submissions.length})</span>
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
        {newestFirst.map((submission) => {
          const open = openId === submission.id
          return (
            <li key={submission.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : submission.id)}
                aria-expanded={open}
                className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-raised/60 sm:grid-cols-[1fr_5.5rem_4.5rem_auto] ${FOCUS_RING}`}
              >
                <span className="min-w-0">
                  <VerdictText verdict={submission.verdict} className="font-semibold" />
                  <span className="block text-xs text-ink-faint" title={formatDateTime(submission.timestamp)}>
                    {formatRelative(submission.timestamp, now)}
                    {submission.solveTimeMs !== undefined && ` · solved in ${formatClock(submission.solveTimeMs)}`}
                  </span>
                </span>
                <span className="hidden font-mono text-xs text-ink-muted sm:block">
                  {submission.verdict === 'Time Limit Exceeded' ? '—' : formatRuntime(submission.runtimeMs)}
                </span>
                <span className="text-xs tabular-nums text-ink-muted">
                  {submission.passed}/{submission.total} tests
                </span>
                <ChevronDown className={`size-4 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {open && (
                <div className="border-t border-line bg-canvas/50 p-3">
                  <pre className="max-h-64 overflow-auto rounded-md bg-canvas p-3 font-mono text-xs leading-5 text-ink-muted">
                    {submission.code}
                  </pre>
                  <button
                    type="button"
                    onClick={() => onLoadCode(submission.code)}
                    className={`mt-2 rounded-md bg-raised px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover ${FOCUS_RING}`}
                  >
                    Load this code into the editor
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
