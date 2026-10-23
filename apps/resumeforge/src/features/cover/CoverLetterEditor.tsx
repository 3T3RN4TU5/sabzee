/**
 * Cover letter editor ("Cover letter" side-panel tab): layout picker, starter templates, autofill
 * from the job description, all CoverLetter fields, a quality check and PDF / TXT export.
 * The preview pane shows <CoverLetterDocument> while this panel is active. OWNER: cover agent.
 */
import { CalendarDays, CheckCircle2, Copy, Download, FileText, Printer, Sparkles, Wand2, XCircle } from 'lucide-react'
import { useMemo, useRef, type ReactNode } from 'react'
import { LETTER_STARTERS, letterToText, starterLetter, type LetterStarter } from '../../lib/coverLetter.ts'
import { printFilename } from '../../lib/filename.ts'
import { extractJobInfo } from '../../lib/jobMatch.ts'
import { CLOSINGS, greetingOptions, hasFillableTokens, LETTER_LAYOUTS, letterReport, replaceLetterTokens, todayIso, type LetterLayoutId } from '../../lib/letterTools.ts'
import type { CoverLetter, ResumeDoc } from '../../lib/types.ts'
import { confirmDialog, resumeActions, toast, useActiveDoc } from '../../store'
import { Button, cn, TextArea, TextField } from '../../ui'
import { copyText, downloadFile } from '../io/download.ts'
import { printDocument } from '../io/print.ts'
import { setLetterLayout, useLetterLayout, useLetterPrefs } from './letterPrefs.ts'

const set = (patch: Partial<CoverLetter>, key?: string | null) => resumeActions.updateCoverLetter(patch, key)

export function CoverLetterEditor() {
  const doc = useActiveDoc()
  if (!doc) return null
  return <Editor doc={doc} />
}

