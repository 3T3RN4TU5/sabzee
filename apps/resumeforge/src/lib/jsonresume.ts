/**
 * Import/export for the open JSON Resume schema (https://jsonresume.org/schema).
 * Things JSON Resume cannot express (custom sections, section titles/order/visibility) are kept
 * under `meta.resumeforge` so a ResumeForge → JSON Resume → ResumeForge round trip is lossless.
 */
import { parseLooseDate, parseStored, toStored } from './dates.ts'
import { uid } from './ids.ts'
import { emptyBasics, normalizeEntry } from './normalize.ts'
import { createEntry, createSection, KIND_SPECS, LANGUAGE_LEVELS, SKILL_LEVELS } from './sections.ts'
import type { ColumnPlacement, Entry, ResumeData, Section, SectionKind } from './types.ts'
import { prettyUrl } from './validate.ts'

type Json = Record<string, unknown>

export interface JsonResume {
  $schema?: string
  basics?: Json
  work?: Json[]
  volunteer?: Json[]
  education?: Json[]
  awards?: Json[]
  certificates?: Json[]
  publications?: Json[]
  skills?: Json[]
  languages?: Json[]
  interests?: Json[]
  references?: Json[]
  projects?: Json[]
  meta?: Json
}

const SCHEMA = 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json'

const KIND_TO_KEY: Partial<Record<SectionKind, keyof JsonResume>> = {
  experience: 'work',
  volunteering: 'volunteer',
  education: 'education',
  awards: 'awards',
  certifications: 'certificates',
  publications: 'publications',
  skills: 'skills',
  languages: 'languages',
  interests: 'interests',
  references: 'references',
  projects: 'projects',
}

const KEY_TO_KIND = Object.fromEntries(Object.entries(KIND_TO_KEY).map(([k, v]) => [v, k])) as Record<string, SectionKind>

const DEFAULT_ORDER: SectionKind[] = ['summary', 'experience', 'projects', 'skills', 'education', 'volunteering', 'awards', 'certifications', 'publications', 'languages', 'interests', 'references']

const href = (s: string) => {
  const v = s.trim()
  if (!v) return undefined
  return /^(https?:|mailto:)/i.test(v) ? v : `https://${v}`
}
const date = (s: string) => {
  const ym = parseStored(s)
  return ym ? toStored(ym) : undefined
}
const nonEmpty = (xs: string[]) => {
  const out = xs.map((x) => x.trim()).filter(Boolean)
  return out.length ? out : undefined
}
/** Drop undefined/empty-string keys for tidy output. */
const clean = <T extends Json>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T

function splitDegree(title: string): { studyType?: string; area?: string } {
  const i = title.indexOf(', ')
  if (i < 0) return { area: title || undefined }
  return { studyType: title.slice(0, i), area: title.slice(i + 2) }
}

/** JSON Resume dates must be ISO; free-text dates ("Summer 2016") ride along in a custom field. */
const X_KEY = 'x-resumeforge'

function freeTextDates(e: Entry): Json | undefined {
  const start = e.start.trim() && !date(e.start) ? e.start.trim() : undefined
  const end = !e.current && e.end.trim() && !date(e.end) ? e.end.trim() : undefined
  return start || end ? clean({ start, end, current: start && e.current ? true : undefined }) : undefined
}

function entryToJson(kind: SectionKind, e: Entry): Json {
  const out = entryToJsonBase(kind, e)
  const x = kind === 'custom' ? undefined : freeTextDates(e)
  return x ? { ...out, [X_KEY]: x } : out
}

