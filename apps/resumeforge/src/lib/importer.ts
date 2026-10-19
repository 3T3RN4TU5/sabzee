/** Detect and import any JSON file the user drops in: ResumeForge v2, v1 export or JSON Resume. */
import { normalizeDesign } from './design.ts'
import { fromJsonResume, isJsonResume, toJsonResume } from './jsonresume.ts'
import { isLegacyResume, legacyResumeToData } from './migrate.ts'
import { normalizeCoverLetter, normalizeData } from './normalize.ts'
import type { CoverLetter, Design, ResumeData, ResumeDoc } from './types.ts'

export const EXPORT_TYPE = 'resumeforge'

export interface ImportedResume {
  format: 'resumeforge' | 'resumeforge-v1' | 'json-resume'
  name: string
  data: ResumeData
  design?: Design
  coverLetter?: CoverLetter
  jobDescription?: string
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

export function importJson(value: unknown): ImportedResume {
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
    return { format: 'json-resume', name: data.basics.name ? `${data.basics.name} (JSON Resume)` : 'Imported JSON Resume', data }
  }
  throw new Error('Unrecognised format — expected a ResumeForge or JSON Resume file')
}
