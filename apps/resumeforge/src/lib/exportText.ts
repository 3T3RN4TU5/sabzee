/** Markdown and ATS plain-text exports. */
import { formatDate, formatRange } from './dates.ts'
import { inlineToPlain, sanitizeUrl } from './markdown.ts'
import { KIND_SPECS, LANGUAGE_LEVELS, SKILL_LEVELS, cleanBullets, sectionHasContent } from './sections.ts'
import type { Basics, DateFormat, Entry, ResumeData, Section } from './types.ts'
import { prettyUrl } from './validate.ts'

export interface TextOptions {
  dateFormat: DateFormat
}

export interface EntryParts {
  heading: string
  sub: string
  when: string
  where: string
  link: string
  extra: string
  description: string
  bullets: string[]
  tags: string[]
}

/** Normalised view of an entry used by text exports (and DOCX). Strings keep inline markdown. */
export function entryParts(section: Section, e: Entry, fmt: DateFormat): EntryParts {
  const spec = KIND_SPECS[section.kind]
  const when = spec.singleDate ? formatDate(e.start, fmt) : formatRange(e.start, e.end, e.current, fmt)
  let extra = e.meta.trim()
  if (section.kind === 'skills' && e.level) extra = SKILL_LEVELS[e.level]
  if (section.kind === 'languages' && e.level) extra = LANGUAGE_LEVELS[e.level]
  return {
    heading: e.title.trim(),
    sub: e.subtitle.trim(),
    when,
    where: e.location.trim(),
    link: e.url.trim() ? prettyUrl(e.url) : '',
    extra,
    description: e.description.trim(),
    bullets: cleanBullets(e),
    tags: e.keywords,
  }
}

export function contactItems(b: Basics): { label: string; value: string; href: string | null }[] {
  const items: { label: string; value: string; href: string | null }[] = []
  if (b.email.trim()) items.push({ label: 'Email', value: b.email.trim(), href: `mailto:${b.email.trim()}` })
  if (b.phone.trim()) items.push({ label: 'Phone', value: b.phone.trim(), href: `tel:${b.phone.replace(/[^\d+]/g, '')}` })
  if (b.location.trim()) items.push({ label: 'Location', value: b.location.trim(), href: null })
  if (b.website.trim()) items.push({ label: 'Website', value: prettyUrl(b.website), href: sanitizeUrl(b.website) })
  if (b.linkedin.trim()) items.push({ label: 'LinkedIn', value: prettyUrl(b.linkedin), href: sanitizeUrl(b.linkedin) })
  if (b.github.trim()) items.push({ label: 'GitHub', value: prettyUrl(b.github), href: sanitizeUrl(b.github) })
  return items
}

const visibleSections = (data: ResumeData) => data.sections.filter((s) => !s.hidden && sectionHasContent(s))

export function toMarkdown(data: ResumeData, opts: TextOptions): string {
  const b = data.basics
  const out: string[] = []
  out.push(`# ${b.name || 'Your Name'}`)
  if (b.title) out.push(`**${b.title}**`)
  const contact = contactItems(b).map((c) => (c.href && c.label !== 'Email' && c.label !== 'Phone' ? `[${c.value}](${c.href})` : c.value))
  if (contact.length) out.push('', contact.join(' · '))

  for (const s of visibleSections(data)) {
    out.push('', `## ${s.title || KIND_SPECS[s.kind].label}`, '')
    if (s.kind === 'summary') {
      out.push(s.content.trim())
      continue
    }
    if (s.kind === 'skills') {
      for (const e of s.items) {
        const p = entryParts(s, e, opts.dateFormat)
        if (!p.heading && !p.tags.length) continue
        out.push(`- ${p.heading ? `**${p.heading}${p.tags.length ? ':' : ''}**` : ''}${p.heading && p.tags.length ? ' ' : ''}${p.tags.join(', ')}${p.extra && !p.tags.length ? ` — ${p.extra}` : ''}`)
      }
      continue
    }
    if (s.kind === 'languages' || s.kind === 'interests') {
      for (const e of s.items) {
        const p = entryParts(s, e, opts.dateFormat)
        if (!p.heading) continue
        const tail = p.extra || p.tags.join(', ')
        out.push(`- ${p.heading}${tail ? ` — ${tail}` : ''}`)
      }
      continue
    }
    s.items.forEach((e, i) => {
      const p = entryParts(s, e, opts.dateFormat)
      if (!p.heading && !p.sub) return
      if (i > 0) out.push('')
      out.push(`### ${[p.heading, p.sub].filter(Boolean).join(' — ')}`)
      const meta = [p.when, p.where, p.extra, p.link ? `[${p.link}](${sanitizeUrl(e.url) ?? ''})` : ''].filter(Boolean)
      if (meta.length) out.push(`*${meta.join(' · ')}*`)
      if (p.tags.length) out.push(`\`${p.tags.join(' · ')}\``)
      if (p.description) out.push('', p.description)
      if (p.bullets.length) out.push('', ...p.bullets.map((x) => `- ${x}`))
    })
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

const ascii = (s: string) => s.replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/·/g, '|')

/** ATS plain text: no markdown, uppercase headings, simple hyphen bullets. */
export function toPlainText(data: ResumeData, opts: TextOptions): string {
  const b = data.basics
  const out: string[] = []
  out.push((b.name || 'Your Name').toUpperCase())
  if (b.title) out.push(b.title)
  const contact = contactItems(b).map((c) => c.value)
  if (contact.length) out.push(contact.join(' | '))

  for (const s of visibleSections(data)) {
    out.push('', (s.title || KIND_SPECS[s.kind].label).toUpperCase())
    if (s.kind === 'summary') {
      out.push(inlineToPlain(s.content.trim(), true))
      continue
    }
    if (s.kind === 'skills' || s.kind === 'languages' || s.kind === 'interests') {
      for (const e of s.items) {
        const p = entryParts(s, e, opts.dateFormat)
        if (!p.heading && !p.tags.length) continue
        const tail = s.kind === 'skills' ? p.tags.join(', ') || p.extra : p.extra || p.tags.join(', ')
        out.push(`${p.heading}${p.heading && tail ? ': ' : ''}${tail}`)
      }
      continue
    }
    s.items.forEach((e, i) => {
      const p = entryParts(s, e, opts.dateFormat)
      if (!p.heading && !p.sub) return
      if (i > 0) out.push('')
      out.push([p.heading, p.sub].filter(Boolean).join(', '))
      const meta = [p.when, p.where, p.extra, p.link].filter(Boolean)
      if (meta.length) out.push(meta.join(' | '))
      if (p.tags.length) out.push(`Technologies: ${p.tags.join(', ')}`)
      if (p.description) out.push(inlineToPlain(p.description, true))
      for (const x of p.bullets) out.push(`- ${inlineToPlain(x, true)}`)
    })
  }
  return `${ascii(out.join('\n'))
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}
