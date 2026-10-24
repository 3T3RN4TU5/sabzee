/**
 * Print root: while `useUiStore().printing` is set, renders that job (resume or cover letter) into a
 * body-level `.rf-print-root` — the only element visible in print media (see templates/shared/base.css).
 * Ctrl+P works too: on `beforeprint` the current screen's `printSource` is rendered synchronously.
 * While a job is mounted, document.title is the PDF file name.
 * OWNER: shell agent.
 */
import { Suspense, useEffect, useLayoutEffect } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { printFilename } from '../lib/filename.ts'
import { paperSize } from '../lib/templateData.ts'
import { uiActions, useActiveDoc, useUiStore } from '../store'
import { PagedDocument } from '../templates'
import { CoverLetterDocument } from './lazy.ts'

export function PrintRoot() {
  const job = useUiStore((s) => s.printing)
  const active = useActiveDoc()

  useEffect(() => {
    const before = () => {
      const s = useUiStore.getState()
      if (!s.printing && s.printSource) flushSync(() => uiActions.startPrint(s.printSource!))
    }
    const after = () => uiActions.endPrint()
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  // The PDF file name comes from document.title ("Aarav_Mehta_Resume" / "Aarav_Mehta_Cover_Letter").
  // Set it here (not in the caller) so it also applies to Ctrl+P and is restored when printing ends.
  const pdfName = job ? printFilename((job.data ?? active?.data)?.basics.name ?? '', job.target === 'letter' ? 'Cover_Letter' : 'Resume') : null
  useLayoutEffect(() => {
    if (!pdfName) return
    const previous = document.title
    document.title = pdfName
    return () => {
      document.title = previous
    }
  }, [pdfName])

  if (!job) return null
  const data = job.data ?? active?.data
  const design = job.design ?? active?.design
  if (!data || !design) return null
  const letter = job.letter ?? active?.coverLetter
  return createPortal(
    <div className="rf-print-root">
      <style>{`@page { size: ${paperSize(design.paper).css}; margin: 0; }`}</style>
      {job.target === 'letter' && letter ? (
        <Suspense fallback={null}>
          <CoverLetterDocument data={data} design={design} letter={letter} mode="print" />
        </Suspense>
      ) : (
        <PagedDocument data={data} design={design} mode="print" />
      )}
    </div>,
    document.body,
  )
}
