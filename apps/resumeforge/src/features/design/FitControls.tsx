/**
 * Design panel "Fit to N pages": measures the active resume with an off-screen <PagedDocument>
 * (same renderer and pagination as the preview), suggests tightening when the last page is nearly
 * empty, and searches lib/fit.ts candidates (spacing → line height → font size → margins) for the
 * least change that drops the page count. The result is applied as ONE undoable design change.
 * OWNER: shell agent.
 */
import { Loader2, Minimize2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MM_TO_PX } from '../../lib/design.ts'
import { describeFit, fitCandidates, firstFitting, fitPatch, lastPageNearlyEmpty } from '../../lib/fit.ts'
import type { Design, ResumeData } from '../../lib/types.ts'
import { resumeActions, toast } from '../../store'
import { PagedDocument, type LayoutInfo } from '../../templates'
import { Button, cn } from '../../ui'

interface ProbeResult {
  pages: number
  /** Share (0–1) of the last page's usable height that holds content. */
  fill: number | null
}

const PROBE_SCALE = 0.25

/** Used height of the last rendered page as a share of its usable height (top of content → bottom margin). */
function measureLastPageFill(root: HTMLElement, marginMm: number): number | null {
  const pages = root.querySelectorAll<HTMLElement>('.rf-page[data-page]')
  const last = pages[pages.length - 1]
  if (!last) return null
  const page = last.getBoundingClientRect()
  if (!page.height) return null
  const blocks = Array.from(last.querySelectorAll<HTMLElement>('[data-rf-block]')).map((b) => b.getBoundingClientRect())
  if (!blocks.length) return 0
  const scale = page.height / (last.offsetHeight || page.height)
  const top = Math.min(...blocks.map((b) => b.top))
  const bottom = Math.max(...blocks.map((b) => b.bottom))
  const usable = page.bottom - marginMm * MM_TO_PX * scale - top
  return usable > 0 ? Math.max(0, Math.min(1, (bottom - top) / usable)) : null
}

/** Invisible, non-interactive render of a resume that reports its page count and last-page fill. */
function LayoutProbe({ data, design, onResult }: { data: ResumeData; design: Design; onResult: (r: ProbeResult) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const pages = useRef<number | null>(null)
  const cb = useRef(onResult)
  useEffect(() => {
    cb.current = onResult
  })
  const raf = useRef(0)
  const report = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      if (box.current && pages.current !== null) cb.current({ pages: pages.current, fill: measureLastPageFill(box.current, design.margin) })
    })
  }, [design.margin])
  const onLayout = useCallback(
    (info: LayoutInfo) => {
      pages.current = info.pages
      report()
    },
    [report],
  )
  useEffect(() => {
    const el = box.current
    if (!el) return
    const mo = new MutationObserver(report)
    mo.observe(el, { subtree: true, childList: true, characterData: true, attributes: true })
    return () => {
      mo.disconnect()
      cancelAnimationFrame(raf.current)
    }
  }, [report])
  return (
    <div ref={box} aria-hidden="true" inert className="pointer-events-none fixed top-0 -left-[20000px] invisible" data-fit-probe="">
      <PagedDocument data={data} design={design} mode="thumbnail" scale={PROBE_SCALE} onLayout={onLayout} />
    </div>
  )
}

interface Trial {
  id: number
  design: Design
  resolve: (pages: number) => void
}

export function FitControls({ data, design }: { data: ResumeData; design: Design }) {
  const [status, setStatus] = useState<ProbeResult | null>(null)
  const [trial, setTrial] = useState<Trial | null>(null)
  const [busy, setBusy] = useState(false)
  const seq = useRef(0)
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  /** Render `candidate` off-screen and resolve with its page count (Infinity on timeout). */
  const probe = (candidate: Design) =>
    new Promise<number>((resolve) => {
      let done = false
      const finish = (n: number) => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(n)
      }
      const timer = setTimeout(() => finish(Infinity), 4000)
      setTrial({ id: ++seq.current, design: candidate, resolve: finish })
    })

  const fit = async (target: number) => {
    if (busy) return
    setBusy(true)
    const start = design
    try {
      await document.fonts?.ready
      const list = fitCandidates(start)
      const at = await firstFitting(list.length, async (i) => (await probe(list[i])) <= target)
      if (!mounted.current) return
      if (at < 0) {
        toast(`Can’t fit on ${target} page${target === 1 ? '' : 's'} even at the tightest settings — shorten or hide some content.`, 'info', { duration: 6000 })
        return
      }
      const best = list[at]
      resumeActions.updateDesign(fitPatch(start, best), null)
      toast(`Fitted to ${target} page${target === 1 ? '' : 's'}: ${describeFit(start, best)}`, 'success', { duration: 7000, action: { label: 'Undo', onClick: () => resumeActions.undo() } })
    } finally {
      if (mounted.current) {
        setTrial(null)
        setBusy(false)
      }
    }
  }

  const pages = status?.pages ?? 0
  const nearlyEmpty = status ? lastPageNearlyEmpty(status.pages, status.fill) : false
  const pct = status?.fill != null ? Math.max(1, Math.round(status.fill * 100)) : null

  return (
    <div className={cn('mb-4 rounded-xl px-3 py-2.5 text-xs ring-1', nearlyEmpty ? 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30' : 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-700')} aria-live="polite">
      {/* Current layout (re-measured as you change the design) */}
      <LayoutProbe data={data} design={design} onResult={setStatus} />
      {trial && <LayoutProbe key={trial.id} data={data} design={trial.design} onResult={(r) => trial.resolve(r.pages)} />}
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto min-w-0">
          {!status ? (
            'Measuring pages…'
          ) : pages <= 1 ? (
            <>Fits on <strong>1 page</strong>.</>
          ) : nearlyEmpty ? (
            <>
              <strong>Page {pages} is only {pct}% full.</strong> Tighten the layout to save a page?
            </>
          ) : (
            <>
              <strong>{pages} pages</strong>
              {pct !== null && <> · last page {pct}% full</>}
            </>
          )}
        </p>
        {pages > 1 && (
          <Button size="xs" variant={nearlyEmpty ? 'primary' : 'subtle'} icon={busy ? Loader2 : Minimize2} disabled={busy} onClick={() => void fit(pages - 1)} title="Reduces spacing, then line height, font size and margins — as little as needed. Undo restores your settings.">
            Fit to {pages - 1} page{pages - 1 === 1 ? '' : 's'}
          </Button>
        )}
        {pages > 2 && (
          <Button size="xs" variant="ghost" disabled={busy} onClick={() => void fit(1)}>
            Fit to 1 page
          </Button>
        )}
      </div>
    </div>
  )
}
