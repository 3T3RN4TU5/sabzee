/**
 * Resume strength / ATS checker. Pure functions: every issue carries a `target` so the UI can
 * jump straight to the offending field.
 */
import { isReversed } from './dates.ts'
import { ACTION_VERBS, BUZZWORDS, PASSIVE_ALLOW, PASSIVE_RE, PRONOUN_RE, SPELLING, STRONG_VERBS, VERB_FORMS, WEAK_PHRASES, pastTense } from './dictionaries.ts'
import { yearsOfExperience } from './keywords.ts'
import { inlineToPlain } from './markdown.ts'
import { fleschReadingEase, words, type Readability } from './readability.ts'
import { ENTRY_KINDS } from './sections.ts'
import type { Entry, ResumeData, Section } from './types.ts'
import { fieldError, isEmail, isPhone, isUrl } from './validate.ts'

export type Severity = 'error' | 'warning' | 'info'
export type Category = 'Contact' | 'Content' | 'Impact' | 'Language' | 'Format'

export interface Target {
  sectionId?: string
  entryId?: string
  /** Entry/basics field name, or 'content' for a summary. */
  field?: string
  bullet?: number
}

export interface Issue {
  id: string
  rule: string
  severity: Severity
  category: Category
  message: string
  detail?: string
  suggestions?: string[]
  target?: Target
}

export interface CategoryScore {
  name: Category
  score: number
  max: number
}

export interface Analysis {
  score: number
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs work'
  categories: CategoryScore[]
  issues: Issue[]
  stats: {
    words: number
    bullets: number
    quantified: number
    actionVerbs: number
    pages: number | null
    years: number
    readability: Readability
  }
}

interface BulletRef {
  text: string
  section: Section
  entry: Entry
  index: number
}

