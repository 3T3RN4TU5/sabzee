/**
 * Cover-letter helpers: visual layouts, a quality report (length, placeholders, personalisation),
 * token replacement ([Company] → Acme) and small date/greeting utilities.
 */
import { inlineToPlain } from './markdown.ts'
import { letterParagraphs } from './coverLetter.ts'
import { words } from './readability.ts'
import type { CoverLetter, LetterLayoutId } from './types.ts'

export type { LetterLayoutId }

export const LETTER_LAYOUTS: { id: LetterLayoutId; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic block', description: 'Traditional business letter: date, address block, subject line.' },
  { id: 'accent', name: 'Modern accent', description: 'Accent-coloured subject heading and recipient card.' },
  { id: 'minimal', name: 'Minimal', description: 'Quiet, airy typography with a signature flourish.' },
]

export const DEFAULT_LETTER_LAYOUT: LetterLayoutId = 'classic'

export function isLetterLayout(v: unknown): v is LetterLayoutId {
  return v === 'classic' || v === 'accent' || v === 'minimal'
}

/** Square-bracket placeholders left in the text ("[Company]"), excluding markdown links. */
export function letterPlaceholders(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/\[[^\]\n]{1,60}\](?!\()/g)) if (!out.includes(m[0])) out.push(m[0])
  return out
}

const TOKENS: { re: RegExp; key: 'company' | 'role' | 'recipient' }[] = [
  { re: /\[(?:company|company name|organi[sz]ation|employer)\]/gi, key: 'company' },
  { re: /\[(?:role|position|job title|job|title)\]/gi, key: 'role' },
  { re: /\[(?:hiring manager|recipient|name)\]/gi, key: 'recipient' },
]

/** Fill [Company] / [Role] / [Hiring Manager] style tokens with the letter's own values. */
export function replaceLetterTokens(text: string, values: Partial<Record<'company' | 'role' | 'recipient', string>>): string {
  let out = text
  for (const t of TOKENS) {
    const v = values[t.key]?.trim()
    if (v) out = out.replace(t.re, v)
  }
  return out
}

/** True when replaceLetterTokens would change something. */
export function hasFillableTokens(text: string, values: Partial<Record<'company' | 'role' | 'recipient', string>>): boolean {
  return replaceLetterTokens(text, values) !== text
}

export interface LetterCheck {
  id: string
  label: string
  ok: boolean
  detail?: string
}

export interface LetterReport {
  words: number
  paragraphs: number
  placeholders: string[]
  /** Reading time in minutes (≈ 200 wpm), at least 1 when there is text. */
  minutes: number
  checks: LetterCheck[]
}

const GENERIC_GREETING = /^(to whom it may concern|dear sir(?: or madam|\/madam)?|dear madam|hello|hi)\b/i

/** Quality checks shown under the letter editor. */
export function letterReport(letter: CoverLetter): LetterReport {
  const paras = letterParagraphs(letter.body)
  const plain = paras.map((p) => inlineToPlain(p)).join(' ')
  const n = words(plain).length
  const placeholders = letterPlaceholders([letter.greeting, letter.body, letter.closing].join('\n'))
  const lower = plain.toLowerCase()
  const checks: LetterCheck[] = [
    {
      id: 'length',
      label: 'Length of 200–450 words',
      ok: n >= 200 && n <= 450,
      detail: n < 200 ? `${n} words — add a concrete achievement or two` : n > 450 ? `${n} words — recruiters skim; trim to one page` : `${n} words`,
    },
    { id: 'paragraphs', label: '3–5 paragraphs', ok: paras.length >= 3 && paras.length <= 5, detail: `${paras.length} paragraph${paras.length === 1 ? '' : 's'}` },
    { id: 'placeholders', label: 'No [placeholders] left', ok: placeholders.length === 0, detail: placeholders.length ? placeholders.slice(0, 4).join(', ') + (placeholders.length > 4 ? '…' : '') : undefined },
    {
      id: 'company',
      label: 'Mentions the company by name',
      ok: !!letter.company.trim() && lower.includes(letter.company.trim().toLowerCase()),
      detail: letter.company.trim() ? undefined : 'Fill in the company field',
    },
    {
      id: 'role',
      label: 'Names the role you are applying for',
      ok: !!letter.role.trim() && lower.includes(letter.role.trim().toLowerCase()),
      detail: letter.role.trim() ? undefined : 'Fill in the role field',
    },
    { id: 'metric', label: 'Includes a measurable result', ok: /\d/.test(plain.replace(/\b(19|20)\d{2}\b/g, '')) },
    {
      id: 'greeting',
      label: 'Personal greeting',
      ok: !!letter.greeting.trim() && !GENERIC_GREETING.test(letter.greeting.trim()),
      detail: GENERIC_GREETING.test(letter.greeting.trim()) ? 'Address a person or “Dear <Company> team”' : undefined,
    },
  ]
  return { words: n, paragraphs: paras.length, placeholders, minutes: n ? Math.max(1, Math.round(n / 200)) : 0, checks }
}

/** Local date as 'YYYY-MM-DD' (the format of CoverLetter.date and <input type=date>). */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Greeting suggestions personalised with the recipient / company. */
export function greetingOptions(letter: Pick<CoverLetter, 'recipient' | 'company'>): string[] {
  const out: string[] = []
  const r = letter.recipient.trim()
  if (r) out.push(`Dear ${r},`)
  if (letter.company.trim()) out.push(`Dear ${letter.company.trim()} team,`)
  out.push('Dear Hiring Manager,')
  return out
}

export const CLOSINGS = ['Sincerely,', 'Best regards,', 'Kind regards,', 'With gratitude,', 'Respectfully,']

/**
 * Fold the legacy per-resume layout map (localStorage['resumeforge-letter'] → { layouts: { [docId]: id } },
 * used before CoverLetter had a `layout` field) into the documents. Returns the same array when nothing changes.
 */
export function applyLegacyLetterLayouts<T extends { id: string; coverLetter: CoverLetter }>(docs: T[], legacy: unknown): T[] {
  const raw = legacy && typeof legacy === 'object' ? (legacy as { state?: { layouts?: unknown }; layouts?: unknown }) : null
  const layouts = raw?.state?.layouts ?? raw?.layouts
  if (!layouts || typeof layouts !== 'object') return docs
  let changed = false
  const out = docs.map((d) => {
    const v = (layouts as Record<string, unknown>)[d.id]
    if (!isLetterLayout(v) || d.coverLetter.layout === v) return d
    changed = true
    return { ...d, coverLetter: { ...d.coverLetter, layout: v } }
  })
  return changed ? out : docs
}
