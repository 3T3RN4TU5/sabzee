/**
 * Print / "Save as PDF". The shell's PrintRoot (src/app/PrintRoot.tsx) renders `useUiStore().printing`
 * into a body-level `.rf-print-root` — the only thing visible in print media — with
 * `@page { size: A4 | letter; margin: 0 }` from the design's paper. Pages are rendered unscaled with
 * exact page breaks, so the browser's "Save as PDF" produces a text-based (ATS-readable) PDF with
 * clickable links.
 *
 * OWNER: io agent.
 */
import { printFilename } from '../../lib/filename.ts'
import { getActiveDoc, uiActions, type PrintJob } from '../../store'
import { fontsReady } from '../../templates'

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const printDoc = () => document.querySelector<HTMLElement>('.rf-print-root .rf-doc')

/**
 * Wait until the print copy is mounted (including the lazily loaded cover-letter chunk), web fonts
 * and images are loaded, and pagination has settled (page count stable for 3 frames).
 */
export async function waitForPrintLayout(timeoutMs = 5000): Promise<void> {
  const start = performance.now()
  const timedOut = () => performance.now() - start > timeoutMs
  await frame()
  while (!printDoc() && !timedOut()) await frame()
  await fontsReady()
  const root = printDoc()
  if (root) await Promise.all(Array.from(root.querySelectorAll('img')).map((img) => img.decode().catch(() => undefined)))
  let last = ''
  let stable = 0
  while (stable < 3 && !timedOut()) {
    await frame()
    const pages = printDoc()?.dataset.pages ?? ''
    stable = pages === last ? stable + 1 : 0
    last = pages
  }
}

/** File name the PDF will get ("Aarav_Mehta_Resume"); browsers use document.title for it. */
export function pdfTitle(job: PrintJob = { target: 'resume' }): string {
  const data = job.data ?? getActiveDoc()?.data
  return printFilename(data?.basics.name ?? '', job.target === 'letter' ? 'Cover_Letter' : 'Resume')
}

let restore: (() => void) | null = null

/**
 * Open the browser print dialog for a resume or cover letter (defaults to the active resume).
 * The document title becomes e.g. "Aarav_Mehta_Resume" — the default PDF file name — and is
 * restored (and the print copy unmounted) on `afterprint`. Resolves once `window.print()` returned.
 */
export async function printDocument(job: PrintJob = { target: 'resume' }): Promise<boolean> {
  const data = job.data ?? getActiveDoc()?.data
  if (!data) return false
  restore?.()
  const previousTitle = document.title
  const done = () => {
    window.removeEventListener('afterprint', done)
    if (restore === done) restore = null
    document.title = previousTitle
    uiActions.endPrint()
  }
  restore = done
  document.title = pdfTitle({ ...job, data })
  window.addEventListener('afterprint', done)
  try {
    uiActions.startPrint(job)
    await waitForPrintLayout()
    window.print()
    return true
  } catch (e) {
    done()
    throw e
  }
}
