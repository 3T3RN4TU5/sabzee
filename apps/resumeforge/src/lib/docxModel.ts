/**
 * Word (.docx) export — the pure half. Turns a resume or cover letter into a small, format-neutral
 * paragraph/run model (`DocxModel`) that `docxRender.ts` converts to a real Word document with the
 * `docx` package. Keeping the layout decisions here (no `docx` import, no DOM) makes them testable
 * in Node and keeps the heavy `docx` chunk lazy in the browser.
 *
 * Structure of a resume:
 *   name (Title style) · headline · contact line (hyperlinks)
 *   per section: heading (Heading 1, accent rule) → entries:
 *     head line   **title** ⇥ date            (right-aligned tab stop)
 *     sub line    *subtitle* · link ⇥ location
 *     meta line   authors / grade / contact / tech stack
 *     description paragraphs, real bullet list
 *   skills → "**Group:** a, b, c" lines · languages/interests → one "a · b · c" line
 */
import { formatLongDate } from './dates.ts'
import { PAPER } from './design.ts'
import { ensureContrast } from './color.ts'
import { letterParagraphs } from './coverLetter.ts'
import { contactItems } from './exportText.ts'
import { FONT_BY_ID } from './fonts.ts'
import { sanitizeUrl, toRuns } from './markdown.ts'
import { buildSectionViews, displayName, type EntryView, type SectionView } from './templateData.ts'
import type { CoverLetter, Design, FontId, ResumeData, TemplateId } from './types.ts'

/** One run of text. Colours are 'RRGGBB' (no '#'). */
export interface DocxRun {
  text: string
  bold?: boolean
  italic?: boolean
  /** Inline `code` → monospace. */
  code?: boolean
  color?: string
  /** Sanitised hyperlink target. */
  href?: string
  /** Start a new line (soft break) before this run. */
  breakBefore?: boolean
}

export type DocxParaKind =
  | 'name'
  | 'headline'
  | 'contact'
  | 'heading'
  | 'entry-head'
  | 'entry-sub'
  | 'entry-meta'
  | 'body'
  | 'bullet'
  | 'line'
  | 'letter-date'
  | 'letter-recipient'
  | 'letter-subject'
  | 'letter-greeting'
  | 'letter-body'
  | 'letter-closing'
  | 'letter-signature'

export interface DocxPara {
  kind: DocxParaKind
  runs: DocxRun[]
  /** Text after a right-aligned tab stop at the right margin (dates, locations). */
  right?: DocxRun[]
  /** Space before this paragraph: 'entry' between entries, 'section' before headings. */
  gapBefore?: 'none' | 'entry' | 'section'
  /** Keep on the same page as the next paragraph (headings and the lines of one entry). */
  keepNext?: boolean
  /** Thin accent rule under the paragraph (letterhead). */
  ruleBelow?: boolean
}

export interface DocxTheme {
  /** Word-safe font names. */
  font: string
  headingFont: string
  monoFont: string
  /** Body size in points (half-point precision). */
  sizePt: number
  /** Line spacing as a multiple of single (Word "multiple"). */
  lineMultiple: number
  /** Multiplier for paragraph gaps (design.spacing). */
  spacing: number
  /** Accent for text (≥ 4.5:1 on white) and for rules/borders. */
  accent: string
  rule: string
  text: string
  heading: string
  muted: string
  headingCase: 'upper' | 'normal'
  align: 'left' | 'center'
  /** Page geometry in twips (1/20 pt). */
  page: { width: number; height: number; margin: number }
}

export interface DocxMeta {
  title: string
  subject: string
  creator: string
  description: string
  keywords: string
}

export interface DocxModel {
  meta: DocxMeta
  theme: DocxTheme
  paragraphs: DocxPara[]
}

export interface DocxOptions {
  /** Font pairing to use (resolve design.font 'auto' with the template default first). Default inter. */
  fontId?: FontId
  /** Resolved heading case (design.headingCase 'auto' → template default). Default 'upper'. */
  headingCase?: 'upper' | 'normal'
}

