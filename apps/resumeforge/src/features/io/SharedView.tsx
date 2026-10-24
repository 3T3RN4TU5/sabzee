/**
 * Read-only view for share links (#/view/<payload>): the resume decoded from the URL, rendered with
 * its template, with page navigation, zoom, "Print / PDF" and "Make a copy" (imports it into this
 * browser's ResumeForge). No editor UI. Corrupt or truncated links get a helpful error page.
 * OWNER: io agent.
 */
import { ChevronLeft, ChevronRight, CopyPlus, Eye, Link2Off, Maximize2, Minus, Plus, Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { uniqueName } from '../../lib/ioHelpers.ts'
import { decodeShare } from '../../lib/share.ts'
import { paperSize } from '../../lib/templateData.ts'
import { navigate, resumeActions, toast, uiActions, useResumeStore } from '../../store'
import { getTemplate, PagedDocument, type LayoutInfo } from '../../templates'
import { Button, IconButton } from '../../ui'
import { LogoMark } from '../../app/Logo.tsx'
import { printDocument } from './print.ts'

export interface SharedViewProps {
  /** The encoded payload after '#/view/'. */
  payload: string
}

const ZOOM = { min: 0.3, max: 2, step: 0.1 }
const GAP = 24

export function SharedView({ payload }: SharedViewProps) {
  const shared = useMemo(() => decodeShare(payload), [payload])
  if (!shared) return <BrokenLink />
  return <Viewer key={payload} data={shared.data} design={shared.design} />
}

function Viewer({ data, design }: NonNullable<ReturnType<typeof decodeShare>>) {
  const box = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [pages, setPages] = useState(1)
  const [current, setCurrent] = useState(1)
  const name = data.basics.name.trim()
  const template = getTemplate(design.template)
  const paper = paperSize(design.paper)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    uiActions.setPrintSource({ target: 'resume', data, design })
    const title = document.title
    document.title = name ? `${name} — Resume` : 'Shared resume · ResumeForge'
    return () => {
      uiActions.setPrintSource(null)
      document.title = title
    }
  }, [data, design, name])

  // current page = the last page whose top has scrolled above the upper third of the viewport
  useEffect(() => {
    const onScroll = () => {
      const els = pagesRef.current?.querySelectorAll<HTMLElement>('.rf-page[data-page]')
      if (!els?.length) return
      const line = (header.current?.offsetHeight ?? 0) + window.innerHeight / 3
      let page = 1
      els.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) page = i + 1
      })
      setCurrent(page)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pages, zoom, width])

  const onLayout = useCallback((info: LayoutInfo) => setPages(info.pages), [])
  const fit = width ? Math.max(ZOOM.min, Math.min(1.25, (width - 32) / paper.widthPx)) : 0
  const scale = zoom === 'fit' ? fit : zoom
  const setScale = (s: number) => setZoom(Math.round(Math.min(ZOOM.max, Math.max(ZOOM.min, s)) * 10) / 10)

  const goTo = (page: number) => {
    const el = pagesRef.current?.querySelector<HTMLElement>(`.rf-page[data-page="${page}"]`)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - (header.current?.offsetHeight ?? 0) - 12
    window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    setCurrent(page)
  }

  const makeCopy = () => {
    const taken = useResumeStore.getState().resumes.map((r) => r.name)
    const docName = uniqueName(`${name || 'Shared resume'} (shared)`, taken)
    const id = resumeActions.importDoc({ format: 'resumeforge', name: docName, data, design })
    toast(`Saved “${docName}” to your resumes`, 'success')
    navigate({ name: 'edit', id })
  }

  return (
    <div className="min-h-dvh bg-slate-200/70 dark:bg-slate-950" data-shared-view>
      <header ref={header} className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault()
              navigate({ name: 'dashboard' })
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            title="Open ResumeForge"
          >
            <LogoMark className="size-7" />
            <span className="hidden text-sm font-extrabold tracking-tight text-slate-900 md:inline dark:text-white">ResumeForge</span>
          </a>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name || 'Shared resume'}</h1>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
              <Eye className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                Read-only · {template.name} · {paper.label}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={CopyPlus} onClick={makeCopy} title="Save an editable copy in this browser" aria-label="Make a copy in my ResumeForge">
              <span className="hidden sm:inline">Make a copy</span>
            </Button>
            <Button variant="primary" icon={Printer} onClick={() => void printDocument({ target: 'resume', data, design })} aria-label="Print or save as PDF">
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1 text-xs text-slate-500 sm:px-4 dark:text-slate-400">
            <IconButton size="xs" icon={ChevronLeft} label="Previous page" disabled={current <= 1} onClick={() => goTo(current - 1)} />
            <span className="min-w-20 text-center tabular-nums" aria-live="polite" data-page-indicator>
              Page {Math.min(current, pages)} of {pages}
            </span>
            <IconButton size="xs" icon={ChevronRight} label="Next page" disabled={current >= pages} onClick={() => goTo(current + 1)} />
            <div className="ml-auto flex items-center gap-0.5">
              <IconButton size="xs" icon={Minus} label="Zoom out" onClick={() => setScale(scale - ZOOM.step)} disabled={scale <= ZOOM.min} />
              <button type="button" onClick={() => setZoom('fit')} className="min-w-12 rounded-md px-1.5 py-1 font-mono tabular-nums hover:bg-slate-100 dark:hover:bg-slate-800" title="Fit to width" data-zoom>
                {Math.round(scale * 100)}%
              </button>
              <IconButton size="xs" icon={Plus} label="Zoom in" onClick={() => setScale(scale + ZOOM.step)} disabled={scale >= ZOOM.max} />
              <IconButton size="xs" icon={Maximize2} label="Fit to width" onClick={() => setZoom('fit')} />
            </div>
          </div>
        </div>
      </header>

      <main ref={box} className="overflow-x-auto">
        <div ref={pagesRef} className="flex min-w-fit justify-center px-4 py-6">
          {scale > 0 && <PagedDocument data={data} design={design} mode="preview" scale={scale} pageGap={GAP} onLayout={onLayout} />}
        </div>
      </main>

      <footer className="px-4 pb-10 text-center text-xs text-slate-500 dark:text-slate-400">
        Shared with{' '}
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault()
            navigate({ name: 'dashboard' })
          }}
          className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ResumeForge
        </a>{' '}
        — a free, private resume builder. This copy lives only in the link; nothing is stored on a server.
      </footer>
    </div>
  )
}

function BrokenLink() {
  useEffect(() => {
    const title = document.title
    document.title = 'Broken share link · ResumeForge'
    return () => {
      document.title = title
    }
  }, [])
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 p-6 dark:bg-slate-950" data-shared-error>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          <Link2Off className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">This share link doesn’t work</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The resume is stored inside the link itself, and part of it is missing or damaged.</p>
        <ul className="mt-4 space-y-1.5 text-left text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" />
            Some email and chat apps cut long links — ask the sender to send it again, or to share the PDF.
          </li>
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" />
            If you copied it by hand, make sure you got the whole address.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => navigate({ name: 'dashboard' })}>
            Open ResumeForge
          </Button>
          <Button onClick={() => navigate({ name: 'edit', id: resumeActions.createResume('blank') })}>Create your own resume</Button>
        </div>
      </div>
    </div>
  )
}