function entryToJsonBase(kind: SectionKind, e: Entry): Json {
  const range = { startDate: date(e.start), endDate: e.current ? undefined : date(e.end) }
  switch (kind) {
    case 'experience':
      return clean({ name: e.subtitle, position: e.title, location: e.location, url: href(e.url), ...range, summary: e.description, highlights: nonEmpty(e.bullets) })
    case 'volunteering':
      return clean({ organization: e.subtitle, position: e.title, location: e.location, url: href(e.url), ...range, summary: e.description, highlights: nonEmpty(e.bullets) })
    case 'education':
      return clean({ institution: e.subtitle, ...splitDegree(e.title), location: e.location, url: href(e.url), ...range, score: e.meta, courses: nonEmpty(e.bullets) })
    case 'awards':
      return clean({ title: e.title, date: date(e.start), awarder: e.subtitle, summary: e.description })
    case 'certifications':
      return clean({ name: e.title, date: date(e.start), issuer: e.subtitle, url: href(e.url) })
    case 'publications':
      return clean({ name: e.title, publisher: e.subtitle, releaseDate: date(e.start), url: href(e.url), summary: e.description, authors: e.meta })
    case 'skills':
      return clean({ name: e.title, level: SKILL_LEVELS[e.level] || undefined, keywords: nonEmpty(e.keywords) })
    case 'languages':
      return clean({ language: e.title, fluency: LANGUAGE_LEVELS[e.level] || undefined })
    case 'interests':
      return clean({ name: e.title, keywords: nonEmpty(e.keywords) })
    case 'references':
      return clean({ name: e.title, reference: e.description, position: e.subtitle, contact: e.meta })
    case 'projects':
      return clean({ name: e.title, description: e.description, highlights: nonEmpty(e.bullets), keywords: nonEmpty(e.keywords), url: href(e.url), startDate: date(e.start), roles: e.subtitle ? [e.subtitle] : undefined })
    default:
      return clean({ ...e, id: undefined } as unknown as Json)
  }
}

export function toJsonResume(data: ResumeData): JsonResume {
  const b = data.basics
  const loc = b.location.trim()
  const comma = loc.indexOf(', ')
  const profiles: Json[] = []
  if (b.linkedin.trim()) profiles.push(clean({ network: 'LinkedIn', username: prettyUrl(b.linkedin).split('/').filter(Boolean).pop(), url: href(b.linkedin) }))
  if (b.github.trim()) profiles.push(clean({ network: 'GitHub', username: prettyUrl(b.github).split('/').filter(Boolean).pop(), url: href(b.github) }))
  const summary = data.sections.find((s) => s.kind === 'summary')

  const out: JsonResume = {
    $schema: SCHEMA,
    basics: clean({
      name: b.name,
      label: b.title,
      image: b.photo || undefined,
      email: b.email,
      phone: b.phone,
      url: href(b.website),
      summary: summary?.content,
      location: loc ? clean(comma >= 0 ? { city: loc.slice(0, comma), region: loc.slice(comma + 2) } : { city: loc }) : undefined,
      profiles: profiles.length ? profiles : undefined,
    }),
  }
  const custom: Json[] = []
  for (const s of data.sections) {
    const key = KIND_TO_KEY[s.kind]
    if (key) {
      const list = ((out[key] as Json[] | undefined) ?? []).concat(s.items.map((e) => entryToJson(s.kind, e)))
      ;(out as Record<string, unknown>)[key] = list
    } else if (s.kind === 'custom') {
      custom.push({ id: s.id, title: s.title, items: s.items.map((e) => clean({ ...e } as unknown as Json)) })
    }
  }
  out.meta = {
    version: 'v1.0.0',
    lastModified: new Date().toISOString(),
    resumeforge: {
      sections: data.sections.map((s) => clean({ kind: s.kind, title: s.title, hidden: s.hidden || undefined, column: s.column === 'auto' ? undefined : s.column, id: s.kind === 'custom' ? s.id : undefined })),
      custom: custom.length ? custom : undefined,
    },
  }
  return out
}

/* ------------------------------ import ------------------------------ */

const s = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
const list = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : [])
const objs = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === 'object') : [])
/**
 * JSON Resume date → stored date. Accepts ISO dates and datetimes ("2018-05-01T00:00:00Z"), keeps
 * just the year when the month is invalid ("2020-13-01" → "2020"), maps "Present" to `present`
 * and passes other free text through.
 */
