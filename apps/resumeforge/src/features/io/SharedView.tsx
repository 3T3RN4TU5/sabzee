/**
 * Read-only view for share links (#/view/<payload>). OWNER: io agent (working baseline).
 */
import { ArrowLeft, Copy, Printer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { decodeShare } from '../../lib/share.ts'
import { paperSize } from '../../lib/templateData.ts'
import { navigate, resumeActions, toast, uiActions } from '../../store'
import { PagedDocument } from '../../templates'
import { Button } from '../../ui'
import { printDocument } from './print.ts'

export interface SharedViewProps {
  /** The encoded payload after '#/view/'. */
  payload: string
}

export function SharedView({ payload }: SharedViewProps) {
  const shared = useMemo(() => decodeShare(payload), [payload])
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!shared) return
    uiActions.setPrintSource({ target: 'resume', data: shared.data, design: shared.design })
    document.title = shared.data.basics.name ? `${shared.data.basics.name} — Resume` : 'Shared resume · ResumeForge'
    return () => uiActions.setPrintSource(null)
  }, [shared])

  if (!shared) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-100 p-6 dark:bg-slate-950">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">This share link is invalid or incomplete</h1>
          <p className="mt-2 text-sm text-slate-500">Ask the sender to copy the link again.</p>
          <Button className="mt-5" variant="primary" onClick={() => navigate({ name: 'dashboard' })}>
            Open ResumeForge
          </Button>
        </div>
      </div>
    )
  }

  const paper = paperSize(shared.design.paper)
  const scale = Math.min(1.25, Math.max(0.3, (width - 32) / paper.widthPx))

  return (
    <div className="min-h-dvh bg-slate-200/70 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate({ name: 'dashboard' })}>
          ResumeForge
        </Button>
        <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{shared.data.basics.name || 'Shared resume'}</span>
        <div className="ml-auto flex gap-2">
          <Button
            icon={Copy}
            onClick={() => {
              const id = resumeActions.importDoc({ format: 'resumeforge', name: `${shared.data.basics.name || 'Shared'} (shared)`, data: shared.data, design: shared.design })
              toast('Copied into your resumes', 'success')
              navigate({ name: 'edit', id })
            }}
          >
            Make a copy
          </Button>
          <Button variant="primary" icon={Printer} onClick={() => void printDocument({ target: 'resume', data: shared.data, design: shared.design })}>
            PDF
          </Button>
        </div>
      </header>
      <div ref={box} className="mx-auto flex max-w-5xl justify-center px-4 py-6">
        <PagedDocument data={shared.data} design={shared.design} mode="preview" scale={scale} />
      </div>
    </div>
  )
}
