import { useEffect, useRef, useState } from 'react'
import { Download, FileJson, FileUp, Printer, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from './store'
import { accents } from './lib/sample'
import type { Resume, TemplateId } from './lib/types'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { ScoreCard } from './components/ScoreCard'

const templates: { id: TemplateId; name: string }[] = [
  { id: 'modern', name: 'Modern' },
  { id: 'classic', name: 'Classic' },
  { id: 'minimal', name: 'Minimal' },
]

const PAGE_W = 794

export default function App() {
  const resume = useStore((s) => s.resume)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const loadResume = useStore((s) => s.loadResume)
  const loadSample = useStore((s) => s.loadSample)
  const clear = useStore((s) => s.clear)
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const [scale, setScale] = useState(0.7)
  const [height, setHeight] = useState(1123)
  const [toast, setToast] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    const page = pageRef.current
    if (!frame || !page) return
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, frame.clientWidth / PAGE_W))
      setHeight(page.offsetHeight)
    })
    ro.observe(frame)
    ro.observe(page)
    return () => ro.disconnect()
  }, [mobileTab])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    document.title = resume.basics.name ? `${resume.basics.name} — Resume · ResumeForge` : 'ResumeForge — Resume Builder'
  }, [resume.basics.name])

  function exportJSON() {
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `${(resume.basics.name || 'resume').replace(/\s+/g, '-').toLowerCase()}.json` })
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJSON(file: File) {
    try {
      const data = JSON.parse(await file.text()) as Resume
      if (!data || typeof data !== 'object' || !data.basics) throw new Error('missing basics')
      loadResume(data)
      setToast('Resume imported')
    } catch {
      setToast('That file is not a valid ResumeForge JSON export')
    }
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-slate-100 print:hidden">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-indigo-600 to-fuchsia-500 text-white shadow">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="leading-none font-extrabold">ResumeForge</p>
                <p className="text-[11px] text-slate-500">ATS-friendly resumes in minutes</p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Template">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={settings.template === t.id}
                    onClick={() => setSettings({ template: t.id })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${settings.template === t.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Accent colour">
                {accents.map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={settings.accent === a}
                    aria-label={`Accent ${a}`}
                    onClick={() => setSettings({ accent: a })}
                    className={`h-6 w-6 rounded-full border-2 transition ${settings.accent === a ? 'scale-110 border-slate-900' : 'border-white shadow'}`}
                    style={{ backgroundColor: a }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-700"
              >
                <Printer className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-4 py-1.5 text-xs lg:px-6">
            <ToolbarButton icon={Download} label="Export JSON" onClick={exportJSON} />
            <ToolbarButton icon={FileUp} label="Import JSON" onClick={() => fileRef.current?.click()} />
            <ToolbarButton icon={RotateCcw} label="Load sample" onClick={() => confirm('Replace your resume with the sample?') && (loadSample(), setToast('Sample loaded'))} />
            <ToolbarButton icon={Trash2} label="Start blank" onClick={() => confirm('Clear everything and start from scratch?') && (clear(), setToast('Cleared — start typing!'))} />
            <span className="ml-auto hidden items-center gap-1 text-slate-400 sm:flex">
              <FileJson className="h-3.5 w-3.5" /> Auto-saved in your browser
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJSON(f)
                e.target.value = ''
              }}
            />
          </div>
          <div className="grid grid-cols-2 border-t border-slate-100 lg:hidden">
            {(['edit', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMobileTab(t)}
                className={`py-2.5 text-sm font-bold capitalize ${mobileTab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <main className="grid flex-1 gap-6 p-4 lg:grid-cols-[minmax(380px,520px)_1fr] lg:p-6">
          <div className={`space-y-3 ${mobileTab === 'edit' ? '' : 'hidden'} lg:block`}>
            <ScoreCard />
            <Editor />
          </div>
          <div className={`${mobileTab === 'preview' ? '' : 'hidden'} lg:block`}>
            <div className="lg:sticky lg:top-32">
              <div ref={frameRef} className="mx-auto w-full max-w-[794px]" style={{ height: height * scale }}>
                <div ref={pageRef} className="origin-top-left" style={{ width: PAGE_W, transform: `scale(${scale})` }}>
                  <Preview resume={resume} settings={settings} />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">A4 preview · use “Download PDF” and choose “Save as PDF” in the print dialog</p>
            </div>
          </div>
        </main>
      </div>

      <div className="hidden print:block">
        <Preview resume={resume} settings={settings} />
      </div>

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl print:hidden">
          {toast}
        </div>
      )}
    </>
  )
}

function ToolbarButton({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