const hex = (c: string) => c.replace('#', '').toUpperCase()
const TEXT = '1F2937'
const HEADING = '111827'
const MUTED = '6B7280'
/** Templates whose header is centred on the page. */
const CENTRED: TemplateId[] = ['classic', 'elegant', 'academic']

export const mmToTwip = (mm: number) => Math.round((mm / 25.4) * 1440)

export function docxTheme(design: Design, opts: DocxOptions = {}): DocxTheme {
  const fontId: FontId = opts.fontId ?? (design.font === 'auto' ? 'inter' : design.font)
  const pairing = FONT_BY_ID[fontId] ?? FONT_BY_ID.inter
  const paper = PAPER[design.paper] ?? PAPER.a4
  return {
    font: pairing.docx,
    headingFont: pairing.docx,
    monoFont: 'Consolas',
    // 13 px (the default) → 10 pt, the usual Word resume size; same density as the PDF
    sizePt: Math.round(design.fontSize * 0.77 * 2) / 2,
    lineMultiple: Math.round((design.lineHeight / 1.3) * 100) / 100,
    spacing: design.spacing,
    accent: hex(ensureContrast(design.accent)),
    rule: hex(design.accent),
    text: TEXT,
    heading: HEADING,
    muted: MUTED,
    headingCase: opts.headingCase ?? (design.headingCase === 'normal' ? 'normal' : 'upper'),
    align: CENTRED.includes(design.template) ? 'center' : 'left',
    page: { width: mmToTwip(paper.widthMm), height: mmToTwip(paper.heightMm), margin: mmToTwip(design.margin) },
  }
}

/** Inline markdown → runs (bold/italic/code/links), with `\n` as soft line breaks. */
export function inlineRuns(md: string, base: Omit<DocxRun, 'text'> = {}): DocxRun[] {
  const out: DocxRun[] = []
  md.split('\n').forEach((line, i) => {
    const runs: DocxRun[] = toRuns(line)
      .filter((r) => r.text)
      .map((r) => ({ ...base, text: r.text, ...(r.bold ? { bold: true } : {}), ...(r.italic ? { italic: true } : {}), ...(r.code ? { code: true } : {}), ...(r.href ? { href: r.href } : {}) }))
    if (i > 0) {
      if (runs.length) runs[0] = { ...runs[0], breakBefore: true }
      else runs.push({ ...base, text: '', breakBefore: true })
    }
    out.push(...runs)
  })
  return out
}

/** Join groups of runs with a muted separator. */
function joinRuns(groups: DocxRun[][], sep: string, color: string): DocxRun[] {
  const out: DocxRun[] = []
  groups.forEach((g, i) => {
    if (i > 0) out.push({ text: sep, color })
    out.push(...g)
  })
  return out
}

const plainText = (runs: DocxRun[]) => runs.map((r) => (r.breakBefore ? '\n' : '') + r.text).join('')

/** Linkify a reference contact / meta value when it is an email or URL. */
function maybeLink(text: string, base: Omit<DocxRun, 'text'> = {}): DocxRun[] {
  const t = text.trim()
  const href = /^\S+@\S+\.\S+$|^(https?:\/\/|www\.)\S+$|^[\w-]+(\.[\w-]+)+\/\S*$/i.test(t) ? sanitizeUrl(t) : null
  return [{ ...base, text: t, ...(href ? { href } : {}) }]
}

function headerParas(data: ResumeData, theme: DocxTheme): DocxPara[] {
  const b = data.basics
  const out: DocxPara[] = [{ kind: 'name', runs: [{ text: displayName(b) }] }]
  if (b.title.trim()) out.push({ kind: 'headline', runs: [{ text: b.title.trim(), color: theme.accent }] })
  const contact = contactItems(b).map((c) => [{ text: c.value, ...(c.href ? { href: c.href } : {}) }] as DocxRun[])
  if (contact.length) out.push({ kind: 'contact', runs: joinRuns(contact, '  |  ', theme.muted) })
  return out
}

