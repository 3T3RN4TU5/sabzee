/**
 * Print / "Save as PDF". The app's PrintRoot (src/app/PrintRoot.tsx) renders `useUiStore().printing`
 * into a body-level `.rf-print-root` that is the only thing visible in print media; @page size and
 * margins come from the design's paper. Pages are rendered unscaled with exact page breaks.
 *
 * OWNER: io agent (this is a working baseline).
 */
import { printFilename } from '../../lib/filename.ts'
import { getActiveDoc, uiActions, type PrintJob } from '../../store'
import { fontsReady } from '../../templates'

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Wait until the print copy is mounted, fonts are loaded and pagination has settled. */
export async function waitForPrintLayout(): Promise<void> {
  await frame()
  await fontsReady()
  await frame()
  await frame()
}

let restoreTitle: string | null = null

function onAfterPrint() {
  if (restoreTitle !== null) document.title = restoreTitle
  restoreTitle = null
  uiActions.endPrint()
}

/**
 * Open the browser print dialog for a resume or cover letter (defaults to the active resume).
 * The document title becomes e.g. "Aarav_Mehta_Resume", which browsers use as the PDF file name.
 */
export async function printDocument(job: PrintJob = { target: 'resume' }): Promise<void> {
  const data = job.data ?? getActiveDoc()?.data
  if (!data) return
  restoreTitle ??= document.title
  document.title = printFilename(data.basics.name, job.target === 'letter' ? 'Cover_Letter' : 'Resume')
  window.removeEventListener('afterprint', onAfterPrint)
  window.addEventListener('afterprint', onAfterPrint, { once: true })
  uiActions.startPrint(job)
  await waitForPrintLayout()
  window.print()
}
