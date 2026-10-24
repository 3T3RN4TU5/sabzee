import { normalizeDesign } from './design.ts'
import { uid } from './ids.ts'
import { ADDABLE_KINDS } from './sections.ts'
import type { Basics, CoverLetter, Entry, ResumeData, ResumeDoc, Section, SectionKind, Snapshot } from './types.ts'

const str = (v: unknown, max = 20000): string => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : '')
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export const emptyBasics: Basics = { name: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '' }

export const emptyCoverLetter: CoverLetter = {
  recipient: '',
  recipientTitle: '',
  company: '',
  address: '',
  date: '',
  role: '',
  greeting: '',
  body: '',
  closing: 'Sincerely,',
  signature: '',
  layout: 'classic',
}

export function normalizeBasics(v: unknown): Basics {
  const b = obj(v)
  const photo = str(b.photo, 2_000_000)
  return {
    name: str(b.name, 200),
    title: str(b.title, 200),
    email: str(b.email, 200),
    phone: str(b.phone, 100),
    location: str(b.location, 200),
    website: str(b.website, 500),
    linkedin: str(b.linkedin, 500),
    github: str(b.github, 500),
    photo: /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(photo) ? photo : '',
  }
}

export function normalizeEntry(v: unknown): Entry {
  const e = obj(v)
  const level = typeof e.level === 'number' && Number.isFinite(e.level) ? Math.round(Math.min(5, Math.max(0, e.level))) : 0
  return {
    id: str(e.id, 64) || uid(),
    title: str(e.title, 500),
    subtitle: str(e.subtitle, 500),
    location: str(e.location, 200),
    start: str(e.start, 40),
    end: str(e.end, 40),
    current: e.current === true,
    url: str(e.url, 1000),
    description: str(e.description),
    bullets: arr(e.bullets).map((b) => str(b, 2000)).slice(0, 60),
    keywords: arr(e.keywords)
      .map((k) => str(k, 120).trim())
      .filter(Boolean)
      .slice(0, 80),
    level,
    meta: str(e.meta, 500),
  }
}

export function normalizeSection(v: unknown): Section | null {
  const s = obj(v)
  const kind = (ADDABLE_KINDS as string[]).includes(str(s.kind)) ? (s.kind as SectionKind) : null
  if (!kind) return null
  const column = s.column === 'main' || s.column === 'side' ? s.column : 'auto'
  return {
    id: str(s.id, 64) || uid(),
    kind,
    title: str(s.title, 120),
    hidden: s.hidden === true,
    column,
    content: str(s.content),
    items: arr(s.items).map(normalizeEntry).slice(0, 100),
  }
}

export function normalizeData(v: unknown): ResumeData {
  const d = obj(v)
  const seen = new Set<string>()
  const sections = arr(d.sections)
    .map(normalizeSection)
    .filter((s): s is Section => s !== null)
    .map((s) => {
      // ids must be unique for drag & drop / focus targets
      if (seen.has(s.id)) s = { ...s, id: uid() }
      seen.add(s.id)
      return s
    })
  return { basics: normalizeBasics(d.basics), sections }
}

export function normalizeCoverLetter(v: unknown): CoverLetter {
  const c = obj(v)
  const out = { ...emptyCoverLetter }
  for (const k of Object.keys(emptyCoverLetter) as (keyof CoverLetter)[]) {
    if (k !== 'layout' && typeof c[k] === 'string') out[k] = str(c[k])
  }
  if (c.layout === 'classic' || c.layout === 'accent' || c.layout === 'minimal') out.layout = c.layout
  return out
}

function normalizeSnapshot(v: unknown): Snapshot | null {
  const s = obj(v)
  if (!s.data) return null
  return {
    id: str(s.id, 64) || uid(),
    name: str(s.name, 120) || 'Snapshot',
    createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    data: normalizeData(s.data),
    design: normalizeDesign(s.design),
  }
}

export function normalizeDoc(v: unknown): ResumeDoc {
  const d = obj(v)
  const now = Date.now()
  return {
    id: str(d.id, 64) || uid(),
    name: str(d.name, 120) || 'Untitled resume',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : now,
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : now,
    data: normalizeData(d.data),
    design: normalizeDesign(d.design),
    coverLetter: normalizeCoverLetter(d.coverLetter),
    jobDescription: str(d.jobDescription, 50000),
    snapshots: arr(d.snapshots)
      .map(normalizeSnapshot)
      .filter((s): s is Snapshot => s !== null)
      .slice(0, 30),
  }
}
