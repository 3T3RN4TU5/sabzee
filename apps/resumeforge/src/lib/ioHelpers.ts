/**
 * Pure helpers behind the import dialog and share links: friendly validation of dropped files,
 * JSON parsing with line/column errors, an import preview summary, unique names and share-link
 * length levels. No DOM, no React.
 */
import { importJson, type ImportedResume } from './importer.ts'
import { KIND_SPECS, cleanBullets, sectionHasContent } from './sections.ts'
import type { SectionKind, TemplateId } from './types.ts'

/** Bigger than any real resume backup (a photo is ≤ 2 MB as a data URL). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export const FORMAT_LABELS: Record<ImportedResume['format'], string> = {
  resumeforge: 'ResumeForge backup',
  'resumeforge-v1': 'ResumeForge v1 export',
  'json-resume': 'JSON Resume',
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const NOT_JSON: Record<string, string> = {
  pdf: 'a PDF document',
  doc: 'a Word document',
  docx: 'a Word document',
  odt: 'an OpenDocument file',
  rtf: 'a rich-text document',
  pages: 'a Pages document',
  png: 'an image',
  jpg: 'an image',
  jpeg: 'an image',
  gif: 'an image',
  webp: 'an image',
  heic: 'an image',
  zip: 'a zip archive',
  md: 'a Markdown file',
  txt: 'a text file',
  csv: 'a spreadsheet',
  xlsx: 'a spreadsheet',
}

export const SUPPORTED_HINT = 'ResumeForge imports .json files: a ResumeForge backup, a ResumeForge v1 export or a JSON Resume (jsonresume.org).'

/** Quick checks before reading a file. Returns an error message, or null when the file is worth reading. */
export function checkImportFile(file: { name: string; size: number }): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? ''
  if (ext && NOT_JSON[ext]) return `“${file.name}” is ${NOT_JSON[ext]}. ${SUPPORTED_HINT}`
  if (file.size === 0) return `“${file.name}” is empty.`
  if (file.size > MAX_IMPORT_BYTES) return `“${file.name}” is too large (${formatBytes(file.size)}). Resume files are well under ${formatBytes(MAX_IMPORT_BYTES)}.`
  return null
}

/** "…at position 42" → "line 3, column 5" (V8 messages sometimes include it already). */
function jsonErrorWhere(text: string, message: string): string {
  const lc = /line (\d+) column (\d+)/i.exec(message)
  if (lc) return `line ${lc[1]}, column ${lc[2]}`
  const pos = /position (\d+)/i.exec(message)
  if (!pos) return ''
  const before = text.slice(0, Number(pos[1]))
  const line = before.split('\n').length
  const column = before.length - before.lastIndexOf('\n')
  return `line ${line}, column ${column}`
}

/**
 * Parse a dropped/pasted file into an importable resume, with messages a person can act on.
 * Throws Error for empty text, invalid JSON, non-object JSON and unrecognised formats.
 */
export function parseImportText(raw: string): ImportedResume {
  const text = raw.replace(/^﻿/, '')
  if (!text.trim()) throw new Error('The file is empty.')
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (e) {
    const where = jsonErrorWhere(text, e instanceof Error ? e.message : '')
    throw new Error(`This isn’t valid JSON${where ? ` (problem near ${where})` : ''}. If you edited the file by hand, check for a missing comma or quote. ${SUPPORTED_HINT}`)
  }
  if (Array.isArray(value)) throw new Error('This JSON is a list. Expected a single resume object — a ResumeForge backup or a JSON Resume.')
  if (!value || typeof value !== 'object') throw new Error(`This JSON doesn’t contain a resume. ${SUPPORTED_HINT}`)
  try {
    return importJson(value)
  } catch {
    throw new Error(`This JSON doesn’t look like a resume. ${SUPPORTED_HINT}`)
  }
}

export interface ImportSummary {
  format: ImportedResume['format']
  formatLabel: string
  /** Name the new resume will get. */
  name: string
  person: string
  headline: string
  /** Visible sections with content, in order. */
  sections: { kind: SectionKind; title: string; count: number; hidden: boolean }[]
  entryCount: number
  bulletCount: number
  template: TemplateId | null
  hasCoverLetter: boolean
  hasPhoto: boolean
  hasJobDescription: boolean
  /** No name and no section content at all. */
  isEmpty: boolean
}

export function summarizeImport(imp: ImportedResume): ImportSummary {
  const withContent = imp.data.sections.filter(sectionHasContent)
  const sections = withContent.map((s) => ({
    kind: s.kind,
    title: s.title.trim() || KIND_SPECS[s.kind].label,
    count: s.kind === 'summary' ? 1 : s.items.filter((e) => e.title.trim() || e.subtitle.trim() || e.keywords.length || cleanBullets(e).length || e.description.trim()).length,
    hidden: s.hidden,
  }))
  const entries = withContent.filter((s) => s.kind !== 'summary').flatMap((s) => s.items)
  return {
    format: imp.format,
    formatLabel: FORMAT_LABELS[imp.format],
    name: imp.name,
    person: imp.data.basics.name.trim(),
    headline: imp.data.basics.title.trim(),
    sections,
    entryCount: sections.filter((s) => s.kind !== 'summary').reduce((n, s) => n + s.count, 0),
    bulletCount: entries.reduce((n, e) => n + cleanBullets(e).length, 0),
    template: imp.design?.template ?? null,
    hasCoverLetter: !!imp.coverLetter?.body.trim(),
    hasPhoto: !!imp.data.basics.photo,
    hasJobDescription: !!imp.jobDescription?.trim(),
    isEmpty: !imp.data.basics.name.trim() && sections.length === 0,
  }
}

/** "Name" → "Name (2)" when taken (case-insensitive). */
export function uniqueName(name: string, taken: readonly string[]): string {
  const base = name.trim() || 'Imported resume'
  const set = new Set(taken.map((t) => t.trim().toLowerCase()))
  if (!set.has(base.toLowerCase())) return base
  const stem = base.replace(/\s\(\d+\)$/, '')
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem} (${i})`
    if (!set.has(candidate.toLowerCase())) return candidate
  }
  return `${stem} (${Date.now()})`
}

/** Share links live entirely in the URL; long ones get cut by some mail and chat apps. */
export const SHARE_LIMITS = { long: 2000, veryLong: 8000 } as const
export type ShareLevel = 'ok' | 'long' | 'very-long'

export function shareLevel(urlLength: number): ShareLevel {
  return urlLength > SHARE_LIMITS.veryLong ? 'very-long' : urlLength > SHARE_LIMITS.long ? 'long' : 'ok'
}
