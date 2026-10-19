import { parseLooseDate } from './dates.ts'
import { defaultDesign, isHexColor, isTemplateId, normalizeHex } from './design.ts'
import { uid } from './ids.ts'
import { emptyBasics, emptyCoverLetter, normalizeDoc } from './normalize.ts'
import { makeDoc } from './samples.ts'
import { createEntry, createSection } from './sections.ts'
import type { Entry, PersistedState, ResumeData, ResumeDoc, Section, ThemePref } from './types.ts'

/** Current zustand-persist schema version. */
export const STORE_VERSION = 2
export const STORAGE_KEY = 'resumeforge-v1'

/* ---------------- v1 (single resume) shapes ---------------- */

export interface LegacyResume {
  basics: { name?: string; title?: string; email?: string; phone?: string; location?: string; website?: string; linkedin?: string; github?: string; summary?: string }
  experience?: { id?: string; role?: string; company?: string; location?: string; start?: string; end?: string; current?: boolean; bullets?: string }[]
  education?: { id?: string; degree?: string; school?: string; start?: string; end?: string; score?: string }[]
  projects?: { id?: string; name?: string; link?: string; tech?: string; description?: string }[]
  skills?: { id?: string; group?: string; items?: string }[]
  certifications?: { id?: string; name?: string; issuer?: string; year?: string }[]
}

export interface LegacySettings {
  template?: string
  accent?: string
  order?: string[]
  hidden?: string[]
}

export interface LegacyState {
  resume: LegacyResume
  settings?: LegacySettings
}

const s = (v: unknown) => (typeof v === 'string' ? v : '')
const splitList = (v: unknown) =>
  s(v)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
const splitLines = (v: unknown) =>
  s(v)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

const LEGACY_ORDER = ['summary', 'experience', 'projects', 'skills', 'education', 'certifications']

function legacyDates(start: unknown, end: unknown, current: unknown): Pick<Entry, 'start' | 'end' | 'current'> {
  const a = parseLooseDate(s(start))
  const b = parseLooseDate(s(end))
  return { start: a.value, end: b.present ? '' : b.value, current: current === true || b.present }
}

export function isLegacyResume(v: unknown): v is LegacyResume {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  if (!r.basics || typeof r.basics !== 'object' || 'sections' in r || 'work' in r) return false
  const has = (k: string, ...fields: string[]) => Array.isArray(r[k]) && (r[k] as Record<string, unknown>[]).some((x) => x && typeof x === 'object' && fields.some((f) => f in x))
  return Array.isArray(r.experience) || Array.isArray(r.certifications) || has('skills', 'group', 'items') || has('education', 'degree', 'school') || has('projects', 'link', 'tech')
}

/** Convert the v1 single-resume content (also the v1 JSON export format) into ResumeData. */
export function legacyResumeToData(r: LegacyResume, settings: LegacySettings = {}): ResumeData {
  const b = r.basics ?? {}
  const hidden = new Set(Array.isArray(settings.hidden) ? settings.hidden : [])
  const order = Array.isArray(settings.order) && settings.order.length ? [...new Set(settings.order.filter((x) => LEGACY_ORDER.includes(x)))] : [...LEGACY_ORDER]
  for (const k of LEGACY_ORDER) if (!order.includes(k)) order.push(k)

  const build: Record<string, () => Section> = {
    summary: () => createSection('summary', 'Summary', { content: s(b.summary) }),
    experience: () =>
      createSection('experience', 'Experience', {
        items: (r.experience ?? []).map((x) =>
          createEntry('experience', {
            id: s(x.id) || uid(),
            title: s(x.role),
            subtitle: s(x.company),
            location: s(x.location),
            ...legacyDates(x.start, x.end, x.current),
            bullets: splitLines(x.bullets),
          }),
        ),
      }),
    projects: () =>
      createSection('projects', 'Projects', {
        items: (r.projects ?? []).map((x) =>
          createEntry('projects', { id: s(x.id) || uid(), title: s(x.name), url: s(x.link), keywords: splitList(x.tech), description: s(x.description) }),
        ),
      }),
    education: () =>
      createSection('education', 'Education', {
        items: (r.education ?? []).map((x) =>
          createEntry('education', { id: s(x.id) || uid(), title: s(x.degree), subtitle: s(x.school), meta: s(x.score), ...legacyDates(x.start, x.end, false) }),
        ),
      }),
    skills: () =>
      createSection('skills', 'Skills', {
        items: (r.skills ?? []).map((x) => createEntry('skills', { id: s(x.id) || uid(), title: s(x.group), keywords: splitList(x.items) })),
      }),
    certifications: () =>
      createSection('certifications', 'Certifications', {
        items: (r.certifications ?? []).map((x) =>
          createEntry('certifications', { id: s(x.id) || uid(), title: s(x.name), subtitle: s(x.issuer), start: parseLooseDate(s(x.year)).value }),
        ),
      }),
  }

  return {
    basics: {
      ...emptyBasics,
      name: s(b.name),
      title: s(b.title),
      email: s(b.email),
      phone: s(b.phone),
      location: s(b.location),
      website: s(b.website),
      linkedin: s(b.linkedin),
      github: s(b.github),
    },
    sections: order.map((k) => ({ ...build[k](), hidden: hidden.has(k) })),
  }
}

export function legacyStateToDoc(state: LegacyState): ResumeDoc {
  const settings = state.settings ?? {}
  const data = legacyResumeToData(state.resume, settings)
  const now = Date.now()
  return {
    id: uid(),
    name: data.basics.name ? `${data.basics.name}${data.basics.title ? ` — ${data.basics.title}` : ''}` : 'My resume',
    createdAt: now,
    updatedAt: now,
    data,
    design: {
      ...defaultDesign,
      template: isTemplateId(settings.template) ? settings.template : 'modern',
      accent: typeof settings.accent === 'string' && isHexColor(settings.accent) ? normalizeHex(settings.accent) : defaultDesign.accent,
    },
    coverLetter: { ...emptyCoverLetter },
    jobDescription: '',
    snapshots: [],
  }
}

export function initialState(): PersistedState {
  const doc = makeDoc('developer')
  return { resumes: [doc], activeId: doc.id, theme: 'system' }
}

const THEMES: ThemePref[] = ['light', 'dark', 'system']

/**
 * zustand `persist` migrate hook. v0 = the original single-resume store `{ resume, settings }`;
 * v2 = multiple resumes. Anything unrecognised falls back to a fresh state instead of crashing.
 */
export function migratePersisted(persisted: unknown, version: number): PersistedState {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<string, unknown>
  if (version < 2 && p.resume && typeof p.resume === 'object') {
    const doc = legacyStateToDoc({ resume: p.resume as LegacyResume, settings: (p.settings ?? {}) as LegacySettings })
    return { resumes: [doc], activeId: doc.id, theme: 'system' }
  }
  if (Array.isArray(p.resumes)) {
    const resumes = p.resumes.map(normalizeDoc)
    const activeId = typeof p.activeId === 'string' && resumes.some((r) => r.id === p.activeId) ? p.activeId : (resumes[0]?.id ?? null)
    return { resumes, activeId, theme: THEMES.includes(p.theme as ThemePref) ? (p.theme as ThemePref) : 'system' }
  }
  return initialState()
}