function Editor({ doc }: { doc: ResumeDoc }) {
  const l = doc.coverLetter
  const body = useRef<HTMLTextAreaElement>(null)
  const info = useMemo(() => extractJobInfo(doc.jobDescription), [doc.jobDescription])
  const report = useMemo(() => letterReport(l), [l])
  const tokens = { company: l.company, role: l.role, recipient: l.recipient }
  const fillable = hasFillableTokens(l.body, tokens) || hasFillableTokens(l.greeting, tokens)

  const applyStarter = async (s: LetterStarter) => {
    if (l.body.trim() && !(await confirmDialog({ title: `Replace your letter with “${s.name}”?`, message: 'Your current text will be replaced. You can undo with Ctrl+Z.', confirmLabel: 'Replace' }))) return
    const base: CoverLetter = { ...l, company: l.company || info.company, role: l.role || info.role }
    const out = starterLetter(s.id, doc.data, base)
    set({ ...out, company: base.company, role: base.role, date: l.date || todayIso() }, null)
    toast(`Started from “${s.name}” — replace the [bracketed] parts`, 'success')
  }

  const autofill = () => {
    const patch: Partial<CoverLetter> = {}
    if (info.company && info.company !== l.company) patch.company = info.company
    if (info.role && info.role !== l.role) patch.role = info.role
    set(patch, null)
    toast('Filled in company and role from your job description', 'success')
  }

  const fillTokens = () => {
    set({ body: replaceLetterTokens(l.body, tokens), greeting: replaceLetterTokens(l.greeting, tokens) }, null)
    toast('Replaced [Company] / [Role] placeholders', 'success')
  }

  const selectPlaceholder = (ph: string) => {
    const ta = body.current
    if (!ta) return
    const at = ta.value.indexOf(ph)
    ta.focus()
    if (at >= 0) ta.setSelectionRange(at, at + ph.length)
  }

  const showAutofill = (info.company && info.company !== l.company) || (info.role && info.role !== l.role)

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <ExportBar doc={doc} />
      <LayoutPicker docId={doc.id} />

      <Section title="Start from a template" sub="Drafts a letter from your resume — your strongest bullet, top skills and current role.">
        <div className="grid gap-2">
          {LETTER_STARTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void applyStarter(s)}
              className="group rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-slate-200 transition hover:ring-indigo-300 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-indigo-500/60"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Wand2 className="size-3.5 text-indigo-500 dark:text-indigo-400" aria-hidden />
                {s.name}
              </span>
              <span className="mt-0.5 block pl-5 text-xs leading-snug text-slate-500 dark:text-slate-400">{s.description}</span>
            </button>
          ))}
        </div>
      </Section>

      {showAutofill && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
          <Sparkles className="size-4 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden />
          <p className="min-w-0 flex-1 text-xs text-indigo-900 dark:text-indigo-100">
            From your job description: <strong>{[info.role, info.company].filter(Boolean).join(' at ')}</strong>
          </p>
          <Button size="xs" variant="primary" onClick={autofill}>
            Autofill
          </Button>
        </div>
      )}

      <Section title="Recipient & role">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Company" value={l.company} onValue={(v) => set({ company: v })} placeholder="Acme Corp" autoComplete="organization" />
          <TextField label="Role you are applying for" value={l.role} onValue={(v) => set({ role: v })} placeholder="Frontend Engineer" />
          <TextField label="Hiring manager" value={l.recipient} onValue={(v) => set({ recipient: v })} placeholder="Priya Sharma" />
          <TextField label="Their title" value={l.recipientTitle} onValue={(v) => set({ recipientTitle: v })} placeholder="Engineering Manager" />
          <TextField label="Company address (optional)" value={l.address} onValue={(v) => set({ address: v })} placeholder="MG Road, Bengaluru" shellClassName="sm:col-span-2" />
          <div className="sm:col-span-2">
            <label htmlFor="rf-letter-date" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Date
            </label>
            <div className="flex gap-2">
              <TextField id="rf-letter-date" type="date" value={l.date} onValue={(v) => set({ date: v }, null)} shellClassName="flex-1" />
              <Button size="md" variant="secondary" icon={CalendarDays} onClick={() => set({ date: todayIso() }, null)}>
                Today
              </Button>
              {l.date && (
                <Button size="md" variant="ghost" onClick={() => set({ date: '' }, null)}>
                  No date
                </Button>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Letter">
        <div className="space-y-3">
          <div>
            <TextField label="Greeting" value={l.greeting} onValue={(v) => set({ greeting: v })} placeholder="Dear Hiring Manager," />
            <Chips label="Greeting suggestions" options={greetingOptions(l)} current={l.greeting} onPick={(g) => set({ greeting: g }, null)} />
          </div>
          <div>
            <TextArea
              ref={body}
              label="Body"
              hint="Separate paragraphs with a blank line. **bold**, *italic* and [links](https://example.com) work."
              rows={14}
              value={l.body}
              onValue={(v) => set({ body: v })}
              placeholder={'Start with why this role at this company excites you.\n\nThen prove it with one or two achievements from your resume.\n\nClose with a clear call to action.'}
            />
            {(report.placeholders.length > 0 || fillable) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:ring-amber-400/20">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">To replace:</span>
                {report.placeholders.slice(0, 8).map((ph) => (
                  <button key={ph} type="button" onClick={() => selectPlaceholder(ph)} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-slate-900 dark:text-amber-200 dark:ring-amber-400/30">
                    {ph}
                  </button>
                ))}
                {fillable && (
                  <Button size="xs" variant="secondary" icon={Wand2} onClick={fillTokens} className="ml-auto">
                    Fill company & role
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <TextField label="Closing" value={l.closing} onValue={(v) => set({ closing: v })} placeholder="Sincerely," />
              <Chips label="Closing suggestions" options={CLOSINGS.slice(0, 3)} current={l.closing} onPick={(c) => set({ closing: c }, null)} />
            </div>
            <TextField label="Signature" value={l.signature} onValue={(v) => set({ signature: v })} placeholder={doc.data.basics.name || 'Your name'} hint="Defaults to your name." />
          </div>
        </div>
      </Section>

      <LetterCheck report={report} />
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Chips({ label, options, current, onPick }: { label: string; options: string[]; current: string; onPick: (v: string) => void }) {
  const opts = options.filter((o) => o !== current.trim())
  if (!opts.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={label}>
      {opts.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-200">
          {o}
        </button>
      ))}
    </div>
  )
}

function ExportBar({ doc }: { doc: ResumeDoc }) {
  const text = () => letterToText(doc.coverLetter, doc.data)
  const empty = !doc.coverLetter.body.trim()
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Cover letter</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Styled with your resume template, accent and fonts.</p>
      </div>
      <Button size="sm" variant="primary" icon={Printer} onClick={() => void printDocument({ target: 'letter' })} disabled={empty} title={empty ? 'Write your letter first' : 'Save as PDF'}>
        PDF
      </Button>
      <Button
        size="sm"
        icon={Download}
        disabled={empty}
        onClick={() => {
          downloadFile(`${printFilename(doc.data.basics.name, 'Cover_Letter')}.txt`, text())
          toast('Downloaded the letter as plain text', 'success')
        }}
      >
        .txt
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={Copy}
        disabled={empty}
        onClick={async () => {
          const ok = await copyText(text())
          toast(ok ? 'Letter copied — paste it into an application form' : 'Could not copy to the clipboard', ok ? 'success' : 'error')
        }}
      >
        Copy
      </Button>
    </div>
  )
}

function LayoutThumb({ id, active }: { id: LetterLayoutId; active: boolean }) {
  const line = (w: string, extra = '') => <span className={cn('block h-[3px] rounded-full bg-slate-300 dark:bg-slate-600', extra)} style={{ width: w }} />
  const accent = active ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-500'
  return (
    <span className="flex h-16 flex-col gap-[5px] rounded-md bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700" aria-hidden>
      {id === 'classic' && (
        <>
          {line('30%')}
          {line('45%')}
          {line('55%', 'h-[4px] bg-slate-500 dark:bg-slate-400')}
          {line('100%')}
          {line('92%')}
          {line('96%')}
        </>
      )}
      {id === 'accent' && (
        <>
          <span className="flex items-start justify-between">
            <span className={cn('h-3 w-[3px] rounded-full', accent)} />
            {line('25%', accent)}
          </span>
          {line('60%', 'h-[5px] bg-slate-500 dark:bg-slate-400')}
          <span className={cn('block h-[3px] w-[18%] rounded-full', accent)} />
          {line('100%')}
          {line('94%')}
        </>
      )}
      {id === 'minimal' && (
        <>
          <span className="flex justify-end">{line('28%')}</span>
          {line('38%', 'opacity-60')}
          {line('100%', 'mt-1')}
          {line('90%')}
          <span className={cn('mt-auto block h-[5px] w-[35%] -skew-x-12 rounded-full', accent)} />
        </>
      )}
    </span>
  )
}

function LayoutPicker({ docId }: { docId: string }) {
  const layout = useLetterLayout(docId)
  return (
    <section aria-labelledby="rf-letter-layout" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h3 id="rf-letter-layout" className="text-sm font-bold text-slate-900 dark:text-white">
        Layout
      </h3>
      <div role="radiogroup" aria-labelledby="rf-letter-layout" className="mt-3 grid grid-cols-3 gap-2">
        {LETTER_LAYOUTS.map((o) => {
          const on = o.id === layout
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              title={o.description}
              onClick={() => setLetterLayout(docId, o.id)}
              className={cn(
                'rounded-xl p-1.5 text-left ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                on ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/10 dark:ring-indigo-400' : 'bg-slate-50 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800/50 dark:ring-slate-700 dark:hover:ring-slate-600',
              )}
            >
              <LayoutThumb id={o.id} active={on} />
              <span className={cn('mt-1.5 block truncate px-0.5 text-xs font-semibold', on ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200')}>{o.name}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{LETTER_LAYOUTS.find((o) => o.id === layout)?.description} Header, colours and fonts follow your resume template.</p>
    </section>
  )
}

function LetterCheck({ report }: { report: ReturnType<typeof letterReport> }) {
  const pages = useLetterPrefs((s) => s.pages)
  const checks = [...report.checks, { id: 'pages', label: 'Fits on one page', ok: pages <= 1, detail: pages > 1 ? `${pages} pages — shorten paragraphs or reduce font size in Design` : undefined }]
  const passed = checks.filter((c) => c.ok).length
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800" aria-labelledby="rf-letter-check">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="rf-letter-check" className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
            <FileText className="size-4 text-slate-400" aria-hidden /> Letter check
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {report.words} words · {report.paragraphs} paragraph{report.paragraphs === 1 ? '' : 's'}
            {report.minutes > 0 && ` · ${report.minutes} min read`}
          </p>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', passed === checks.length ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20' : 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40')}>
          {passed} / {checks.length} passed
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs">
            {c.ok ? <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" aria-label="Passed" /> : <XCircle className="mt-px size-3.5 shrink-0 text-amber-500 dark:text-amber-400" aria-label="Needs work" />}
            <span className={c.ok ? 'text-slate-700 dark:text-slate-200' : 'font-medium text-slate-800 dark:text-slate-100'}>
              {c.label}
              {c.detail && <span className="font-normal text-slate-500 dark:text-slate-400"> — {c.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
