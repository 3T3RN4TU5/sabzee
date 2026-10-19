/**
 * Template view-models: everything a template needs to render any of the 13 section kinds,
 * already filtered (hidden/empty removed), formatted (dates per design.dateFormat, pretty links,
 * level labels) and assigned to a column. Pure — templates stay presentational.
 */
import { formatDate, formatRange } from './dates.ts'
import { MM_TO_PX, PAPER } from './design.ts'
import { sanitizeUrl } from './markdown.ts'
import { ENTRY_KINDS, KIND_SPECS, LANGUAGE_LEVELS, SKILL_LEVELS, cleanBullets, sectionHasContent, type KindSpec } from './sections.ts'
import type { Basics, Design, Entry, FontId, Paper, ResumeData, Section, SectionKind } from './types.ts'
import { prettyUrl } from './validate.ts'

export interface EntryView {
  id: string
  kind: SectionKind
  /** Role / degree / project / certificate / language / skill group / reference name … */
  title: string
  /** Employer / school / issuer / venue / position … */
  subtitle: string
  location: string
  /** Formatted date (range for ranged kinds, single date for singleDate kinds). '' when none. */
  date: string
  /** Formatted start / end ('' when missing); `endText` is 'Present' for current roles. */
  startText: string
  endText: string
  current: boolean
  /** Display form of the link (no scheme), '' when none. */
  url: string
  /** Sanitised href for the link, or null. */
  href: string | null
  /** Inline-markdown paragraph text ('' when none). */
  description: string
  /** Non-empty bullets (inline markdown). */
  bullets: string[]
  /** Skills in a group, tech stack, interest details. */
  keywords: string[]
  /** 0 = unset, 1–5. Only meaningful for skills & languages. */
  level: number
  /** 'Expert', 'Native / bilingual' … ('' when level is 0 or the kind has no levels). */
  levelLabel: string
  /** Grade/GPA (education), authors (publications), contact (references) … */
  meta: string
  /** Label of the meta field from KIND_SPECS ('Grade / GPA', 'Authors', 'Contact') or ''. */
  metaLabel: string
}

export interface SectionView {
  id: string
  kind: SectionKind
  /** User title, falling back to the kind label. */
  title: string
  /** Resolved column for this template ('main' for single-column templates). */
  column: 'main' | 'side'
  /** Summary text (inline markdown, paragraphs separated by blank lines). */
  content: string
  entries: EntryView[]
  spec: KindSpec
  /** True for dated "entry" kinds (experience, education, projects, certifications, awards, publications, volunteering, custom). */
  isEntryKind: boolean
}

export interface ViewOptions {
  columns: 1 | 2
  /** Kinds that go to the side column when section.column === 'auto' (two-column templates). */
  sideKinds?: readonly SectionKind[]
  presentLabel?: string
}

const entryHasContent = (e: Entry) =>
  !!(e.title.trim() || e.subtitle.trim() || e.description.trim() || e.meta.trim() || e.bullets.some((b) => b.trim()) || e.keywords.length > 0)

export function buildEntryView(kind: SectionKind, e: Entry, design: Pick<Design, 'dateFormat'>, presentLabel = 'Present'): EntryView {
  const spec = KIND_SPECS[kind]
  const fmt = design.dateFormat
  // Only fields the kind actually edits are shown (matches the editor form; imported extras stay hidden).
  const has = (key: keyof Entry) => key === 'title' || spec.fields.some((f) => f.key === key)
  const hasEnd = spec.fields.some((f) => f.type === 'end')
  const startText = has('start') ? formatDate(e.start, fmt) : ''
  const endText = hasEnd ? (e.current ? presentLabel : formatDate(e.end, fmt)) : ''
  const date = hasEnd ? formatRange(e.start, e.end, e.current, fmt, presentLabel) : startText
  const levels = kind === 'languages' ? LANGUAGE_LEVELS : kind === 'skills' ? SKILL_LEVELS : null
  const level = levels && has('level') ? Math.max(0, Math.min(5, Math.round(e.level))) : 0
  const metaField = spec.fields.find((f) => f.key === 'meta')
  const url = has('url') ? e.url.trim() : ''
  return {
    id: e.id,
    kind,
    title: e.title.trim(),
    subtitle: has('subtitle') ? e.subtitle.trim() : '',
    location: has('location') ? e.location.trim() : '',
    date,
    startText,
    endText,
    current: hasEnd && e.current,
    url: url ? prettyUrl(url) : '',
    href: url ? sanitizeUrl(url) : null,
    description: has('description') ? e.description.trim() : '',
    bullets: has('bullets') ? cleanBullets(e) : [],
    keywords: has('keywords') ? e.keywords.map((k) => k.trim()).filter(Boolean) : [],
    level,
    levelLabel: levels && level ? (levels[level] ?? '') : '',
    meta: metaField ? e.meta.trim() : '',
    metaLabel: metaField?.label ?? '',
  }
}