function headingPara(title: string): DocxPara {
  return { kind: 'heading', runs: [{ text: title }], gapBefore: 'section', keepNext: true }
}

function entryParas(s: SectionView, e: EntryView, first: boolean, theme: DocxTheme): DocxPara[] {
  const paras: DocxPara[] = []
  const title = e.title || e.subtitle
  const subtitle = e.title ? e.subtitle : ''
  const link: DocxRun[] = e.url ? [{ text: e.url, ...(e.href ? { href: e.href } : {}) }] : []

  // a lone link (no subtitle/location) rides on the head line instead of taking its own
  const linkOnHead = link.length > 0 && !subtitle && !e.location

  // 1. head: bold title (· link) ⇥ date
  if (title || e.date) {
    const runs: DocxRun[] = title ? [{ text: title, bold: true, color: theme.heading }] : []
    if (linkOnHead) runs.push(...(runs.length ? [{ text: '  ·  ', color: theme.muted }] : []), ...link)
    paras.push({ kind: 'entry-head', runs, right: e.date ? [{ text: e.date, color: theme.muted }] : undefined, gapBefore: first ? 'none' : 'entry' })
  }
  // publications: authors directly under the title
  if (s.kind === 'publications' && e.meta) paras.push({ kind: 'entry-meta', runs: [{ text: e.meta }] })

  // 2. sub: italic subtitle (· link) ⇥ location
  const sub: DocxRun[] = []
  if (subtitle) sub.push({ text: subtitle, italic: true })
  if (link.length && !linkOnHead) {
    if (sub.length) sub.push({ text: '  ·  ', color: theme.muted })
    sub.push(...link)
  }
  if (sub.length || e.location) {
    paras.push({ kind: 'entry-sub', runs: sub, right: e.location ? [{ text: e.location, italic: true, color: theme.muted }] : undefined })
  }

  // 3. meta: grade / contact (publications handled above)
  if (e.meta && s.kind !== 'publications') {
    const label = s.kind === 'references' ? '' : e.metaLabel
    paras.push({ kind: 'entry-meta', runs: [...(label ? [{ text: `${label}: `, color: theme.muted }] : []), ...maybeLink(e.meta)] })
  }
  // keywords (tech stack …)
  if (e.keywords.length) {
    const label = s.spec.fields.find((f) => f.key === 'keywords')?.label ?? 'Keywords'
    paras.push({ kind: 'entry-meta', runs: [{ text: `${label}: `, color: theme.muted }, { text: e.keywords.join(', ') }] })
  }
  // 4. description + bullets
  for (const p of letterParagraphs(e.description)) paras.push({ kind: 'body', runs: inlineRuns(p) })
  for (const b of e.bullets) paras.push({ kind: 'bullet', runs: inlineRuns(b) })

  // keep each entry on one page where possible
  paras.forEach((p, i) => {
    if (i < paras.length - 1) p.keepNext = true
  })
  return paras
}

function sectionParas(s: SectionView, theme: DocxTheme): DocxPara[] {
  const out: DocxPara[] = [headingPara(s.title)]
  if (s.kind === 'summary') {
    for (const p of letterParagraphs(s.content)) out.push({ kind: 'body', runs: inlineRuns(p) })
    return out
  }
  if (s.kind === 'skills') {
    for (const e of s.entries) {
      const runs: DocxRun[] = []
      if (e.title) runs.push({ text: e.keywords.length ? `${e.title}: ` : e.title, bold: true, color: theme.heading })
      if (e.keywords.length) runs.push({ text: e.keywords.join(', ') })
      if (e.levelLabel) runs.push({ text: `${runs.length ? '  —  ' : ''}${e.levelLabel}`, italic: true, color: theme.muted })
      if (runs.length) out.push({ kind: 'line', runs })
    }
    return out
  }
  if (s.kind === 'languages' || s.kind === 'interests') {
    const groups = s.entries
      .filter((e) => e.title || e.keywords.length)
      .map((e) => {
        const tail = s.kind === 'languages' ? e.levelLabel : e.keywords.join(', ')
        return [...(e.title ? [{ text: e.title, bold: true, color: theme.heading }] : []), ...(tail ? [{ text: e.title ? ` (${tail})` : tail, color: theme.muted }] : [])] as DocxRun[]
      })
    if (groups.length) out.push({ kind: 'line', runs: joinRuns(groups, '   ·   ', theme.muted) })
    return out
  }
  s.entries.forEach((e, i) => out.push(...entryParas(s, e, i === 0, theme)))
  return out
}

