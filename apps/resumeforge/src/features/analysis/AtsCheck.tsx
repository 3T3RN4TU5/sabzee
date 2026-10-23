/** "ATS check" tab: score, category breakdown, stats, readability, grouped issues with fixes, checklist. */
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, CircleHelp, Copy, Lightbulb, MinusCircle, Sparkles, XCircle } from 'lucide-react'
import { useDeferredValue, useId, useMemo, useState } from 'react'
import { analyse, type Analysis, type Issue, type Severity } from '../../lib/analysis.ts'
import { checklist, groupIssues, RULE_HELP, scoreBand, SEVERITY_LABEL, severityCounts, textAt, type ScoreBand } from '../../lib/atsReport.ts'
import { issueFixes } from '../../lib/rewrite.ts'
import type { ResumeData } from '../../lib/types.ts'
import { useActiveData, useUiStore } from '../../store'
import { Button, cn } from '../../ui'
import { copyWithToast, issueAction, toastWithUndo, writeAt } from './actions.ts'
import { Bar, Card, CardTitle, Pill, ScoreRing, Segmented, Stat, type Tone } from './parts.tsx'

const BAND_TONE: Record<ScoreBand, Tone> = { excellent: 'emerald', good: 'indigo', fair: 'amber', low: 'rose' }
const BAND_TEXT: Record<ScoreBand, string> = {
  excellent: 'text-emerald-600 dark:text-emerald-400',
  good: 'text-indigo-600 dark:text-indigo-400',
  fair: 'text-amber-600 dark:text-amber-400',
  low: 'text-rose-600 dark:text-rose-400',
}
const BAND_BLURB: Record<ScoreBand, string> = {
  excellent: 'Recruiter-ready. Polish the remaining tips and tailor it to each job.',
  good: 'Solid foundation — a few fixes will make it stand out.',
  fair: 'Getting there. Fix the critical items first, then the warnings.',
  low: 'Start with the critical items below — each one is a quick win.',
}

const SEV_ICON: Record<Severity, { icon: typeof AlertOctagon; cls: string }> = {
  error: { icon: AlertOctagon, cls: 'text-rose-500 dark:text-rose-400' },
  warning: { icon: AlertTriangle, cls: 'text-amber-500 dark:text-amber-400' },
  info: { icon: Lightbulb, cls: 'text-sky-500 dark:text-sky-400' },
}

export function AtsCheck() {
  const live = useActiveData()
  const pages = useUiStore((s) => s.pageCount)
  const data = useDeferredValue(live)
  const result = useMemo(() => (data ? analyse(data, { pages: pages || null }) : null), [data, pages])
  if (!result || !live) return null
  return (
    <div className="space-y-4">
      <ScoreCard result={result} />
      <StatsCard result={result} />
      <ReadabilityCard result={result} />
      <Issues result={result} data={live} />
      <Checklist result={result} />
    </div>
  )
}