export function resolveColumn(section: Pick<Section, 'kind' | 'column'>, opts: ViewOptions): 'main' | 'side' {
  if (opts.columns === 1) return 'main'
  if (section.column === 'main' || section.column === 'side') return section.column
  return opts.sideKinds?.includes(section.kind) ? 'side' : 'main'
}

export function sectionTitle(section: Pick<Section, 'kind' | 'title'>): string {
  return section.title.trim() || KIND_SPECS[section.kind].label
}

export function buildSectionView(section: Section, design: Pick<Design, 'dateFormat'>, opts: ViewOptions): SectionView {
  return {
    id: section.id,
    kind: section.kind,
    title: sectionTitle(section),
    column: resolveColumn(section, opts),
    content: section.content.trim(),
    entries: section.items.filter(entryHasContent).map((e) => buildEntryView(section.kind, e, design, opts.presentLabel)),
    spec: KIND_SPECS[section.kind],
    isEntryKind: ENTRY_KINDS.includes(section.kind),
  }
}

export interface SectionViews {
  /** Visible, non-empty sections in document order. */
  all: SectionView[]
  main: SectionView[]
  side: SectionView[]
}

export function buildSectionViews(data: ResumeData, design: Pick<Design, 'dateFormat'>, opts: ViewOptions): SectionViews {
  const all = data.sections
    .filter((s) => !s.hidden && sectionHasContent(s))
    .map((s) => buildSectionView(s, design, opts))
    .filter((s) => (s.kind === 'summary' ? !!s.content : s.entries.length > 0))
  return { all, main: all.filter((s) => s.column === 'main'), side: all.filter((s) => s.column === 'side') }
}

/* ---------------- basics & design helpers ---------------- */

export function displayName(b: Pick<Basics, 'name'>, placeholder = 'Your Name'): string {
  return b.name.trim() || placeholder
}

/** Initials for photo placeholders: "Dr. Meera Iyer" → "MI". */
export function initials(name: string): string {
  const parts = name
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
  if (!parts.length) return ''
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function resolveFont(design: Pick<Design, 'font'>, templateDefault: FontId): FontId {
  return design.font === 'auto' ? templateDefault : design.font
}

export function resolveHeadingCase(design: Pick<Design, 'headingCase'>, templateDefault: 'upper' | 'normal' = 'upper'): 'upper' | 'normal' {
  return design.headingCase === 'auto' ? templateDefault : design.headingCase
}

export interface PaperSize {
  id: Paper
  label: string
  widthMm: number
  heightMm: number
  widthPx: number
  heightPx: number
  /** CSS @page size keyword ('A4' / 'letter'). */
  css: string
}

export function paperSize(paper: Paper): PaperSize {
  const p = PAPER[paper] ?? PAPER.a4
  return { id: paper, label: p.label, widthMm: p.widthMm, heightMm: p.heightMm, widthPx: p.widthMm * MM_TO_PX, heightPx: p.heightMm * MM_TO_PX, css: p.css }
}

export const mmToPx = (mm: number) => mm * MM_TO_PX
