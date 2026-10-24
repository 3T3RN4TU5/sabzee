/**
 * Live preview column: template quick-switch, page indicator, zoom (fit / presets / ± / Ctrl+wheel)
 * and the active resume (or the cover letter while the Cover letter panel is open) as real pages.
 * Click a block to jump to its fields. OWNER: shell agent.
 */
import { AlertTriangle, ChevronDown, LayoutTemplate, Maximize2, Minus, Plus } from 'lucide-react'
import { Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { fitScale, stepZoom, ZOOM_PRESETS } from '../lib/shell.ts'
import { paperSize } from '../lib/templateData.ts'
import { focusField, resumeActions, uiActions, useActiveDoc, useUiStore, ZOOM_LIMITS } from '../store'
import { getTemplate, PagedDocument, TEMPLATES, type LayoutInfo } from '../templates'
import { cn, IconButton, Menu } from '../ui'
import { CoverLetterDocument } from './lazy.ts'

const PAD = 48

/**
 * While the preview is hidden (mobile Edit tab) it only follows the document after typing pauses,
 * so it is not re-rendered and re-measured on every keystroke — the page count stays fresh for the
 * ATS check and the Design panel. Visible again → it catches up immediately.
 */
function useIdleValue<T>(value: T, hidden: boolean, delay = 900): T {
  const [idle, setIdle] = useState(value)
  useEffect(() => {
    if (!hidden) return
    const t = setTimeout(() => setIdle(value), delay)
    return () => clearTimeout(t)
  }, [value, hidden, delay])
  return hidden ? idle : value
}

export function PreviewPane({ hidden = false }: { hidden?: boolean }) {
  const doc = useIdleValue(useActiveDoc(), hidden)
  const panel = useUiStore((s) => s.panel)
  const zoom = useUiStore((s) => s.zoom)
  const pages = useUiStore((s) => s.pageCount)
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [overflow, setOverflow] = useState(false)
  const [current, setCurrent] = useState(1)
  // Keep typing responsive: the preview renders a deferred copy of the document.
  const data = useDeferredValue(doc?.data)
  const design = useDeferredValue(doc?.design)
  const letterData = useDeferredValue(doc?.coverLetter)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const paper = paperSize(design?.paper ?? 'a4')
  const fit = fitScale(width, paper.widthPx, width < 640 ? 24 : PAD, ZOOM_LIMITS)
  const scale = zoom === 'fit' ? fit : zoom
  const scaleRef = useRef(scale)
  useEffect(() => {
    scaleRef.current = scale
  })

  // Ctrl/⌘ + wheel zooms the preview (instead of the whole page).
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      uiActions.setZoom(Math.round(scaleRef.current * (1 - Math.max(-0.25, Math.min(0.25, e.deltaY * 0.0025))) * 100) / 100)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Current page from the scroll position.
  useEffect(() => {
    const el = box.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const top = el.getBoundingClientRect().top + el.clientHeight / 3
        const list = Array.from(el.querySelectorAll<HTMLElement>('.rf-viewport .rf-page[data-page]'))
        let page = 1
        for (const p of list) if (p.getBoundingClientRect().top <= top) page = Number(p.dataset.page) || page
        setCurrent(page)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  const onLayout = useCallback((info: LayoutInfo) => {
    uiActions.setPageCount(info.pages)
    setOverflow(info.overflow)
  }, [])

  if (!doc || !data || !design || !letterData) return null
  const letter = panel === 'cover'
  const tpl = getTemplate(design.template)
  const pct = Math.round(scale * 100)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* relative z-20: backdrop-blur creates a stacking context — without it the menus open behind the (transformed) pages. */}
      <div className="relative z-20 flex shrink-0 items-center gap-1 border-b border-slate-200/80 bg-white/80 px-2 py-1.5 text-xs text-slate-500 backdrop-blur sm:px-3 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        {letter ? (
          <span className="px-1.5 font-semibold text-slate-700 dark:text-slate-200">Cover letter · {tpl.name}</span>
        ) : (
          <Menu
            align="left"
            width="w-72"
            label="Templates"
            trigger={(p) => (
              <button type="button" {...p} className="flex max-w-[11rem] min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 sm:max-w-none dark:text-slate-200 dark:hover:bg-slate-800" aria-label={`Template: ${tpl.name}. Change template`}>
                <LayoutTemplate className="size-3.5 shrink-0 text-indigo-500" aria-hidden />
                <span className="truncate">{tpl.name}</span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
              </button>
            )}
            items={[
              { heading: 'Switch template' },
              ...TEMPLATES.map((t) => ({
                key: t.id,
                label: t.name,
                description: t.tags.slice(0, 3).join(' · '),
                checked: t.id === design.template,
                onSelect: () => resumeActions.updateDesign({ template: t.id }, null),
              })),
              'separator',
              { key: 'browse', icon: LayoutTemplate, label: 'Browse with previews…', onSelect: () => (uiActions.setPanel('design'), uiActions.setMobileTab('edit')) },
            ]}
          />
        )}
        {!letter && (
          <span className="flex min-w-0 items-center gap-1.5 truncate tabular-nums" aria-live="polite">
            <span className="hidden sm:inline">·</span>
            <span title={`${pages} page${pages === 1 ? '' : 's'}, ${paper.label}`}>
              {pages > 1 ? `Page ${Math.min(current, pages)} / ${pages}` : '1 page'}
              <span className="hidden sm:inline"> · {paper.label}</span>
            </span>
          </span>
        )}
        {!letter && overflow && (
          <span className="flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" title="An entry is taller than a page and is cut off. Split it into shorter entries or reduce the font size.">
            <AlertTriangle className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Clipped</span>
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <IconButton size="xs" icon={Minus} label="Zoom out" onClick={() => uiActions.setZoom(stepZoom(scale, -1, ZOOM_LIMITS))} disabled={scale <= ZOOM_LIMITS.min + 1e-6} />
          <Menu
            width="w-40"
            label="Zoom"
            trigger={(p) => (
              <button type="button" {...p} className="min-w-12 rounded-md px-1.5 py-1 font-mono font-semibold text-slate-600 tabular-nums hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Zoom ${pct}%. Change zoom`}>
                {pct}%
              </button>
            )}
            items={[
              { key: 'fit', icon: Maximize2, label: 'Fit width', checked: zoom === 'fit', onSelect: () => uiActions.setZoom('fit') },
              'separator',
              ...ZOOM_PRESETS.map((z) => ({ key: String(z), label: `${Math.round(z * 100)}%`, checked: zoom === z, onSelect: () => uiActions.setZoom(z) })),
            ]}
          />
          <IconButton size="xs" icon={Plus} label="Zoom in" onClick={() => uiActions.setZoom(stepZoom(scale, 1, ZOOM_LIMITS))} disabled={scale >= ZOOM_LIMITS.max - 1e-6} />
          <IconButton size="xs" icon={Maximize2} label="Fit to width" aria-pressed={zoom === 'fit'} onClick={() => uiActions.setZoom('fit')} className={cn('hidden sm:inline-flex', zoom === 'fit' && 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30')} />
        </div>
      </div>
      <div ref={box} className="rf-scroll min-h-0 flex-1 overflow-auto" id="preview-pane" tabIndex={-1} aria-label="Resume preview">
        <div className="flex min-w-fit justify-center px-3 py-5 sm:px-6 sm:py-6">
          {letter ? (
            <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
              <CoverLetterDocument data={data} design={design} letter={letterData} scale={scale} />
            </Suspense>
          ) : (
            <PagedDocument data={data} design={design} scale={scale} onLayout={onLayout} onBlockClick={focusField} />
          )}
        </div>
      </div>
    </div>
  )
}