function ScoreCard({ result }: { result: Analysis }) {
  const band = scoreBand(result.score)
  const counts = severityCounts(result.issues)
  return (
    <Card>
      <div className="flex items-center gap-4">
        <ScoreRing value={result.score} tone={BAND_TONE[band]} label={`Resume score ${result.score} out of 100, ${result.grade}`} caption="/ 100" />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">ATS & strength score</p>
          <p className={cn('text-xl font-extrabold', BAND_TEXT[band])}>{result.grade}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{BAND_BLURB[band]}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {counts.error > 0 && <Pill tone="rose">{counts.error} critical</Pill>}
            {counts.warning > 0 && <Pill tone="amber">{counts.warning} warning{counts.warning === 1 ? '' : 's'}</Pill>}
            {counts.info > 0 && <Pill tone="sky">{counts.info} tip{counts.info === 1 ? '' : 's'}</Pill>}
            {result.issues.length === 0 && <Pill tone="emerald">No issues found</Pill>}
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
        {result.categories.map((c) => {
          const pct = c.max ? (c.score / c.max) * 100 : 0
          const tone: Tone = pct >= 85 ? 'emerald' : pct >= 65 ? 'indigo' : pct >= 40 ? 'amber' : 'rose'
          return (
            <li key={c.name} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{c.name}</span>
              <Bar value={c.score} max={c.max} tone={tone} label={`${c.name}: ${c.score} of ${c.max}`} />
              <span className="text-right text-slate-500 tabular-nums dark:text-slate-400">
                {c.score}/{c.max}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function StatsCard({ result }: { result: Analysis }) {
  const s = result.stats
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Stat label="Words" value={s.words} sub={s.words > 750 ? 'On the long side' : s.words < 250 ? 'On the short side' : 'Good length'} />
      <Stat label="Bullets" value={s.bullets} />
      <Stat label="Quantified" value={pct(s.quantified, s.bullets)} sub={`${s.quantified} with numbers`} />
      <Stat label="Action verbs" value={pct(s.actionVerbs, s.bullets)} sub={`${s.actionVerbs} strong openers`} />
      <Stat label="Experience" value={`${s.years} yr${s.years === 1 ? '' : 's'}`} sub="from your dates" />
      <Stat label="Pages" value={s.pages ?? '—'} sub={s.pages === null ? 'open the preview' : s.pages <= 2 ? 'Within 1–2 pages' : 'Too long'} />
    </div>
  )
}

const ZONES = [
  { to: 30, label: 'Dense', cls: 'bg-rose-200 dark:bg-rose-500/30' },
  { to: 45, label: 'Technical', cls: 'bg-amber-200 dark:bg-amber-500/30' },
  { to: 60, label: 'Clear', cls: 'bg-emerald-200 dark:bg-emerald-500/30' },
  { to: 100, label: 'Plain', cls: 'bg-sky-200 dark:bg-sky-500/30' },
]

function ReadabilityCard({ result }: { result: Analysis }) {
  const r = result.stats.readability
  const perSentence = r.sentences ? Math.round((r.words / r.sentences) * 10) / 10 : 0
  return (
    <Card>
      <CardTitle sub="Flesch reading ease of your summary and bullets. Resumes read best between 30 and 60." aside={<Pill tone={r.score >= 30 ? 'emerald' : r.words ? 'amber' : 'slate'}>{r.label}</Pill>}>
        Readability
      </CardTitle>
      <div className="flex items-end gap-3">
        <p className="text-3xl leading-none font-extrabold text-slate-900 tabular-nums dark:text-white">{r.words ? r.score : '—'}</p>
        {r.words > 0 && (
          <p className="pb-0.5 text-xs text-slate-500 dark:text-slate-400">
            {perSentence} words per sentence · {r.sentences} sentences
          </p>
        )}
      </div>
      <div className="relative mt-3" aria-hidden>
        <div className="flex h-2 overflow-hidden rounded-full">
          {ZONES.map((z, i) => (
            <div key={z.label} className={z.cls} style={{ width: `${z.to - (i ? ZONES[i - 1].to : 0)}%` }} />
          ))}
        </div>
        {r.words > 0 && <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white dark:bg-white dark:ring-slate-900" style={{ left: `${Math.max(1, Math.min(99, r.score))}%` }} />}
        <div className="mt-1 flex text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {ZONES.map((z, i) => (
            <span key={z.label} style={{ width: `${z.to - (i ? ZONES[i - 1].to : 0)}%` }}>
              {z.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

type GroupBy = 'severity' | 'category'

function Issues({ result, data }: { result: Analysis; data: ResumeData }) {
  const [by, setBy] = useState<GroupBy>('severity')
  const groups = useMemo(() => groupIssues(result.issues, by), [result.issues, by])
  if (!result.issues.length) {
    return (
      <Card className="flex items-center gap-3">
        <Sparkles className="size-5 text-emerald-500" aria-hidden />
        <p className="text-sm text-slate-700 dark:text-slate-200">No suggestions — your resume passes every check. Tailor it to a job in the Job match tab.</p>
      </Card>
    )
  }
  return (
    <section aria-labelledby="ats-issues">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id="ats-issues" className="text-sm font-bold text-slate-900 dark:text-white">
          Suggestions <span className="font-semibold text-slate-400">({result.issues.length})</span>
        </h3>
        <Segmented
          label="Group suggestions by"
          value={by}
          onChange={setBy}
          options={[
            { id: 'severity', label: 'By priority' },
            { id: 'category', label: 'By category' },
          ]}
        />
      </div>
      <div className="space-y-3">
        {groups.map((g) => (
          <IssueGroup key={`${by}:${g.key}`} label={g.label} issues={g.issues} data={data} showCategory={by === 'severity'} defaultOpen={!(by === 'severity' && g.key === 'info' && result.issues.length > 10)} />
        ))}
      </div>
    </section>
  )
}

function IssueGroup({ label, issues, data, showCategory, defaultOpen }: { label: string; issues: Issue[]; data: ResumeData; showCategory: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="rounded-2xl bg-slate-100/70 p-1.5 dark:bg-slate-800/40">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold tracking-wide text-slate-600 uppercase hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800">
        <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', !open && '-rotate-90')} aria-hidden />
        {label}
        <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums dark:bg-slate-900 dark:text-slate-400">{issues.length}</span>
      </button>
      {open && (
        <ul id={id} className="mt-1 space-y-1.5">
          {issues.map((i) => (
            <IssueCard key={i.id} issue={i} data={data} showCategory={showCategory} />
          ))}
        </ul>
      )}
    </div>
  )
}

function IssueCard({ issue, data, showCategory }: { issue: Issue; data: ResumeData; showCategory: boolean }) {
  const [why, setWhy] = useState(false)
  const { icon: Icon, cls } = SEV_ICON[issue.severity]
  const current = textAt(data, issue.target)
  const fixes = issueFixes(issue, current)
  const action = issueAction(issue)
  const help = RULE_HELP[issue.rule]
  const apply = (value: string, label: string) => {
    if (issue.target && writeAt(issue.target, value)) toastWithUndo(`Applied “${label}”`)
  }
  return (
    <li className="rounded-xl bg-white p-3 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-2.5">
        <Icon className={cn('mt-0.5 size-4 shrink-0', cls)} aria-label={SEVERITY_LABEL[issue.severity].one} />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium text-slate-800 dark:text-slate-100">{issue.message}</p>
          {issue.detail && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{issue.detail}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {showCategory && <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{issue.category}</span>}
            {help && (
              <button type="button" aria-expanded={why} onClick={() => setWhy((w) => !w)} className="inline-flex items-center gap-0.5 rounded text-[11px] font-semibold text-slate-500 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300">
                <CircleHelp className="size-3" aria-hidden /> Why it matters
              </button>
            )}
          </div>
          {why && help && <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{help}</p>}
          {fixes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{fixes.some((f) => f.value) ? 'Replace with:' : 'Try:'}</span>
              {fixes.map((f) =>
                f.value ? (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => apply(f.value!, f.label)}
                    title={`→ ${f.value}`}
                    aria-label={`Rewrite as: ${f.value}`}
                    className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 ring-inset hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30 dark:hover:bg-indigo-500/20"
                  >
                    {f.label}
                  </button>
                ) : (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => void copyWithToast(f.label)}
                    title="Copy"
                    aria-label={`Copy suggestion: ${f.label}`}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {f.label} <Copy className="size-3 opacity-60" aria-hidden />
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        {action && (
          <Button size="xs" variant="subtle" iconRight={ArrowRight} onClick={action.run} className="shrink-0" aria-label={`${action.label}: ${issue.message}`}>
            {action.label}
          </Button>
        )}
      </div>
    </li>
  )
}

const STATUS_ICON = {
  pass: { icon: CheckCircle2, cls: 'text-emerald-500 dark:text-emerald-400', label: 'Passed' },
  fail: { icon: XCircle, cls: 'text-amber-500 dark:text-amber-400', label: 'Needs work' },
  skip: { icon: MinusCircle, cls: 'text-slate-300 dark:text-slate-600', label: 'Not applicable yet' },
} as const

function Checklist({ result }: { result: Analysis }) {
  const checks = useMemo(() => checklist(result), [result])
  const passed = checks.filter((c) => c.status === 'pass').length
  const order = { pass: 0, fail: 1, skip: 2 }
  const sorted = [...checks].sort((a, b) => order[a.status] - order[b.status])
  return (
    <Card>
      <CardTitle sub="Everything the checker looks at." aside={<Pill tone={passed === checks.length ? 'emerald' : 'slate'}>{passed} / {checks.length} passed</Pill>}>
        Checklist
      </CardTitle>
      <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {sorted.map((c) => {
          const s = STATUS_ICON[c.status]
          return (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              <s.icon className={cn('mt-px size-3.5 shrink-0', s.cls)} aria-label={s.label} />
              <span className={cn(c.status === 'pass' ? 'text-slate-700 dark:text-slate-200' : c.status === 'fail' ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
                {c.label}
                {c.status === 'fail' && <span className="text-slate-400 dark:text-slate-500"> · {c.count}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
