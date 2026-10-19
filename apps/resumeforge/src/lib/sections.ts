import { uid } from './ids.ts'
import type { Entry, Section, SectionKind } from './types.ts'

export type FieldType = 'text' | 'url' | 'month' | 'end' | 'textarea' | 'bullets' | 'tags' | 'level'

export interface FieldSpec {
  key: keyof Entry
  label: string
  type: FieldType
  placeholder?: string
  wide?: boolean
  hint?: string
}

export interface KindSpec {
  kind: SectionKind
  label: string
  singular: string
  /** Built-in kinds can only appear once; repeatable kinds (custom) any number of times. */
  repeatable: boolean
  description: string
  fields: FieldSpec[]
  /** Uses a single date (stored in `start`) rather than a range. */
  singleDate?: boolean
  levelLabels?: string[]
}

export const SKILL_LEVELS = ['', 'Beginner', 'Intermediate', 'Proficient', 'Advanced', 'Expert']
export const LANGUAGE_LEVELS = ['', 'Elementary', 'Limited working', 'Professional working', 'Full professional', 'Native / bilingual']

const dateRange: FieldSpec[] = [
  { key: 'start', label: 'Start date', type: 'month' },
  { key: 'end', label: 'End date', type: 'end' },
]

export const KIND_SPECS: Record<SectionKind, KindSpec> = {
  summary: {
    kind: 'summary',
    label: 'Summary',
    singular: 'summary',
    repeatable: false,
    description: 'A 2–4 sentence pitch at the top of your resume',
    fields: [],
  },
  experience: {
    kind: 'experience',
    label: 'Experience',
    singular: 'position',
    repeatable: false,
    description: 'Jobs, internships and freelance work',
    fields: [
      { key: 'title', label: 'Job title', type: 'text', placeholder: 'Software Engineer' },
      { key: 'subtitle', label: 'Employer', type: 'text', placeholder: 'Acme Corp' },
      ...dateRange,
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Bengaluru / Remote' },
      { key: 'url', label: 'Company website', type: 'url', placeholder: 'acme.com' },
      { key: 'bullets', label: 'Achievements', type: 'bullets', wide: true, hint: 'Start with an action verb and add a number wherever you can.' },
    ],
  },
  education: {
    kind: 'education',
    label: 'Education',
    singular: 'education',
    repeatable: false,
    description: 'Degrees, schools and grades',
    fields: [
      { key: 'title', label: 'Degree', type: 'text', placeholder: 'B.Tech, Computer Science', wide: true },
      { key: 'subtitle', label: 'School', type: 'text', placeholder: 'IIT Delhi', wide: true },
      ...dateRange,
      { key: 'location', label: 'Location', type: 'text', placeholder: 'New Delhi' },
      { key: 'meta', label: 'Grade / GPA', type: 'text', placeholder: 'CGPA 8.7 / 10' },
      { key: 'bullets', label: 'Highlights (optional)', type: 'bullets', wide: true },
    ],
  },
  projects: {
    kind: 'projects',
    label: 'Projects',
    singular: 'project',
    repeatable: false,
    description: 'Side projects, open source and case studies',
    fields: [
      { key: 'title', label: 'Project name', type: 'text', placeholder: 'TaskFlow' },
      { key: 'url', label: 'Link', type: 'url', placeholder: 'taskflow.vercel.app' },
      { key: 'subtitle', label: 'Role / context (optional)', type: 'text', placeholder: 'Personal project' },
      { key: 'start', label: 'Date (optional)', type: 'month' },
      { key: 'keywords', label: 'Tech stack', type: 'tags', wide: true, placeholder: 'React, TypeScript…' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true, placeholder: 'What it does and what you built' },
      { key: 'bullets', label: 'Highlights (optional)', type: 'bullets', wide: true },
    ],
    singleDate: true,
  },
  skills: {
    kind: 'skills',
    label: 'Skills',
    singular: 'skill group',
    repeatable: false,
    description: 'Grouped skills with optional proficiency',
    fields: [
      { key: 'title', label: 'Group or skill', type: 'text', placeholder: 'Frontend' },
      { key: 'level', label: 'Proficiency', type: 'level' },
      { key: 'keywords', label: 'Skills', type: 'tags', wide: true, placeholder: 'React, Next.js, Tailwind…' },
    ],
    levelLabels: SKILL_LEVELS,
  },
  certifications: {
    kind: 'certifications',
    label: 'Certifications',
    singular: 'certificate',
    repeatable: false,
    description: 'Licences and certificates',
    fields: [
      { key: 'title', label: 'Certificate', type: 'text', placeholder: 'AWS Certified Cloud Practitioner', wide: true },
      { key: 'subtitle', label: 'Issuer', type: 'text', placeholder: 'Amazon Web Services' },
      { key: 'start', label: 'Date', type: 'month' },
      { key: 'url', label: 'Credential URL', type: 'url', placeholder: 'credly.com/…' },
    ],
    singleDate: true,
  },
  languages: {
    kind: 'languages',
    label: 'Languages',
    singular: 'language',
    repeatable: false,
    description: 'Spoken languages and proficiency',
    fields: [
      { key: 'title', label: 'Language', type: 'text', placeholder: 'Hindi' },
      { key: 'level', label: 'Proficiency', type: 'level' },
    ],
    levelLabels: LANGUAGE_LEVELS,
  },
  awards: {
    kind: 'awards',
    label: 'Awards',
    singular: 'award',
    repeatable: false,
    description: 'Honours, scholarships and hackathon wins',
    fields: [
      { key: 'title', label: 'Award', type: 'text', placeholder: 'Smart India Hackathon — Winner', wide: true },
      { key: 'subtitle', label: 'Awarded by', type: 'text', placeholder: 'Ministry of Education' },
      { key: 'start', label: 'Date', type: 'month' },
      { key: 'description', label: 'Description (optional)', type: 'textarea', wide: true },
    ],
    singleDate: true,
  },
  publications: {
    kind: 'publications',
    label: 'Publications',
    singular: 'publication',
    repeatable: false,
    description: 'Papers, articles and talks',
    fields: [
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Efficient attention for long documents', wide: true },
      { key: 'meta', label: 'Authors', type: 'text', placeholder: 'M. Iyer, A. Rao', wide: true },
      { key: 'subtitle', label: 'Venue / publisher', type: 'text', placeholder: 'NeurIPS' },
      { key: 'start', label: 'Date', type: 'month' },
      { key: 'url', label: 'Link (DOI / URL)', type: 'url', placeholder: 'doi.org/…', wide: true },
      { key: 'description', label: 'Summary (optional)', type: 'textarea', wide: true },
    ],
    singleDate: true,
  },
  volunteering: {
    kind: 'volunteering',
    label: 'Volunteering',
    singular: 'role',
    repeatable: false,
    description: 'Community work and non-profits',
    fields: [
      { key: 'title', label: 'Role', type: 'text', placeholder: 'Mentor' },
      { key: 'subtitle', label: 'Organisation', type: 'text', placeholder: 'Code for India' },
      ...dateRange,
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'bullets', label: 'Highlights', type: 'bullets', wide: true },
    ],
  },
  references: {
    kind: 'references',
    label: 'References',
    singular: 'reference',
    repeatable: false,
    description: 'People who can vouch for you',
    fields: [
      { key: 'title', label: 'Name', type: 'text', placeholder: 'Dr. Kavya Rao' },
      { key: 'subtitle', label: 'Position & company', type: 'text', placeholder: 'Engineering Manager, Finlytics' },
      { key: 'meta', label: 'Contact', type: 'text', placeholder: 'kavya.rao@example.com', wide: true },
      { key: 'description', label: 'Note (optional)', type: 'textarea', wide: true, placeholder: 'Managed me for two years…' },
    ],
  },
  interests: {
    kind: 'interests',
    label: 'Interests',
    singular: 'interest',
    repeatable: false,
    description: 'Hobbies that say something about you',
    fields: [
      { key: 'title', label: 'Interest', type: 'text', placeholder: 'Open source' },
      { key: 'keywords', label: 'Details (optional)', type: 'tags', wide: true },
    ],
  },
  custom: {
    kind: 'custom',
    label: 'Custom section',
    singular: 'item',
    repeatable: true,
    description: 'Anything else — give it your own title',
    fields: [
      { key: 'title', label: 'Title', type: 'text', wide: true },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      ...dateRange,
      { key: 'url', label: 'Link', type: 'url' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'bullets', label: 'Bullets', type: 'bullets', wide: true },
    ],
  },
}

