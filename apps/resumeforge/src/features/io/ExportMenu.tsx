/**
 * Export menu (the editor header's "Download" button): PDF (print → Save as PDF), Word, plain text,
 * Markdown, cover letter PDF/Word/text, share link, ResumeForge backup and JSON Resume.
 * OWNER: io agent.
 */
import { ChevronDown, Download, FileCode2, FileJson, FileText, FileType, Link2, Loader2, Mail, Printer, Save } from 'lucide-react'
import { useState } from 'react'
import { shortcut, MOD } from '../../app/platform.ts'
import { hasLetterContent } from '../../lib/docxModel.ts'
import { paperSize } from '../../lib/templateData.ts'
import type { ResumeDoc } from '../../lib/types.ts'
import { getActiveDoc, toast, useActiveDoc, useUiStore } from '../../store'
import { Button, Menu, type MenuItem } from '../../ui'
import { exportBackup, exportDocx, exportJsonResumeFile, exportLetterText, exportMarkdown, exportPlainText } from './exporters.ts'
import { pdfTitle, printDocument } from './print.ts'
import { ShareDialog } from './ShareDialog.tsx'

export interface ExportMenuProps {
  /** Icon-only trigger for narrow headers. */
  compact?: boolean
}

export function ExportMenu({ compact = false }: ExportMenuProps) {
  const doc = useActiveDoc()
  const panel = useUiStore((s) => s.panel)
  const [busy, setBusy] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  /** Run an export for the active resume with a busy state and success/failure toasts. */
  const run = (key: string, what: string, fn: (d: ResumeDoc) => string | Promise<string>) => () => {
    const d = getActiveDoc()
    if (!d || busy) return
    setBusy(key)
    void (async () => {
      try {
        const file = await fn(d)
        toast(`Downloaded ${file}`, 'success')
      } catch (e) {
        console.error(e)
        toast(`Couldn’t export ${what}${e instanceof Error && e.message ? `: ${e.message}` : ''}`, 'error')
      } finally {
        setBusy(null)
      }
    })()
  }

  const pdf = (target: 'resume' | 'letter') => () => {
    const job = { target }
    toast(`In the print dialog choose “Save as PDF” — it will be named ${pdfTitle(job)}.pdf`, 'info', { duration: 6000 })
    printDocument(job).catch((e: unknown) => {
      console.error(e)
      toast('Couldn’t open the print dialog', 'error')
    })
  }

  const paper = doc ? paperSize(doc.design.paper).label : 'A4'
  const letterReady = !!doc && hasLetterContent(doc.coverLetter)
  const showLetter = letterReady || panel === 'cover'
  const needLetter = letterReady ? undefined : 'Write your letter in the Cover letter tab first'

  const items: (MenuItem | 'separator' | { heading: string })[] = [
    { heading: 'Resume' },
    { key: 'pdf', icon: Printer, label: 'PDF', description: `Text-based, ATS-readable · ${paper}`, hint: shortcut(MOD, 'P'), onSelect: pdf('resume') },
    { key: 'docx', icon: FileType, label: 'Word (.docx)', description: 'Editable in Word and Google Docs', onSelect: run('docx', 'the Word file', (d) => exportDocx(d, 'resume')) },
    { key: 'txt', icon: FileText, label: 'Plain text (.txt)', description: 'For pasting into job portals', onSelect: run('txt', 'plain text', exportPlainText) },
    { key: 'md', icon: FileCode2, label: 'Markdown (.md)', description: 'For GitHub, Notion or your site', onSelect: run('md', 'Markdown', exportMarkdown) },
    ...(showLetter
      ? ([
          'separator',
          { heading: 'Cover letter' },
          { key: 'letter-pdf', icon: Printer, label: 'Cover letter PDF', description: needLetter ?? 'Matches your resume design', disabled: !letterReady, onSelect: pdf('letter') },
          { key: 'letter-docx', icon: FileType, label: 'Cover letter Word (.docx)', description: needLetter, disabled: !letterReady, onSelect: run('letter-docx', 'the cover letter', (d) => exportDocx(d, 'letter')) },
          { key: 'letter-txt', icon: Mail, label: 'Cover letter text (.txt)', description: needLetter ?? 'For email bodies and forms', disabled: !letterReady, onSelect: run('letter-txt', 'the cover letter', exportLetterText) },
        ] as const)
      : []),
    'separator',
    { heading: 'Share & back up' },
    { key: 'share', icon: Link2, label: 'Share link…', description: 'Read-only link — the resume lives in the URL', onSelect: () => setSharing(true) },
    { key: 'json', icon: Save, label: 'ResumeForge backup (.json)', description: 'Content, design and cover letter', onSelect: run('json', 'the backup', exportBackup) },
    { key: 'jsonresume', icon: FileJson, label: 'JSON Resume (.json)', description: 'Open standard — jsonresume.org', onSelect: run('jsonresume', 'JSON Resume', exportJsonResumeFile) },
  ]

  return (
    <>
      <Menu
        width="w-80"
        label="Download and export"
        trigger={(p) => (
          <Button
            variant="primary"
            icon={busy ? Loader2 : Download}
            iconRight={compact ? undefined : ChevronDown}
            {...p}
            aria-label={busy ? 'Preparing download…' : 'Download / export'}
            aria-busy={busy ? true : undefined}
            className={busy ? '[&>svg:first-child]:animate-spin' : undefined}
          >
            {compact ? null : busy ? 'Preparing…' : 'Download'}
          </Button>
        )}
        items={items}
      />
      {doc && sharing && <ShareDialog open onClose={() => setSharing(false)} doc={doc} />}
    </>
  )
}
