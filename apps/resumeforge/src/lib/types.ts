/** Core ResumeForge domain types. Pure data — no React, safe to import from Node tests. */

export type SectionKind =
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'publications'
  | 'volunteering'
  | 'references'
  | 'interests'
  | 'custom'

export interface Basics {
  name: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
  /** Cropped profile photo as a data URL ('' when none). */
  photo: string
}

/**
 * One entry inside a section. A single superset shape is used for every section kind;
 * `KIND_SPECS` in sections.ts decides which fields a kind uses and how they are labelled.
 */
export interface Entry {
  id: string
  /** Role / degree / project / certificate / language / award / skill group / name … */
  title: string
  /** Company / school / issuer / publisher / organisation … */
  subtitle: string
  location: string
  /** 'YYYY-MM', 'YYYY' or free text (legacy). Single-date kinds only use `start`. */
  start: string
  end: string
  current: boolean
  url: string
  /** Paragraph text (inline markdown subset). */
  description: string
  /** Achievement bullets (inline markdown subset). */
  bullets: string[]
  /** Skills in a group, tech stack, interest keywords. */
  keywords: string[]
  /** 0 = not set, 1–5 proficiency. */
  level: number
  /** Kind-specific extra: grade/GPA, authors, reference contact … */
  meta: string
}

export type ColumnPlacement = 'auto' | 'main' | 'side'

export interface Section {
  id: string
  kind: SectionKind
  title: string
  hidden: boolean
  /** Placement in two-column templates. */
  column: ColumnPlacement
  /** Free text body — used by the summary kind. */
  content: string
  items: Entry[]
}

export interface ResumeData {
  basics: Basics
  sections: Section[]
}

export type TemplateId =
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'executive'
  | 'creative'
  | 'tech'
  | 'elegant'
  | 'compact'
  | 'timeline'
  | 'academic'
  | 'corporate'
  | 'startup'
  | 'ats'

export type FontId = 'inter' | 'merriweather' | 'playfair' | 'garamond' | 'poppins' | 'plex' | 'montserrat' | 'raleway' | 'system' | 'georgia'

export type DateFormat = 'MMM YYYY' | 'MMMM YYYY' | 'MM/YYYY' | 'YYYY'
export type HeadingCase = 'auto' | 'upper' | 'normal'
export type Paper = 'a4' | 'letter'
export type PhotoShape = 'circle' | 'rounded' | 'square'

export interface Design {
  template: TemplateId
  accent: string
  /** 'auto' uses the template's default pairing. */
  font: FontId | 'auto'
  /** Base font size in CSS px (before the template's own scale). */
  fontSize: number
  lineHeight: number
  /** Multiplier for vertical spacing between sections and entries. */
  spacing: number
  /** Page margin in millimetres. */
  margin: number
  headingCase: HeadingCase
  dateFormat: DateFormat
  paper: Paper
  showPhoto: boolean
  photoShape: PhotoShape
  showIcons: boolean
}

/** Visual layout of the cover letter (see LETTER_LAYOUTS in lib/letterTools.ts). */
export type LetterLayoutId = 'classic' | 'accent' | 'minimal'

export interface CoverLetter {
  recipient: string
  recipientTitle: string
  company: string
  address: string
  /** ISO date 'YYYY-MM-DD' or ''. */
  date: string
  role: string
  greeting: string
  /** Paragraphs separated by blank lines (inline markdown subset). */
  body: string
  closing: string
  signature: string
  /** Visual layout; header, colours and fonts still follow the resume template. */
  layout: LetterLayoutId
}

export interface Snapshot {
  id: string
  name: string
  createdAt: number
  data: ResumeData
  design: Design
}

export interface ResumeDoc {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  data: ResumeData
  design: Design
  coverLetter: CoverLetter
  jobDescription: string
  snapshots: Snapshot[]
}

export type ThemePref = 'light' | 'dark' | 'system'

/** Shape persisted to localStorage (zustand persist, version 2). */
export interface PersistedState {
  resumes: ResumeDoc[]
  activeId: string | null
  theme: ThemePref
}
