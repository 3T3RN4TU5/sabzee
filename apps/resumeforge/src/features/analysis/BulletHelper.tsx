/**
 * Bullet helper: action verbs by category, STAR/XYZ templates with fill-in placeholders and example
 * bullets by role. Rendered by the content editor (lazy, from src/app/lazy.ts) next to a bullets list.
 * Keyboard: arrow keys move between tabs, Esc closes (onDone). OWNER: analysis agent.
 */
import { ArrowLeft, CornerDownLeft, Lightbulb, Plus, Wand2, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { BULLET_TEMPLATES, EXAMPLE_BULLETS, VERB_CATEGORIES, type BulletTemplate } from '../../lib/bulletLibrary.ts'
import { exampleGroupIndex, fillTemplate, templateParts, templatePlaceholders } from '../../lib/bulletTools.ts'
import { findEntry } from '../../lib/ops.ts'
import { applyVerb } from '../../lib/rewrite.ts'
import { focusField, getActiveDoc, resumeActions } from '../../store'
import { Button, cn, IconButton, Select } from '../../ui'

export interface BulletHelperProps {
  sectionId: string
  entryId: string
  /** When set, choosing a phrase replaces this bullet instead of appending a new one. */
  bulletIndex?: number
  /** The entry's title (role), used to pick relevant examples. */
  role?: string
  /** Called after a bullet was inserted/replaced (e.g. to close a popover). */
  onDone?: () => void
}

type Tab = 'verbs' | 'templates' | 'examples'
const TABS: { id: Tab; label: string }[] = [
  { id: 'verbs', label: 'Action verbs' },
  { id: 'templates', label: 'Templates' },
  { id: 'examples', label: 'Examples' },
]

/** Write `text` into the target bullet (or the trailing empty bullet, or a new one) and jump to it. */
function insertBullet(sectionId: string, entryId: string, bulletIndex: number | undefined, text: string | ((current: string) => string)) {
  const entry = getActiveDoc() ? findEntry(getActiveDoc()!.data, sectionId, entryId) : undefined
  if (!entry) return
  let index = bulletIndex !== undefined && bulletIndex < entry.bullets.length ? bulletIndex : -1
  if (index < 0 && entry.bullets.length && !entry.bullets[entry.bullets.length - 1].trim()) index = entry.bullets.length - 1
  const current = index >= 0 ? entry.bullets[index] : ''
  const value = typeof text === 'function' ? text(current) : text
  if (index >= 0) resumeActions.updateBullet(sectionId, entryId, index, value, null)
  else {
    resumeActions.addBullet(sectionId, entryId, value)
    index = entry.bullets.length
  }
  focusField({ sectionId, entryId, field: 'bullets', bullet: index })
}

export function BulletHelper({ sectionId, entryId, bulletIndex, role, onDone }: BulletHelperProps) {
  const [tab, setTab] = useState<Tab>('verbs')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const replacing = bulletIndex !== undefined

  useEffect(() => {
    tabRefs.current[0]?.focus({ preventScroll: true })
  }, [])

  const done = () => onDone?.()
  const insert = (text: string | ((current: string) => string)) => {
    insertBullet(sectionId, entryId, bulletIndex, text)
    done()
  }

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === tab)
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
    setTab(TABS[n].id)
    tabRefs.current[n]?.focus()
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Bullet ideas"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          done()
        }
      }}
      className="rounded-2xl bg-white p-3 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200 dark:bg-slate-900 dark:shadow-black/30 dark:ring-slate-700"
    >
      <div className="mb-2 flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Bullet ideas</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{replacing ? `Rewrites bullet ${bulletIndex + 1}` : 'Inserts a new bullet'}{role?.trim() ? ` · ${role.trim()}` : ''}</p>
        </div>
        {onDone && <IconButton size="xs" icon={X} label="Close bullet ideas" onClick={done} />}
      </div>
      <div role="tablist" aria-label="Bullet idea type" className="mb-3 grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" onKeyDown={onTabKey}>
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            id={`${uid}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-1.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-500',
              tab === t.id ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'verbs' && <Verbs replacing={replacing} onPick={(v) => insert((cur) => applyVerb(cur, v))} />}
        {tab === 'templates' && <Templates onInsert={insert} />}
        {tab === 'examples' && <Examples role={role} onInsert={insert} />}
      </div>
    </div>
  )
}

function Verbs({ replacing, onPick }: { replacing: boolean; onPick: (verb: string) => void }) {
  const [cat, setCat] = useState(0)
  const group = VERB_CATEGORIES[cat] ?? VERB_CATEGORIES[0]
  return (
    <div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Verb category">
        {VERB_CATEGORIES.map((c, i) => (
          <button
            key={c.name}
            type="button"
            role="radio"
            aria-checked={i === cat}
            onClick={() => setCat(i)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-indigo-500',
              i === cat ? 'bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      <p className="mt-2.5 mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">{replacing ? 'Click a verb to swap it in as the opening word.' : 'Click a verb to start a new bullet with it.'}</p>
      <ul className="grid grid-cols-3 gap-1">
        {group.verbs.map((v) => (
          <li key={v}>
            <button type="button" onClick={() => onPick(v)} className="w-full truncate rounded-lg bg-slate-50 px-2 py-1.5 text-left text-xs font-medium text-slate-700 ring-1 ring-slate-200/70 hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-200">
              {v}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Pattern({ pattern }: { pattern: string }) {
  return (
    <>
      {templateParts(pattern).map((p, i) =>
        p.placeholder ? (
          <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

function Templates({ onInsert }: { onInsert: (text: string) => void }) {
  const [active, setActive] = useState<BulletTemplate | null>(null)
  if (active) return <TemplateForm template={active} onBack={() => setActive(null)} onInsert={onInsert} />
  return (
    <ul className="space-y-1.5">
      {BULLET_TEMPLATES.map((t) => (
        <li key={t.name} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700/70">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t.name}</p>
            <Button size="xs" variant="secondary" icon={Wand2} onClick={() => setActive(t)} aria-label={`Fill in the ${t.name} template`}>
              Fill in
            </Button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <Pattern pattern={t.pattern} />
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 italic dark:text-slate-400">e.g. {t.example}</p>
        </li>
      ))}
    </ul>
  )
}

function TemplateForm({ template, onBack, onInsert }: { template: BulletTemplate; onBack: () => void; onInsert: (text: string) => void }) {
  const names = useMemo(() => templatePlaceholders(template.pattern), [template.pattern])
  const [values, setValues] = useState<Record<string, string>>({})
  const first = useRef<HTMLInputElement>(null)
  const uid = useId()
  useEffect(() => first.current?.focus({ preventScroll: true }), [])
  const preview = fillTemplate(template.pattern, values)
  const filled = names.filter((n) => values[n]?.trim()).length
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onInsert(preview)
      }}
    >
      <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft className="size-3.5" aria-hidden /> All templates
      </button>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{template.name}</p>
      <div className="mt-2 space-y-2">
        {names.map((n, i) => (
          <div key={n}>
            <label htmlFor={`${uid}-${i}`} className="mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {n}
            </label>
            <input
              id={`${uid}-${i}`}
              ref={i === 0 ? first : undefined}
              value={values[n] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [n]: e.target.value }))}
              placeholder={n}
              className="block w-full rounded-lg border-0 bg-white px-2.5 py-1.5 text-xs text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-700 ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700" aria-live="polite">
        <span className="mb-0.5 block text-[10px] font-bold tracking-wide text-slate-400 uppercase">Preview</span>
        <Pattern pattern={preview} />
      </div>
      {filled < names.length && <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">Unfilled [placeholders] are flagged by the ATS check until you replace them.</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Button type="submit" size="xs" variant="primary" icon={CornerDownLeft}>
          Insert bullet
        </Button>
        <Button size="xs" variant="ghost" onClick={() => onInsert(template.example)}>
          Use the example
        </Button>
      </div>
    </form>
  )
}

function Examples({ role, onInsert }: { role?: string; onInsert: (text: string) => void }) {
  const [group, setGroup] = useState(() => exampleGroupIndex(role))
  const g = EXAMPLE_BULLETS[group] ?? EXAMPLE_BULLETS[0]
  return (
    <div>
      <Select label="Role" value={String(group)} onValue={(v) => setGroup(Number(v))} options={EXAMPLE_BULLETS.map((x, i) => ({ value: String(i), label: x.role }))} className="py-1.5 text-xs" />
      <p className="mt-2 mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">Pick one, then swap in your own numbers and tools.</p>
      <ul className="space-y-1">
        {g.bullets.map((b) => (
          <li key={b}>
            <button type="button" onClick={() => onInsert(b)} className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs leading-relaxed text-slate-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-indigo-500/10">
              <Plus className="mt-0.5 size-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden />
              <span>{b}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