export const ADDABLE_KINDS: SectionKind[] = [
  'summary',
  'experience',
  'education',
  'projects',
  'skills',
  'certifications',
  'languages',
  'awards',
  'publications',
  'volunteering',
  'references',
  'interests',
  'custom',
]

/** Kinds whose entries describe a dated role/item and render as "entries". */
export const ENTRY_KINDS: SectionKind[] = ['experience', 'education', 'projects', 'certifications', 'awards', 'publications', 'volunteering', 'custom']

export function emptyEntry(): Entry {
  return { id: uid(), title: '', subtitle: '', location: '', start: '', end: '', current: false, url: '', description: '', bullets: [], keywords: [], level: 0, meta: '' }
}

export function createEntry(kind: SectionKind, patch: Partial<Entry> = {}): Entry {
  const base = emptyEntry()
  if (kind === 'experience' || kind === 'volunteering') base.bullets = ['']
  return { ...base, ...patch, id: patch.id ?? base.id }
}

export function createSection(kind: SectionKind, title?: string, patch: Partial<Section> = {}): Section {
  return {
    id: uid(),
    kind,
    title: title ?? KIND_SPECS[kind].label,
    hidden: false,
    column: 'auto',
    content: '',
    items: [],
    ...patch,
  }
}

export function entryLabel(kind: SectionKind, e: Entry): string {
  const t = e.title.trim()
  const s = e.subtitle.trim()
  if (kind === 'experience' || kind === 'volunteering') return [t, s].filter(Boolean).join(' @ ') || `New ${KIND_SPECS[kind].singular}`
  if (kind === 'education') return [t, s].filter(Boolean).join(' — ') || 'New education'
  return t || s || `New ${KIND_SPECS[kind].singular}`
}

export function sectionHasContent(s: Section): boolean {
  if (s.kind === 'summary') return s.content.trim().length > 0
  return s.items.some((e) => e.title.trim() || e.subtitle.trim() || e.description.trim() || e.bullets.some((b) => b.trim()) || e.keywords.length > 0)
}

export function cleanBullets(e: Entry): string[] {
  return e.bullets.map((b) => b.trim()).filter(Boolean)
}
