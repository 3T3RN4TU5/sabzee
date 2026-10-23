/** "Job match" tab: paste a JD (persisted per resume), keyword match gauge, missing/matched keywords, years, letter CTA. */
import { ArrowRight, Briefcase, Check, ClipboardList, Copy, FileSearch, Mail, Plus, Sparkles, X } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { findEntry } from '../../lib/ops.ts'
import {
  extractJobInfo,
  groupKeywords,
  importance,
  IMPORTANCE_LABEL,
  isCompanyKeyword,
  isSkillKeyword,
  matchLabel,
  missingByPriority,
  pickSkillsEntry,
  placementFor,
  SAMPLE_JD,
  withKeyword,
  yearsStatus,
  type MatchRow,
} from '../../lib/jobMatch.ts'
import { matchResume, type MatchResult } from '../../lib/keywords.ts'
import type { ResumeData } from '../../lib/types.ts'
import { getActiveDoc, resumeActions, toast, uiActions, useActiveDoc } from '../../store'
import { Button, cn, TextArea } from '../../ui'
import { copyWithToast, goToPlacement, toastWithUndo } from './actions.ts'
import { Card, CardTitle, Pill, ScoreRing, type Tone } from './parts.tsx'

const IMPORTANCE_TONE = { must: 'rose', high: 'amber', normal: 'slate' } as const

export function JobMatch() {
  const doc = useActiveDoc()
  const jd = doc?.jobDescription ?? ''
  const deferredJd = useDeferredValue(jd)
  const deferredData = useDeferredValue(doc?.data)
  const result = useMemo(() => {
    if (!deferredData || !deferredJd.trim()) return null
    const r = matchResume(deferredData, deferredJd)
    const company = extractJobInfo(deferredJd).company
    const keywords = r.keywords.filter((k) => !isCompanyKeyword(k, company))
    if (keywords.length === r.keywords.length) return r
    let got = 0
    let total = 0
    for (const k of keywords) {
      total += k.weight
      if (k.matched) got += k.weight
    }
    return { ...r, keywords, score: total ? Math.round((got / total) * 100) : 0, matched: keywords.filter((k) => k.matched).length, missing: keywords.filter((k) => !k.matched).length }
  }, [deferredData, deferredJd])
  if (!doc) return null
  const jdWords = jd.trim() ? jd.trim().split(/\s+/).length : 0

  const loadSample = () => {
    resumeActions.setJobDescription(SAMPLE_JD)
    toast('Loaded a sample job description', 'info')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          sub="Paste the full posting — responsibilities and requirements. It is saved with this resume."
          aside={
            <>
              <Button size="xs" variant="ghost" icon={Sparkles} onClick={loadSample}>
                Try a sample
              </Button>
              {jd && (
                <Button size="xs" variant="ghost" icon={X} onClick={() => resumeActions.setJobDescription('')}>
                  Clear
                </Button>
              )}
            </>
          }
        >
          Job description
        </CardTitle>
        <TextArea aria-label="Job description" rows={9} value={jd} onValue={(v) => resumeActions.setJobDescription(v)} placeholder="Paste the job posting here…" data-native-undo="" className="text-[13px]" />
        <p className="mt-1.5 text-[11px] text-slate-400 tabular-nums dark:text-slate-500">{jdWords ? `${jdWords} words` : 'Tip: include the requirements section — must-have keywords are weighted higher.'}</p>
      </Card>
      {result && result.keywords.length > 0 ? (
        <>
          <MatchSummary result={result} />
          <Missing rows={result.keywords} data={doc.data} />
          <Matched rows={result.keywords} />
          <LetterCta jd={jd} company={doc.coverLetter.company} role={doc.coverLetter.role} />
        </>
      ) : result ? (
        <Card className="text-sm text-slate-600 dark:text-slate-300">No keywords found yet — paste a longer job description with the skills and requirements.</Card>
      ) : (
        <EmptyState onSample={loadSample} />
      )}
    </div>
  )
}

