/**
 * Live preview column: zoom toolbar + the active resume (or cover letter while the Cover letter
 * panel is open) as real pages. Click a block to jump to its fields. OWNER: shell agent.
 */
import { Maximize2, Minus, Plus } from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { paperSize } from '../lib/templateData.ts'
import { focusField, uiActions, useActiveDoc, useUiStore, ZOOM_LIMITS } from '../store'
import { PagedDocument, getTemplate, type LayoutInfo } from '../templates'
import { IconButton } from '../ui'
import { CoverLetterDocument } from './lazy.ts'

const PAD = 48

export function PreviewPane() {
  const doc = useActiveDoc()
  const panel = useUiStore((s) => s.panel)
  const zoom = useUiStore((s) => s.zoom)
  const pages = useUiStore((s) => s.pageCount)
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const onLayout = useCallback((info: LayoutInfo) => uiActions.setPageCount(info.pages), [])
  if (!doc) return null

  const paper = paperSize(doc.design.paper)
  const fit = width ? Math.max(ZOOM_LIMITS.min, Math.min(1.4, (width - PAD) / paper.widthPx)) : 0.6
  const scale = zoom === 'fit' ? fit : zoom
  const letter = panel === 'cover'
  const step = (d: number) => uiActions.setZoom(Math.round((scale + d) * 10) / 10)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{letter ? 'Cover letter' : getTemplate(doc.design.template).name}</span>
        {!letter && (
          <span>
            · {pages} page{pages === 1 ? '' : 's'} · {paper.label}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton size="xs" icon={Minus} label="Zoom out" onClick={() => step(-ZOOM_LIMITS.step)} disabled={scale <= ZOOM_LIMITS.min} />
          <button type="button" onClick={() => uiActions.setZoom('fit')} className="min-w-12 rounded-md px-1.5 py-1 font-mono tabular-nums hover:bg-slate-100 dark:hover:bg-slate-800" title="Fit to width">
            {Math.round(scale * 100)}%
          </button>
          <IconButton size="xs" icon={Plus} label="Zoom in" onClick={() => step(ZOOM_LIMITS.step)} disabled={scale >= ZOOM_LIMITS.max} />
          <IconButton size="xs" icon={Maximize2} label="Fit to width" onClick={() => uiActions.setZoom('fit')} />
        </div>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-auto">
        <div className="flex min-w-fit justify-center px-6 py-6">
          {letter ? (
            <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
              <CoverLetterDocument data={doc.data} design={doc.design} letter={doc.coverLetter} scale={scale} />
            </Suspense>
          ) : (
            <PagedDocument data={doc.data} design={doc.design} scale={scale} onLayout={onLayout} onBlockClick={focusField} />
          )}
        </div>
      </div>
    </div>
  )
}