function meta(data: ResumeData, kind: 'Resume' | 'Cover letter'): DocxMeta {
  const name = data.basics.name.trim()
  const skills = data.sections
    .filter((s) => s.kind === 'skills' && !s.hidden)
    .flatMap((s) => s.items.flatMap((e) => e.keywords))
    .slice(0, 20)
  return {
    title: name ? `${name} — ${kind}` : kind,
    subject: [data.basics.title.trim(), kind].filter(Boolean).join(' · '),
    creator: name || 'ResumeForge',
    description: `${kind} created with ResumeForge`,
    keywords: skills.join(', '),
  }
}

/** Resume → DOCX model. Hidden/empty sections and fields a kind doesn't use are left out (same as the PDF). */
export function resumeDocxModel(data: ResumeData, design: Design, opts: DocxOptions = {}): DocxModel {
  const theme = docxTheme(design, opts)
  const { all } = buildSectionViews(data, design, { columns: 1 })
  const paragraphs = [...headerParas(data, theme), ...all.flatMap((s) => sectionParas(s, theme))]
  return { meta: meta(data, 'Resume'), theme, paragraphs }
}

/** True when the cover letter has anything worth exporting. */
export function hasLetterContent(letter: CoverLetter): boolean {
  return !!letter.body.trim()
}

/** Cover letter → DOCX model (same header as the resume, then date, recipient, subject, body, sign-off). */
export function letterDocxModel(letter: CoverLetter, data: ResumeData, design: Design, opts: DocxOptions = {}): DocxModel {
  const theme = docxTheme(design, opts)
  const paragraphs: DocxPara[] = headerParas(data, theme)
  paragraphs[paragraphs.length - 1].ruleBelow = true
  const gap = { gapBefore: 'section' as const }
  if (letter.date.trim()) paragraphs.push({ kind: 'letter-date', runs: [{ text: formatLongDate(letter.date.trim()) }], ...gap })
  const recipient = [letter.recipient, letter.recipientTitle, letter.company, letter.address]
    .flatMap((s) => s.split('\n'))
    .map((s) => s.trim())
    .filter(Boolean)
  if (recipient.length) paragraphs.push({ kind: 'letter-recipient', runs: recipient.map((text, i) => ({ text, ...(i > 0 ? { breakBefore: true } : {}) })), ...gap })
  if (letter.role.trim()) paragraphs.push({ kind: 'letter-subject', runs: [{ text: `Re: ${letter.role.trim()}`, bold: true, color: theme.heading }], ...gap })
  paragraphs.push({ kind: 'letter-greeting', runs: [{ text: letter.greeting.trim() || 'Dear Hiring Manager,' }], ...gap })
  for (const p of letterParagraphs(letter.body)) paragraphs.push({ kind: 'letter-body', runs: inlineRuns(p) })
  paragraphs.push({ kind: 'letter-closing', runs: [{ text: letter.closing.trim() || 'Sincerely,' }], keepNext: true })
  paragraphs.push({ kind: 'letter-signature', runs: [{ text: letter.signature.trim() || data.basics.name.trim() || ' ', bold: true, color: theme.heading }] })
  return { meta: meta(data, 'Cover letter'), theme, paragraphs }
}

/** Plain text of a model (tests, previews, search). */
export function docxModelText(model: DocxModel): string {
  return model.paragraphs.map((p) => plainText(p.runs) + (p.right?.length ? `\t${plainText(p.right)}` : '')).join('\n')
}