const METRIC_RE = /(\d|%|\$|₹|€|£|\bx\b|\bdoubled\b|\btripled\b|\bhalved\b)/i
const PLACEHOLDER_RE = /\[[^\]\n]{1,40}\](?!\()/

export function firstWord(text: string): string {
  return (text.trim().match(/^[A-Za-z][A-Za-z-]*/)?.[0] ?? '').toLowerCase()
}

export function detectWeakOpener(text: string) {
  return WEAK_PHRASES.find((w) => w.pattern.test(text.trim())) ?? null
}

export function detectPassive(text: string): string | null {
  const re = new RegExp(PASSIVE_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (!PASSIVE_ALLOW.has(m[2].toLowerCase())) return m[0]
  }
  return null
}

export function detectBuzzwords(text: string): string[] {
  const lower = text.toLowerCase()
  return BUZZWORDS.filter((b) => new RegExp(`(^|[^a-z])${b.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z]|$)`).test(lower))
}

/** Misspelled words / wrongly-cased tech terms (URLs and emails are ignored). */
export function detectSpelling(text: string): { wrong: string; right: string }[] {
  const cleaned = text.replace(/\b(?:https?:\/\/|www\.)\S+|\S+@\S+|\b[\w-]+\.(?:com|dev|io|app|org|net|ai|in|me|co)(?:\/\S*)?/gi, ' ')
  const found = new Map<string, string>()
  for (const tok of cleaned.split(/[^A-Za-z0-9.+#/-]+/)) {
    const t = tok.replace(/[.,/-]+$/, '')
    if (SPELLING[t] && SPELLING[t] !== t) found.set(t, SPELLING[t])
  }
  return [...found].map(([wrong, right]) => ({ wrong, right }))
}

export function verbTense(text: string): 'past' | 'present' | null {
  const w = firstWord(text)
  if (!w) return null
  const form = VERB_FORMS.get(w)
  if (form) return form.tense
  if (/[a-z]{3,}ed$/.test(w)) return 'past'
  return null
}

function suggestVerbs(base?: string): string[] {
  if (base) {
    const cat = Object.values(ACTION_VERBS).find((list) => list.includes(base))
    if (cat) return cat.filter((v) => v !== base).slice(0, 4).map((v) => cap(pastTense(v)))
  }
  return ['Built', 'Led', 'Reduced', 'Launched']
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function analyse(data: ResumeData, opts: { pages?: number | null; now?: Date } = {}): Analysis {
  const issues: Issue[] = []
  const add = (i: Omit<Issue, 'id'>) => issues.push({ ...i, id: `${i.rule}:${i.target?.sectionId ?? ''}:${i.target?.entryId ?? ''}:${i.target?.field ?? ''}:${i.target?.bullet ?? ''}:${issues.length}` })
  const b = data.basics
  const visible = data.sections.filter((s) => !s.hidden)
  const ofKind = (k: Section['kind']) => visible.filter((s) => s.kind === k)

  /* ---------- Contact ---------- */
  let contact = 0
  if (b.name.trim() && b.title.trim()) contact += 4
  else add({ rule: 'contact-name', severity: 'error', category: 'Contact', message: b.name.trim() ? 'Add the job title you are targeting' : 'Add your full name', target: { field: b.name.trim() ? 'title' : 'name' } })
  if (isEmail(b.email)) contact += 4
  else add({ rule: 'contact-email', severity: 'error', category: 'Contact', message: b.email.trim() ? 'Email address looks invalid' : 'Add an email address', target: { field: 'email' } })
  if (isPhone(b.phone)) contact += 3
  else add({ rule: 'contact-phone', severity: 'warning', category: 'Contact', message: b.phone.trim() ? 'Phone number looks invalid' : 'Add a phone number', target: { field: 'phone' } })
  if (b.location.trim()) contact += 1
  else add({ rule: 'contact-location', severity: 'info', category: 'Contact', message: 'Add a city/country — many recruiters filter by location', target: { field: 'location' } })
  if (b.linkedin.trim() || b.github.trim() || b.website.trim()) contact += 3
  else add({ rule: 'contact-links', severity: 'warning', category: 'Contact', message: 'Add LinkedIn, GitHub or a portfolio link', target: { field: 'linkedin' } })
  for (const [field, kind] of [
    ['website', 'url'],
    ['linkedin', 'linkedin'],
    ['github', 'github'],
  ] as const) {
    const err = fieldError(kind, b[field])
    if (err) add({ rule: 'contact-link-invalid', severity: 'warning', category: 'Contact', message: err, target: { field } })
  }

  /* ---------- Content ---------- */
  let content = 0
  const summary = ofKind('summary')[0]
  const summaryWords = summary ? words(inlineToPlain(summary.content)).length : 0
  if (summary && summaryWords >= 25 && summaryWords <= 90) content += 6
  else if (!summary || summaryWords === 0) add({ rule: 'summary-missing', severity: 'warning', category: 'Content', message: 'Add a 2–4 sentence summary', detail: 'Recruiters skim the top third of page one first.', target: summary ? { sectionId: summary.id, field: 'content' } : undefined })
  else {
    content += 3
    add({ rule: 'summary-length', severity: 'info', category: 'Content', message: `Summary is ${summaryWords} words — aim for 25–90`, target: { sectionId: summary.id, field: 'content' } })
  }
  const filled = (e: Entry) => !!(e.title.trim() || e.subtitle.trim())
  const experience = ofKind('experience').flatMap((s) => s.items.filter(filled).map((e) => ({ s, e })))
  if (experience.length) content += 8
  else if (ofKind('projects').some((s) => s.items.some(filled))) {
    content += 4
    add({ rule: 'experience-missing', severity: 'warning', category: 'Content', message: 'No work experience yet — add internships, freelance or open-source work' })
  } else add({ rule: 'experience-missing', severity: 'error', category: 'Content', message: 'Add at least one work experience, internship or project' })
  const skillCount = ofKind('skills').flatMap((s) => s.items.flatMap((e) => (e.keywords.length ? e.keywords : e.title.trim() ? [e.title] : []))).length
  if (skillCount >= 6) content += 4
  else add({ rule: 'skills-few', severity: 'warning', category: 'Content', message: `Only ${skillCount} skill${skillCount === 1 ? '' : 's'} listed — aim for 8–20 relevant ones`, target: ofKind('skills')[0] ? { sectionId: ofKind('skills')[0].id } : undefined })
  if (ofKind('education').some((s) => s.items.some(filled))) content += 2
  else add({ rule: 'education-missing', severity: 'info', category: 'Content', message: 'Add your education' })

  /* ---------- Bullets ---------- */
  const bullets: BulletRef[] = []
  for (const s of visible) {
    if (!ENTRY_KINDS.includes(s.kind)) continue
    for (const e of s.items) e.bullets.forEach((text, index) => text.trim() && bullets.push({ text: inlineToPlain(text), section: s, entry: e, index }))
  }
  const workBullets = bullets.filter((x) => x.section.kind === 'experience' || x.section.kind === 'volunteering' || x.section.kind === 'projects')
  const bt = (x: BulletRef): Target => ({ sectionId: x.section.id, entryId: x.entry.id, field: 'bullets', bullet: x.index })

  let actionCount = 0
  let quantified = 0
  let weak = 0
  let passive = 0
  let buzz = 0
  let spelling = 0
  let pronouns = 0
  let tense = 0
  let lengthIssues = 0
  let placeholders = 0
  const openers = new Map<string, BulletRef[]>()

  for (const x of bullets) {
    const w = firstWord(x.text)
    const weakHit = detectWeakOpener(x.text)
    if (weakHit) {
      weak++
      add({ rule: 'weak-verb', severity: 'warning', category: 'Language', message: `Weak opener “${weakHit.phrase}”`, detail: short(x.text), suggestions: weakHit.suggestions, target: bt(x) })
    } else if (VERB_FORMS.has(w) || /[a-z]{3,}ed$/.test(w)) {
      const base = VERB_FORMS.get(w)?.base ?? w
      if (STRONG_VERBS.has(base) || /[a-z]{3,}ed$/.test(w)) actionCount++
      const list = openers.get(base) ?? []
      list.push(x)
      openers.set(base, list)
    } else if (x.section.kind === 'experience') {
      add({ rule: 'no-action-verb', severity: 'info', category: 'Impact', message: 'Start with an action verb', detail: short(x.text), suggestions: suggestVerbs(), target: bt(x) })
    }
    if (METRIC_RE.test(x.text)) quantified++
    const pv = detectPassive(x.text)
    if (pv) {
      passive++
      add({ rule: 'passive', severity: 'warning', category: 'Language', message: `Passive voice: “${pv}”`, detail: 'Rewrite so you are the one doing the action.', target: bt(x) })
    }
    const n = words(x.text).length
    if (n < 5) {
      lengthIssues++
      add({ rule: 'bullet-short', severity: 'info', category: 'Format', message: `Very short bullet (${n} word${n === 1 ? '' : 's'}) — add context and a result`, detail: short(x.text), target: bt(x) })
    } else if (n > 32) {
      lengthIssues++
      add({ rule: 'bullet-long', severity: 'warning', category: 'Format', message: `Long bullet (${n} words) — keep it to 1–2 lines`, detail: short(x.text), target: bt(x) })
    }
    if (PRONOUN_RE.test(x.text)) {
      pronouns++
      add({ rule: 'pronoun', severity: 'info', category: 'Language', message: 'Drop first-person pronouns (I, my, me) in bullets', detail: short(x.text), target: bt(x) })
    }
    if (PLACEHOLDER_RE.test(x.text)) {
      placeholders++
      add({ rule: 'placeholder', severity: 'error', category: 'Content', message: `Replace the placeholder ${x.text.match(PLACEHOLDER_RE)?.[0]}`, detail: short(x.text), target: bt(x) })
    }
  }

  for (const [base, list] of openers) {
    if (list.length >= 3) {
      add({ rule: 'repeated-verb', severity: 'info', category: 'Language', message: `${list.length} bullets start with “${cap(firstWord(list[0].text))}” — vary your verbs`, suggestions: suggestVerbs(base), target: bt(list[2]) })
    }
  }

  // tense consistency per entry
  for (const s of visible.filter((x) => x.kind === 'experience' || x.kind === 'volunteering')) {
    for (const e of s.items) {
      const tenses = e.bullets.map((t) => (t.trim() ? verbTense(inlineToPlain(t)) : null))
      if (!e.current) {
        const idx = tenses.indexOf('present')
        if (idx >= 0) {
          tense++
          const base = VERB_FORMS.get(firstWord(inlineToPlain(e.bullets[idx])))?.base
          add({ rule: 'tense-past', severity: 'warning', category: 'Language', message: 'Use past tense for a previous role', detail: short(inlineToPlain(e.bullets[idx])), suggestions: base ? [cap(pastTense(base))] : undefined, target: { sectionId: s.id, entryId: e.id, field: 'bullets', bullet: idx } })
        }
      } else if (tenses.includes('past') && tenses.includes('present')) {
        tense++
        add({ rule: 'tense-mixed', severity: 'info', category: 'Language', message: 'Mixed tenses in your current role — pick one and stay consistent', target: { sectionId: s.id, entryId: e.id, field: 'bullets', bullet: tenses.indexOf('present') } })
      }
    }
  }

  // metrics per role
  for (const s of ofKind('experience')) {
    for (const e of s.items) {
      const list = e.bullets.filter((t) => t.trim())
      if (list.length >= 2 && !list.some((t) => METRIC_RE.test(t))) {
        add({ rule: 'no-metrics', severity: 'warning', category: 'Impact', message: `No numbers in “${short(e.title || 'this role', 30)}” — quantify impact`, detail: 'Add %, ₹/$, users, time saved or team size.', target: { sectionId: s.id, entryId: e.id, field: 'bullets', bullet: 0 } })
      }
      if (e.title.trim() && list.length === 0) add({ rule: 'no-bullets', severity: 'warning', category: 'Impact', message: `Add 3–5 achievement bullets to “${short(e.title, 30)}”`, target: { sectionId: s.id, entryId: e.id, field: 'bullets' } })
      else if (list.length > 7) add({ rule: 'too-many-bullets', severity: 'info', category: 'Format', message: `${list.length} bullets in one role — keep the strongest 4–6`, target: { sectionId: s.id, entryId: e.id, field: 'bullets' } })
    }
  }

  /* ---------- Language across all text ---------- */
  const texts: { text: string; target: Target }[] = []
  if (summary) texts.push({ text: inlineToPlain(summary.content), target: { sectionId: summary.id, field: 'content' } })
  for (const s of visible) {
    for (const e of s.items) {
      for (const f of ['title', 'subtitle', 'description'] as const) if (e[f].trim()) texts.push({ text: inlineToPlain(e[f]), target: { sectionId: s.id, entryId: e.id, field: f } })
      e.bullets.forEach((t, i) => t.trim() && texts.push({ text: inlineToPlain(t), target: { sectionId: s.id, entryId: e.id, field: 'bullets', bullet: i } }))
      if (e.keywords.length) texts.push({ text: e.keywords.join(', '), target: { sectionId: s.id, entryId: e.id, field: 'keywords' } })
    }
  }
  texts.push({ text: b.title, target: { field: 'title' } })
  for (const { text, target } of texts) {
    for (const bw of detectBuzzwords(text)) {
      buzz++
      add({ rule: 'buzzword', severity: 'warning', category: 'Language', message: `Cliché: “${bw}”`, detail: 'Show it with evidence instead of claiming it.', target })
    }
    for (const sp of detectSpelling(text)) {
      spelling++
      const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9+#]/g, '')
      const casing = squash(sp.wrong) === squash(sp.right)
      add({ rule: 'spelling', severity: casing ? 'info' : 'warning', category: 'Language', message: `${casing ? 'Write' : 'Spelling:'} “${sp.right}” ${casing ? `not “${sp.wrong}”` : `(not “${sp.wrong}”)`}`, suggestions: [sp.right], target })
    }
  }
  if (summary && PRONOUN_RE.test(inlineToPlain(summary.content))) {
    add({ rule: 'pronoun', severity: 'info', category: 'Language', message: 'Consider dropping “I/my” from your summary', target: { sectionId: summary.id, field: 'content' } })
  }

  /* ---------- Dates & links ---------- */
  let dateIssues = 0
  for (const s of visible.filter((x) => x.kind === 'experience' || x.kind === 'education' || x.kind === 'volunteering')) {
    for (const e of s.items) {
      if (!e.title.trim() && !e.subtitle.trim()) continue
      if (!e.start.trim()) {
        dateIssues++
        add({ rule: 'date-missing', severity: s.kind === 'experience' ? 'warning' : 'info', category: 'Format', message: `Add a start date to “${short(e.title || e.subtitle, 30)}”`, target: { sectionId: s.id, entryId: e.id, field: 'start' } })
      } else if (!e.current && !e.end.trim() && s.kind === 'experience') {
        dateIssues++
        add({ rule: 'date-end', severity: 'info', category: 'Format', message: `Add an end date or tick “Present” for “${short(e.title, 30)}”`, target: { sectionId: s.id, entryId: e.id, field: 'end' } })
      } else if (!e.current && isReversed(e.start, e.end)) {
        dateIssues++
        add({ rule: 'date-reversed', severity: 'error', category: 'Format', message: `End date is before start date in “${short(e.title, 30)}”`, target: { sectionId: s.id, entryId: e.id, field: 'end' } })
      }
    }
  }
  let linkIssues = 0
  for (const s of visible) {
    for (const e of s.items) {
      if (e.url.trim() && !isUrl(e.url)) {
        linkIssues++
        add({ rule: 'link-invalid', severity: 'warning', category: 'Format', message: `Invalid link in “${short(e.title || s.title, 30)}”`, target: { sectionId: s.id, entryId: e.id, field: 'url' } })
      }
    }
  }

  /* ---------- Length & readability ---------- */
  const allText = texts.map((x) => x.text).join(' ')
  const wordTotal = words(allText).length
  const readability = fleschReadingEase([...(summary ? [inlineToPlain(summary.content)] : []), ...bullets.map((x) => x.text)])
  const years = yearsOfExperience(data, opts.now)
  const pages = opts.pages ?? null
  let formatPenalty = 0
  if (pages !== null && pages > 2) {
    formatPenalty += 3
    add({ rule: 'pages', severity: 'warning', category: 'Format', message: `${pages} pages — most resumes should be 1–2 pages`, detail: 'Trim older roles and keep the strongest bullets.' })
  } else if (pages !== null && pages > 1 && years < 4) {
    formatPenalty += 1
    add({ rule: 'pages', severity: 'info', category: 'Format', message: `${pages} pages with ${years} years of experience — aim for one page` })
  }
  if (wordTotal > 0 && wordTotal < 150) add({ rule: 'too-short', severity: 'info', category: 'Content', message: `Only ~${wordTotal} words — add more detail about your impact` })
  if (readability.words > 40 && readability.score < 25) {
    formatPenalty += 2
    add({ rule: 'readability', severity: 'warning', category: 'Format', message: `Hard to read (Flesch ${readability.score}) — shorten sentences and use plainer words` })
  }

  /* ---------- Scores ---------- */
  const ratio = (a: number, b: number) => (b ? a / b : 0)
  const impactBullets = workBullets.length || bullets.length
  let impact = 0
  impact += Math.min(10, (ratio(actionCount, bullets.length) / 0.8) * 10)
  impact += Math.min(10, (ratio(workBullets.filter((x) => METRIC_RE.test(x.text)).length, impactBullets) / 0.5) * 10)
  const avg = ratio(experience.reduce((n, x) => n + x.e.bullets.filter((t) => t.trim()).length, 0), experience.length)
  impact += experience.length ? (avg >= 3 && avg <= 6 ? 5 : avg >= 2 ? 3 : 1) : 0
  if (!bullets.length) impact = 0

  const hasText = bullets.length > 0 || summaryWords > 0
  const language = !hasText ? 0 : Math.max(0, 25 - Math.min(8, weak * 2) - Math.min(5, passive * 1.5) - Math.min(6, buzz * 2) - Math.min(5, spelling) - Math.min(3, pronouns) - Math.min(4, tense) - placeholders * 3)
  const format = !hasText ? 0 : Math.max(0, 15 - Math.min(5, lengthIssues) - Math.min(5, dateIssues * 2) - Math.min(3, linkIssues) - formatPenalty)

  const categories: CategoryScore[] = [
    { name: 'Contact', score: contact, max: 15 },
    { name: 'Content', score: Math.max(0, content - placeholders * 2), max: 20 },
    { name: 'Impact', score: Math.round(impact), max: 25 },
    { name: 'Language', score: Math.round(language), max: 25 },
    { name: 'Format', score: Math.round(format), max: 15 },
  ]
  const score = Math.round(categories.reduce((n, c) => n + c.score, 0))
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b2) => order[a.severity] - order[b2.severity])
  return {
    score,
    grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs work',
    categories,
    issues,
    stats: { words: wordTotal, bullets: bullets.length, quantified, actionVerbs: actionCount, pages, years, readability },
  }
}