function EmptyState({ onSample }: { onSample: () => void }) {
  const steps = [
    { icon: ClipboardList, title: 'Paste a job description', text: 'From LinkedIn, Naukri, a careers page — anywhere.' },
    { icon: FileSearch, title: 'See what is missing', text: 'Keywords are ranked by how much the employer stresses them.' },
    { icon: Mail, title: 'Tailor & apply', text: 'Add what you genuinely have, then write a matching cover letter.' },
  ]
  return (
    <Card>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <s.icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {i + 1}. {s.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button className="mt-4 w-full" icon={Sparkles} onClick={onSample}>
        Try it with a sample job description
      </Button>
    </Card>
  )
}

function MatchSummary({ result }: { result: MatchResult }) {
  const tone: Tone = result.score >= 75 ? 'emerald' : result.score >= 55 ? 'indigo' : result.score >= 35 ? 'amber' : 'rose'
  const must = result.keywords.filter((k) => importance(k) === 'must')
  const mustFound = must.filter((k) => k.matched).length
  const ys = yearsStatus(result.yearsRequired, result.yearsOnResume)
  const ysPill = { meets: ['emerald', 'Meets'], close: ['amber', 'Close'], below: ['rose', 'Below'], unknown: ['slate', '—'] } as const
  return (
    <Card>
      <div className="flex items-center gap-4">
        <ScoreRing value={result.score} tone={tone} label={`Keyword match ${result.score} percent`} caption="% match" />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">Job match</p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">{matchLabel(result.score)}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {result.matched} of {result.keywords.length} keywords found{must.length > 0 && ` · must-haves ${mustFound}/${must.length}`}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Aim for 70%+ — but only add skills you can talk about in an interview.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <Briefcase className="size-4 text-slate-400" aria-hidden />
        {result.yearsRequired !== null ? (
          <>
            <span className="text-slate-600 dark:text-slate-300">
              <strong className="font-semibold text-slate-900 dark:text-white">{result.yearsRequired}+ years</strong> required · <strong className="font-semibold text-slate-900 dark:text-white">{result.yearsOnResume} years</strong> on your resume
            </span>
            <Pill tone={ysPill[ys][0]}>{ysPill[ys][1]}</Pill>
          </>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">No years-of-experience requirement detected · {result.yearsOnResume} years on your resume</span>
        )}
      </div>
    </Card>
  )
}

function addToSkills(row: MatchRow, data: ResumeData) {
  const category = row.category === 'phrase' ? null : row.category
  let pick = pickSkillsEntry(data, category)
  let created = false
  if (!pick) {
    resumeActions.addSection('skills', { withEntry: true })
    const fresh = getActiveDoc()?.data
    pick = fresh ? pickSkillsEntry(fresh, category) : null
    created = true
  }
  const current = getActiveDoc()?.data
  const entry = pick && current ? findEntry(current, pick.sectionId, pick.entryId) : undefined
  if (!pick || !entry) return
  resumeActions.updateEntry(pick.sectionId, pick.entryId, { keywords: withKeyword(entry.keywords, row.label) }, null)
  toastWithUndo(created ? `Added “${row.label}” to a new Skills section` : `Added “${row.label}” to ${entry.title.trim() ? `Skills › ${entry.title}` : 'Skills'}`)
}

function Missing({ rows, data }: { rows: MatchRow[]; data: ResumeData }) {
  const missing = missingByPriority(rows)
  if (!missing.length) {
    return (
      <Card className="flex items-center gap-3">
        <Check className="size-5 text-emerald-500" aria-hidden />
        <p className="text-sm text-slate-700 dark:text-slate-200">Every keyword from the posting appears in your resume. Nice!</p>
      </Card>
    )
  }
  return (
    <Card>
      <CardTitle
        sub="Highest impact first. Weave each one into the suggested section — honestly."
        aside={
          <Button size="xs" variant="ghost" icon={Copy} onClick={() => void copyWithToast(missing.map((k) => k.label).join(', '), `${missing.length} keywords`)}>
            Copy all
          </Button>
        }
      >
        Missing keywords <span className="font-semibold text-slate-400">({missing.length})</span>
      </CardTitle>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {missing.map((k) => {
          const imp = importance(k)
          const place = placementFor(k, data)
          const skill = isSkillKeyword(k)
          return (
            <li key={k.key} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{k.label}</span>
                <Pill tone={IMPORTANCE_TONE[imp]}>{IMPORTANCE_LABEL[imp]}</Pill>
                {k.count > 1 && <span className="text-[11px] text-slate-400 dark:text-slate-500">mentioned {k.count}×</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{k.suggestion}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {skill && (
                  <Button size="xs" variant="secondary" icon={Plus} onClick={() => addToSkills(k, data)} aria-label={`Add ${k.label} to Skills`}>
                    Add to Skills
                  </Button>
                )}
                <Button size="xs" variant="ghost" iconRight={ArrowRight} onClick={() => goToPlacement(place)} aria-label={`${place.target ? 'Go to' : 'Add'} ${place.label} for ${k.label}`}>
                  {place.target ? `Go to ${place.label}` : `Add ${place.label}`}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Matched({ rows }: { rows: MatchRow[] }) {
  const matched = rows.filter((r) => r.matched)
  if (!matched.length) return null
  const groups = groupKeywords(matched)
  return (
    <Card>
      <CardTitle sub="Already on your resume — make sure the most important ones appear in your bullets, not only in Skills.">
        Matched keywords <span className="font-semibold text-slate-400">({matched.length})</span>
      </CardTitle>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="mb-1.5 text-[11px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">{g.label}</p>
            <ul className="flex flex-wrap gap-1.5">
              {g.rows.map((k) => (
                <li key={k.key} title={`Found in ${k.foundIn.join(', ') || 'your resume'}`} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', 'bg-emerald-50 text-emerald-800 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20')}>
                  <Check className="size-3" aria-hidden />
                  {k.label}
                  {importance(k) === 'must' && <span className="sr-only"> (must-have)</span>}
                  {importance(k) === 'must' && <span className="size-1.5 rounded-full bg-rose-400" aria-hidden />}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="size-1.5 rounded-full bg-rose-400" aria-hidden /> must-have in the posting
      </p>
    </Card>
  )
}

function LetterCta({ jd, company, role }: { jd: string; company: string; role: string }) {
  const info = useMemo(() => extractJobInfo(jd), [jd])
  const target = company || info.company
  const go = () => {
    const patch: { company?: string; role?: string } = {}
    if (!company && info.company) patch.company = info.company
    if (!role && info.role) patch.role = info.role
    if (patch.company || patch.role) resumeActions.updateCoverLetter(patch, null)
    uiActions.setPanel('cover')
  }
  return (
    <Card className="flex flex-wrap items-center gap-3 bg-gradient-to-br from-indigo-50 to-white ring-indigo-100 dark:from-indigo-500/10 dark:to-slate-900 dark:ring-indigo-500/20">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
        <Mail className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Tailor a cover letter{target ? ` for ${target}` : ''}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{info.role || info.company ? `Detected ${[info.role, info.company].filter(Boolean).join(' at ')} — we will fill those in.` : 'Reuse your strongest achievement and the keywords above.'}</p>
      </div>
      <Button size="sm" variant="primary" iconRight={ArrowRight} onClick={go}>
        Write letter
      </Button>
    </Card>
  )
}
