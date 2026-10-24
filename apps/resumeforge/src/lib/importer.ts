/** Detect and import any JSON file the user drops in: ResumeForge v2, v1 export or JSON Resume. */
import { normalizeDesign } from './design.ts'
import { fromJsonResume, isJsonResume, jsonResumeWarnings, toJsonResume } from './jsonresume.ts'
import { isLegacyResume, legacyResumeToData } from './migrate.ts'
import { MAX_JOB_DESCRIPTION, MAX_NAME, MAX_PHOTO_CHARS, normalizeCoverLetter, normalizeData, stripControlChars } from './normalize.ts'
import type { CoverLetter, Design, ResumeData, ResumeDoc } from './types.ts'

export const EXPORT_TYPE = 'resumeforge'

export interface ImportedResume {
  format: 'resumeforge' | 'resumeforge-v1' | 'json-resume'
  name: string
  data: ResumeData
  design?: Design
  coverLetter?: CoverLetter
  jobDescription?: string
  /** Things that could not be carried over (shown in the import preview). */
  warnings?: string[]
}

export function exportDoc(doc: ResumeDoc) {
  return {
    $type: EXPORT_TYPE,
    version: 2,
    name: doc.name,
    data: doc.data,
    design: doc.design,
    coverLetter: doc.coverLetter,
    jobDescription: doc.jobDescription,
  }
}

export function exportJsonResume(doc: ResumeDoc) {
  return toJsonResume(doc.data)
}

const capName = (s: string) => stripControlChars(s).trim().slice(0, MAX_NAME)

/** The photo value the file carried, before normalisation. */
function rawPhoto(o: Record<string, unknown>): string {
  const pick = (x: unknown, key: string) => (x && typeof x === 'object' ? (x as Record<string, unknown>)[key] : undefined)
  for (const v of [pick(pick(o.data, 'basics'), 'photo'), pick(o.basics, 'photo'), pick(o.basics, 'image'), pick(pick(o, 'personal'), 'photo'), o.photo]) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export function importJson(value: unknown): ImportedResume {
  const r = importJsonRaw(value)
  const warnings = [...(r.warnings ?? [])]
  const photo = value && typeof value === 'object' ? rawPhoto(value as Record<string, unknown>) : ''
  if (photo && !r.data.basics.photo && !/^https?:/i.test(photo)) {
    warnings.push(
      photo.length > MAX_PHOTO_CHARS
        ? `The profile photo is too large (${Math.round((photo.length * 3) / 4 / 1024)} KB, limit ${Math.round((MAX_PHOTO_CHARS * 3) / 4 / 1024)} KB) and was not imported — upload it again after importing.`
        : 'The profile photo is not a PNG, JPEG or WebP image and was not imported.',
    )
  } else if (photo && !r.data.basics.photo) {
    warnings.push('Linked photos (URLs) are not imported — upload the photo after importing.')
  }
  return { ...r, ...(warnings.length ? { warnings } : {}), name: capName(r.name) || 'Imported resume', ...(r.jobDescription !== undefined ? { jobDescription: stripControlChars(r.jobDescription).slice(0, MAX_JOB_DESCRIPTION) } : {}) }
}

function importJsonRaw(value: unknown): ImportedResume {
  if (!value || typeof value !== 'object') throw new Error('The file does not contain a JSON object')
  const o = value as Record<string, unknown>
  if (o.$type === EXPORT_TYPE || (o.data && typeof o.data === 'object' && 'sections' in (o.data as object))) {
    const data = normalizeData(o.data)
    return {
      format: 'resumeforge',
      name: typeof o.name === 'string' && o.name ? o.name : data.basics.name || 'Imported resume',
      data,
      design: normalizeDesign(o.design),
      coverLetter: normalizeCoverLetter(o.coverLetter),
      jobDescription: typeof o.jobDescription === 'string' ? o.jobDescription : '',
    }
  }
  if ('sections' in o && 'basics' in o) {
    const data = normalizeData(o)
    return { format: 'resumeforge', name: data.basics.name || 'Imported resume', data }
  }
  if (isLegacyResume(o)) {
    const data = legacyResumeToData(o)
    return { format: 'resumeforge-v1', name: data.basics.name || 'Imported resume', data }
  }
  if (isJsonResume(o)) {
    const data = normalizeData(fromJsonResume(o))
    const warnings = jsonResumeWarnings(o)
    return { format: 'json-resume', ...(warnings.length ? { warnings } : {}), name: data.basics.name ? `${data.basics.name} (JSON Resume)` : 'Imported JSON Resume', data }
  }
  throw new Error('Unrecognised format — expected a ResumeForge or JSON Resume file')
}