export function importDateValue(v: unknown): { value: string; present: boolean } {
  const raw = s(v).trim()
  const iso = /^(\d{4})(?:-(\d{1,2})(?:-\d{1,2})?)?(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(raw)
  if (iso) {
    const month = iso[2] ? Number(iso[2]) : 0
    return { value: month >= 1 && month <= 12 ? toStored({ year: Number(iso[1]), month }) : iso[1], present: false }
  }
  const ym = parseStored(raw)
  if (ym) return { value: toStored(ym), present: false }
  return parseLooseDate(raw)
}
const importDate = (v: unknown) => importDateValue(v).value
const importUrl = (v: unknown) => prettyUrl(s(v))

export function levelFromText(text: string, kind: 'skills' | 'languages'): number {
  const t = text.trim().toLowerCase()
  if (!t) return 0
  const labels = kind === 'skills' ? SKILL_LEVELS : LANGUAGE_LEVELS
  const exact = labels.findIndex((l) => l && l.toLowerCase() === t)
  if (exact > 0) return exact
  const n = Number(t)
  if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.round(n)
  if (kind === 'languages') {
    if (/native|bilingual|mother/.test(t)) return 5
    if (/fluent|full/.test(t)) return 4
    if (/professional|advanced|proficient/.test(t)) return 3
    if (/limited|conversational|intermediate/.test(t)) return 2
    return /basic|elementary|beginner/.test(t) ? 1 : 0
  }
  if (/master|expert/.test(t)) return 5
  if (/advanced|senior/.test(t)) return 4
  if (/proficient|competent/.test(t)) return 3
  if (/intermediate/.test(t)) return 2
  return /beginner|novice|basic/.test(t) ? 1 : 0
}

function entryFromJson(kind: SectionKind, j: Json): Entry {
  const e = entryFromJsonBase(kind, j)
  const x = j[X_KEY]
  if (kind === 'custom' || !x || typeof x !== 'object' || Array.isArray(x)) return e
  const xs = x as Json
  if (!e.start && s(xs.start)) {
    e.start = s(xs.start)
    if (xs.current === true && !e.end) e.current = true
  }
  if (!e.end && s(xs.end)) {
    e.end = s(xs.end)
    e.current = false
  }
  return e
}

function entryFromJsonBase(kind: SectionKind, j: Json): Entry {
  const range = () => {
    const start = importDate(j.startDate)
    const end = importDateValue(j.endDate)
    return { start, end: end.value, current: end.present || (!!start && !end.value) }
  }
  switch (kind) {
    case 'experience':
      return createEntry(kind, { title: s(j.position), subtitle: s(j.name ?? j.company), location: s(j.location), url: importUrl(j.url), ...range(), description: s(j.summary), bullets: list(j.highlights) })
    case 'volunteering':
      return createEntry(kind, { title: s(j.position), subtitle: s(j.organization), location: s(j.location), url: importUrl(j.url), ...range(), description: s(j.summary), bullets: list(j.highlights) })
    case 'education': {
      const { start, end } = range()
      return createEntry(kind, { title: [s(j.studyType), s(j.area)].filter(Boolean).join(', '), subtitle: s(j.institution), location: s(j.location), url: importUrl(j.url), start, end, meta: s(j.score), bullets: list(j.courses) })
    }
    case 'awards':
      return createEntry(kind, { title: s(j.title), subtitle: s(j.awarder), start: importDate(j.date), description: s(j.summary) })
    case 'certifications':
      return createEntry(kind, { title: s(j.name), subtitle: s(j.issuer), start: importDate(j.date), url: importUrl(j.url) })
    case 'publications':
      return createEntry(kind, { title: s(j.name), subtitle: s(j.publisher), start: importDate(j.releaseDate), url: importUrl(j.url), description: s(j.summary), meta: s(j.authors) })
    case 'skills':
      return createEntry(kind, { title: s(j.name), level: levelFromText(s(j.level), 'skills'), keywords: list(j.keywords) })
    case 'languages':
      return createEntry(kind, { title: s(j.language), level: levelFromText(s(j.fluency), 'languages') })
    case 'interests':
      return createEntry(kind, { title: s(j.name), keywords: list(j.keywords) })
    case 'references':
      return createEntry(kind, { title: s(j.name), description: s(j.reference), subtitle: s(j.position), meta: s(j.contact) })
    case 'projects':
      return createEntry(kind, { title: s(j.name), description: s(j.description), bullets: list(j.highlights), keywords: list(j.keywords), url: importUrl(j.url), start: importDate(j.startDate), subtitle: list(j.roles)[0] ?? s(j.entity) })
    default:
      return normalizeEntry(j)
  }
}

export function isJsonResume(v: unknown): v is JsonResume {
  if (!v || typeof v !== 'object') return false
  const o = v as Json
  if ('sections' in o) return false
  return ['work', 'education', 'skills', 'projects', 'volunteer'].some((k) => Array.isArray(o[k])) || (!!o.basics && typeof o.basics === 'object' && ('label' in (o.basics as Json) || 'profiles' in (o.basics as Json)))
}

const KNOWN_PROFILE = /linkedin|github/i

/** URLs of profiles other than LinkedIn / GitHub (Twitter, Dribbble, a blog …). */
function extraProfiles(profiles: Json[]): string[] {
  return profiles.filter((p) => !KNOWN_PROFILE.test(s(p.network)) && !KNOWN_PROFILE.test(s(p.url))).map((p) => importUrl(p.url)).filter(Boolean)
}

/** What a JSON Resume import cannot carry over (for the import preview). */
export function jsonResumeWarnings(json: JsonResume): string[] {
  const b = (json.basics ?? {}) as Json
  const extra = objs(b.profiles).filter((p) => !KNOWN_PROFILE.test(s(p.network)) && !KNOWN_PROFILE.test(s(p.url)))
  const hasWebsite = !!importUrl(b.url ?? b.website)
  const dropped = extra.slice(hasWebsite ? 0 : 1).map((p) => s(p.network) || importUrl(p.url) || 'profile')
  return dropped.length ? [`Only LinkedIn, GitHub and one website are kept — not imported: ${dropped.join(', ')}. Add them to a section if you need them.`] : []
}

export function fromJsonResume(json: JsonResume): ResumeData {
  const b = (json.basics ?? {}) as Json
  const loc = (b.location ?? {}) as Json
  const profiles = objs(b.profiles)
  const profile = (net: RegExp) => {
    const p = profiles.find((x) => net.test(s(x.network)) || net.test(s(x.url)))
    return p ? importUrl(p.url) || (s(p.username) ? `${/github/i.test(net.source) ? 'github.com' : 'linkedin.com/in'}/${s(p.username)}` : '') : ''
  }
  const photo = s(b.image)
  const basics = {
    ...emptyBasics,
    name: s(b.name),
    title: s(b.label),
    email: s(b.email),
    phone: s(b.phone),
    website: importUrl(b.url ?? b.website) || extraProfiles(profiles)[0] || '',
    location: typeof b.location === 'string' ? b.location : [s(loc.city), s(loc.region), s(loc.countryCode)].filter(Boolean).join(', '),
    linkedin: profile(/linkedin/i),
    github: profile(/github/i),
    photo: /^data:image\//.test(photo) ? photo : '',
  }

  const rf = ((json.meta ?? {}) as Json).resumeforge as { sections?: Json[]; custom?: Json[] } | undefined
  const customs = new Map(objs(rf?.custom).map((c) => [s(c.id), c]))
  const plan: { kind: SectionKind; title: string; hidden: boolean; column: ColumnPlacement; id?: string }[] = objs(rf?.sections)
    .map((x) => ({ kind: s(x.kind) as SectionKind, title: s(x.title), hidden: x.hidden === true, column: (x.column === 'main' || x.column === 'side' ? x.column : 'auto') as ColumnPlacement, id: s(x.id) || undefined }))
    .filter((x) => x.kind in KIND_SPECS)
  if (!plan.length) for (const kind of DEFAULT_ORDER) plan.push({ kind, title: KIND_SPECS[kind].label, hidden: false, column: 'auto' })

  const sections: Section[] = []
  for (const p of plan) {
    const title = p.title || KIND_SPECS[p.kind].label
    if (p.kind === 'summary') {
      if (s(b.summary) || rf) sections.push(createSection('summary', title, { content: s(b.summary), hidden: p.hidden, column: p.column }))
      continue
    }
    if (p.kind === 'custom') {
      const c = p.id ? customs.get(p.id) : undefined
      if (c) sections.push(createSection('custom', s(c.title) || title, { items: objs(c.items).map((x) => ({ ...normalizeEntry(x), id: uid() })), hidden: p.hidden, column: p.column }))
      continue
    }
    const key = KIND_TO_KEY[p.kind]
    const items = key ? objs(json[key]) : []
    if (!items.length && !rf) continue
    if (sections.some((x) => x.kind === p.kind)) continue
    sections.push(createSection(p.kind, title, { items: items.map((j) => entryFromJson(p.kind, j)), hidden: p.hidden, column: p.column }))
  }
  // any JSON Resume arrays not mentioned in the plan
  for (const [key, kind] of Object.entries(KEY_TO_KIND)) {
    const items = objs(json[key as keyof JsonResume])
    if (items.length && !sections.some((x) => x.kind === kind)) sections.push(createSection(kind, KIND_SPECS[kind].label, { items: items.map((j) => entryFromJson(kind, j)) }))
  }
  return { basics, sections }
}
