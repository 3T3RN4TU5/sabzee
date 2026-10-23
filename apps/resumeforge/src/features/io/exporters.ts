/**
 * Every export the app offers, as plain async functions (used by ExportMenu; each returns the file
 * name it downloaded). DOCX loads `docx` lazily so it never weighs on the editor's first load.
 * OWNER: io agent.
 */
import { letterToText } from '../../lib/coverLetter.ts'
import type { DocxOptions } from '../../lib/docxModel.ts'
import { toMarkdown, toPlainText } from '../../lib/exportText.ts'
import { printFilename } from '../../lib/filename.ts'
import { exportDoc, exportJsonResume } from '../../lib/importer.ts'
import { resolveFont, resolveHeadingCase } from '../../lib/templateData.ts'
import type { Design, ResumeDoc } from '../../lib/types.ts'
import { getTemplate } from '../../templates'
import { downloadFile } from './download.ts'

export type ExportTarget = 'resume' | 'letter'

/** "Aarav_Mehta_Resume" / "Aarav_Mehta_Cover_Letter" (falls back to the resume's name). */
export function fileBase(doc: ResumeDoc, target: ExportTarget = 'resume'): string {
  return printFilename(doc.data.basics.name.trim() || doc.name, target === 'letter' ? 'Cover_Letter' : 'Resume')
}

/** Font pairing + heading case the template would use, so Word matches the PDF. */
export function docxOptions(design: Design): DocxOptions {
  const def = getTemplate(design.template)
  return { fontId: resolveFont(design, def.defaultFont), headingCase: resolveHeadingCase(design, def.headingCase ?? 'upper') }
}

export async function exportDocx(doc: ResumeDoc, target: ExportTarget = 'resume'): Promise<string> {
  const m = await import('../../lib/docxRender.ts')
  const opts = docxOptions(doc.design)
  const model = target === 'letter' ? m.letterDocxModel(doc.coverLetter, doc.data, doc.design, opts) : m.resumeDocxModel(doc.data, doc.design, opts)
  const blob = await m.Packer.toBlob(m.renderDocx(model))
  const name = `${fileBase(doc, target)}.docx`
  downloadFile(name, new Blob([blob], { type: m.DOCX_MIME }))
  return name
}

export function exportMarkdown(doc: ResumeDoc): string {
  const name = `${fileBase(doc)}.md`
  downloadFile(name, toMarkdown(doc.data, { dateFormat: doc.design.dateFormat }), 'text/markdown;charset=utf-8')
  return name
}

export function exportPlainText(doc: ResumeDoc): string {
  const name = `${fileBase(doc)}.txt`
  downloadFile(name, toPlainText(doc.data, { dateFormat: doc.design.dateFormat }))
  return name
}

export function exportLetterText(doc: ResumeDoc): string {
  const name = `${fileBase(doc, 'letter')}.txt`
  downloadFile(name, letterToText(doc.coverLetter, doc.data))
  return name
}

export function exportBackup(doc: ResumeDoc): string {
  const name = `${fileBase(doc)}.resumeforge.json`
  downloadFile(name, `${JSON.stringify(exportDoc(doc), null, 2)}\n`, 'application/json')
  return name
}

export function exportJsonResumeFile(doc: ResumeDoc): string {
  const name = `${fileBase(doc)}.json-resume.json`
  downloadFile(name, `${JSON.stringify(exportJsonResume(doc), null, 2)}\n`, 'application/json')
  return name
}
