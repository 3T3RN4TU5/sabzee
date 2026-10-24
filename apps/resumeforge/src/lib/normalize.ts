import { normalizeDesign } from './design.ts'
import { uid } from './ids.ts'
import { ADDABLE_KINDS } from './sections.ts'
import type { Basics, CoverLetter, Entry, ResumeData, ResumeDoc, Section, SectionKind, Snapshot } from './types.ts'

/** C0 control characters (except tab / newline / CR) and non-characters are illegal in XML (DOCX) and invisible on screen. */
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g
export const stripControlChars = (s: string): string => s.replace(CONTROL_RE, '')

const str = (v: unknown, max = 20000): string => (typeof v === 'string' ? stripControlChars(v).slice(0, max) : typeof v === 'number' ? String(v) : '')

/** Largest decoded photo accepted anywhere (the in-app cropper's output budget). */
export const MAX_PHOTO_BYTES = 220 * 1024
/**
 * Longest photo data URL accepted on load / import, derived from MAX_PHOTO_BYTES: base64 length of
 * that many bytes plus room for the longest accepted prefix ("data:image/jpeg;base64,"). The cropper
 * checks its output against this exact number, so a photo it saves always survives a reload.
 */
export const MAX_PHOTO_CHARS = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 'data:image/jpeg;base64,'.length
/** Field caps shared with the importer. */
export const MAX_NAME = 120
export const MAX_JOB_DESCRIPTION = 50000
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
  const photo = typeof b.photo === 'string' && b.photo.length <= MAX_PHOTO_CHARS ? b.photo : ''
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
  const seenEntries = new Set<string>()
  const sections = arr(d.sections)
    .map(normalizeSection)
    .filter((s): s is Section => s !== null)
    .map((s) => {
      // ids must be unique for drag & drop / focus targets — sections and entries across the whole doc
      if (seen.has(s.id)) s = { ...s, id: uid() }
      seen.add(s.id)
      const items = s.items.map((e) => {
        let id = e.id
        while (seenEntries.has(id)) id = uid()
        seenEntries.add(id)
        return id === e.id ? e : { ...e, id }
      })
      return { ...s, items }
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
    name: str(d.name, MAX_NAME) || 'Untitled resume',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : now,
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : now,
    data: normalizeData(d.data),
    design: normalizeDesign(d.design),
    coverLetter: normalizeCoverLetter(d.coverLetter),
    jobDescription: str(d.jobDescription, MAX_JOB_DESCRIPTION),
    snapshots: uniqueSnapshotIds(
      arr(d.snapshots)
        .map(normalizeSnapshot)
        .filter((s): s is Snapshot => s !== null)
        .slice(0, 30),
    ),
  }
}

/** Snapshot ids key the stored photo references — a duplicate would resolve to the wrong photo. */
function uniqueSnapshotIds(snaps: Snapshot[]): Snapshot[] {
  const seen = new Set<string>()
  return snaps.map((s) => {
    let id = s.id
    while (seen.has(id)) id = uid()
    seen.add(id)
    return id === s.id ? s : { ...s, id }
  })
}
