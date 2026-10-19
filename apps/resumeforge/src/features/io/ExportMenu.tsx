/**
 * Export menu (header "Download" button). OWNER: io agent — this baseline implements PDF, Markdown,
 * TXT, JSON, JSON Resume and share links; DOCX is left for the io agent (import 'docx' dynamically).
 */
import { ChevronDown, Download, FileCode2, FileJson, FileText, FileType, Link2, Printer } from 'lucide-react'
import { toMarkdown, toPlainText } from '../../lib/exportText.ts'
import { printFilename } from '../../lib/filename.ts'
import { exportDoc, exportJsonResume } from '../../lib/importer.ts'
import { shareUrl } from '../../lib/share.ts'
import { getActiveDoc, toast, useUiStore } from '../../store'
import { Button, Menu } from '../../ui'
import { copyText, downloadFile } from './download.ts'
import { printDocument } from './print.ts'

export interface ExportMenuProps {
  /** Icon-only trigger for narrow headers. */
  compact?: boolean
}

export function ExportMenu({ compact = false }: ExportMenuProps) {
  const panel = useUiStore((s) => s.panel)
  const withDoc = (fn: (doc: NonNullable<ReturnType<typeof getActiveDoc>>) => void) => () => {
    const doc = getActiveDoc()
    if (doc) fn(doc)
  }
  const base = (doc: NonNullable<ReturnType<typeof getActiveDoc>>) => printFilename(doc.data.basics.name)

  return (
    <Menu
      width="w-72"
      trigger={(p) => (
        <Button variant="primary" icon={Download} iconRight={compact ? undefined : ChevronDown} {...p} aria-label="Download / export">
          {compact ? null : 'Download'}
        </Button>
      )}
      items={[
        { heading: 'Resume' },
        { key: 'pdf', icon: Printer, label: 'PDF', description: 'Print → “Save as PDF” (text-based, ATS-safe)', onSelect: () => void printDocument({ target: 'resume' }) },
        ...(panel === 'cover' ? [{ key: 'pdf-letter', icon: Printer, label: 'Cover letter PDF', onSelect: () => void printDocument({ target: 'letter' }) }] : []),
        { key: 'docx', icon: FileType, label: 'Word (.docx)', description: 'Coming soon', disabled: true, onSelect: () => undefined },
        { key: 'md', icon: FileCode2, label: 'Markdown', onSelect: withDoc((d) => downloadFile(`${base(d)}.md`, toMarkdown(d.data, { dateFormat: d.design.dateFormat }), 'text/markdown;charset=utf-8')) },
        { key: 'txt', icon: FileText, label: 'Plain text (ATS)', onSelect: withDoc((d) => downloadFile(`${base(d)}.txt`, toPlainText(d.data, { dateFormat: d.design.dateFormat }))) },
        'separator',
        { heading: 'Data' },
        { key: 'json', icon: FileJson, label: 'ResumeForge JSON', description: 'Full backup incl. design & cover letter', onSelect: withDoc((d) => downloadFile(`${base(d)}.resumeforge.json`, JSON.stringify(exportDoc(d), null, 2), 'application/json')) },
        { key: 'jsonresume', icon: FileJson, label: 'JSON Resume', description: 'jsonresume.org schema', onSelect: withDoc((d) => downloadFile(`${base(d)}.json`, JSON.stringify(exportJsonResume(d), null, 2), 'application/json')) },
        {
          key: 'share',
          icon: Link2,
          label: 'Copy share link',
          description: 'Read-only link — the resume lives in the URL',
          onSelect: withDoc(async (d) => {
            const ok = await copyText(shareUrl(window.location.href, { data: d.data, design: d.design }))
            toast(ok ? 'Share link copied' : 'Could not copy the link', ok ? 'success' : 'error')
          }),
        },
      ]}
    />
  )
}
