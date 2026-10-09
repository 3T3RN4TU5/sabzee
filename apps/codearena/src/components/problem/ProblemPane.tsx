import { BookOpen, FileText, History, Lightbulb, Lock } from 'lucide-react'
import { panelId, tabId } from '../../lib/a11y.ts'
import { statusOf, type ProblemFlags, type Submission } from '../../lib/progress.ts'
import type { Problem } from '../../problems/types.ts'
import { Tabs, type TabItem } from '../Tabs.tsx'
import { DescriptionTab } from './DescriptionTab.tsx'
import { HintsTab } from './HintsTab.tsx'
import { SolutionTab } from './SolutionTab.tsx'
import { SubmissionsTab } from './SubmissionsTab.tsx'

export type ProblemTab = 'description' | 'hints' | 'solution' | 'submissions'

interface ProblemPaneProps {
  problem: Problem
  submissions: Submission[]
  flags: ProblemFlags
  tab: ProblemTab
  onTabChange: (tab: ProblemTab) => void
  onLoadCode: (code: string) => void
}

const ID_PREFIX = 'problem'

export function ProblemPane({ problem, submissions, flags, tab, onTabChange, onLoadCode }: ProblemPaneProps) {
  const solutionUnlocked = submissions.length > 0 || flags.gaveUp
  const items: TabItem<ProblemTab>[] = [
    { id: 'description', label: 'Description', icon: <FileText className="size-3.5" aria-hidden /> },
    {
      id: 'hints',
      label: 'Hints',
      icon: <Lightbulb className="size-3.5" aria-hidden />,
      badge: `${flags.hintsRevealed}/${problem.hints.length}`,
    },
    {
      id: 'solution',
      label: 'Solution',
      icon: solutionUnlocked ? <BookOpen className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />,
    },
    {
      id: 'submissions',
      label: 'Submissions',
      icon: <History className="size-3.5" aria-hidden />,
      badge: submissions.length > 0 ? submissions.length : undefined,
    },
  ]

  return (
    <section aria-label="Problem" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div className="shrink-0 overflow-x-auto border-b border-line px-1.5 py-1">
        <Tabs idPrefix={ID_PREFIX} label="Problem sections" items={items} active={tab} onChange={onTabChange} compact />
      </div>
      <div
        role="tabpanel"
        id={panelId(ID_PREFIX, tab)}
        aria-labelledby={tabId(ID_PREFIX, tab)}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-5 focus-visible:outline-none"
      >
        {tab === 'description' && <DescriptionTab problem={problem} status={statusOf(submissions)} />}
        {tab === 'hints' && <HintsTab problem={problem} revealed={flags.hintsRevealed} />}
        {tab === 'solution' && (
          <SolutionTab problem={problem} unlocked={solutionUnlocked} onShowHints={() => onTabChange('hints')} />
        )}
        {tab === 'submissions' && <SubmissionsTab submissions={submissions} onLoadCode={onLoadCode} />}
      </div>
    </section>
  )
}
