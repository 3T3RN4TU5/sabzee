/**
 * Template QA lab — #/lab (unlinked). Renders any template with any fixture and design option, so
 * template authors (and Playwright scripts) can deep-link straight to a state:
 *
 *   #/lab?t=modern&s=kitchen&photo=1&letter=0&paper=a4&accent=0f766e&font=auto&hc=auto&size=13&scale=0.8
 *   #/lab?grid=1&s=developer        every template's first page side by side
 *
 *   t      template id (default modern)          s      developer | researcher | kitchen | minimal | blank
 *   photo  1 = generated placeholder photo        letter 1 = cover-letter mode
 *   paper  a4 | letter                            accent hex without '#'
 *   font   FontId | auto                          hc     auto | upper | normal
 *   size   base font px                           scale  preview scale (default 0.8)
 *   shape  circle | rounded | square              icons  0 = hide contact icons
 *
 * The document root exposes data-pages, data-overflow and data-template for automated checks.
 * OWNER: shell agent (keep the URL parameters stable — template agents rely on them).
 */
import { useMemo } from 'react'
import { defaultDesign, normalizeDesign } from '../lib/design.ts'
import { kitchenSinkData, minimalData } from '../lib/fixtures.ts'
import { blankData, developerSample, researcherSample } from '../lib/samples.ts'
import type { CoverLetter, Design, ResumeData } from '../lib/types.ts'
import { emptyCoverLetter } from '../lib/normalize.ts'
import { navigate } from '../store'
import { PagedDocument, TEMPLATES, TemplateThumbnail, type Block } from '../templates'
import { Rich } from '../templates'

const SAMPLES: Record<string, () => ResumeData> = { developer: developerSample, researcher: researcherSample, kitchen: kitchenSinkData, minimal: minimalData, blank: blankData }

const LETTER: CoverLetter = {
  ...emptyCoverLetter,
  recipient: 'Priya Sharma',
  recipientTitle: 'Head of Data Science',
  company: 'Acme Analytics',
  date: '2026-10-01',
  role: 'Lead ML Scientist',
  greeting: 'Dear Ms. Sharma,',
  body: 'I am excited to apply for the **Lead ML Scientist** role at Acme Analytics.\n\nAt Kestrel Logistics I lead a team of 9 building forecasting models for 4,000+ hubs.\n\nI would welcome the chance to talk.',
}

function placeholderPhoto(): string {
  if (typeof document === 'undefined') return ''
  const c = document.createElement('canvas')
  c.width = c.height = 240
  const g = c.getContext('2d')
  if (!g) return ''
  g.fillStyle = '#f2c6a0'
  g.fillRect(0, 0, 240, 240)
  g.fillStyle = '#7a4a2a'
  g.beginPath()
  g.ellipse(120, 100, 52, 62, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#334155'
  g.fillRect(40, 168, 160, 80)
  return c.toDataURL('image/png')
}

function letterBlocksFor(letter: CoverLetter): Block[] {
  return [
    { key: 'greeting', gap: 'entry', node: <div style={{ fontWeight: 600 }}>{letter.greeting}</div> },
    ...letter.body.split(/\n\s*\n/).map((p, i): Block => ({ key: `p${i}`, gap: 'entry', node: <Rich as="p" text={p} /> })),
    { key: 'close', gap: 'none', node: <div>Sincerely,</div> },
  ]
}

export function TemplateLab({ params }: { params: Record<string, string> }) {
  const sample = params.s && SAMPLES[params.s] ? params.s : 'kitchen'
  const photo = params.photo === '1'
  const data = useMemo(() => {
    const d = SAMPLES[sample]()
    return photo ? { ...d, basics: { ...d.basics, photo: placeholderPhoto() } } : d
  }, [sample, photo])
  const design: Design = useMemo(
    () =>
      normalizeDesign({
        ...defaultDesign,
        template: params.t ?? 'modern',
        paper: params.paper,
        accent: params.accent ? `#${params.accent}` : undefined,
        font: params.font,
        headingCase: params.hc,
        fontSize: params.size ? Number(params.size) : undefined,
        photoShape: params.shape,
        showIcons: params.icons !== '0',
      }),
    [params.t, params.paper, params.accent, params.font, params.hc, params.size, params.shape, params.icons],
  )
  const letter = useMemo(() => (params.letter === '1' ? letterBlocksFor(LETTER) : null), [params.letter])
  const scale = Number(params.scale) || 0.8
  const set = (patch: Record<string, string>) => navigate({ name: 'lab', params: { ...params, ...patch } })

  return (
    <div className="min-h-dvh bg-slate-200 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white/95 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/95">
        <strong className="mr-2 text-sm">Template lab</strong>
        <select value={design.template} onChange={(e) => set({ t: e.target.value, grid: '0' })} className="rounded border px-1 py-0.5 dark:bg-slate-800" aria-label="Template">
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={sample} onChange={(e) => set({ s: e.target.value })} className="rounded border px-1 py-0.5 dark:bg-slate-800" aria-label="Sample">
          {Object.keys(SAMPLES).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        {(
          [
            ['photo', 'Photo'],
            ['letter', 'Letter'],
            ['grid', 'Grid'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={params[k] === '1'} onChange={(e) => set({ [k]: e.target.checked ? '1' : '0' })} /> {label}
          </label>
        ))}
        <select value={design.paper} onChange={(e) => set({ paper: e.target.value })} className="rounded border px-1 py-0.5 dark:bg-slate-800" aria-label="Paper">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
        <span className="ml-auto text-slate-500">{TEMPLATES.length} templates registered</span>
      </div>
      {params.grid === '1' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 p-6">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => set({ t: t.id, grid: '0' })} className="text-left">
              <TemplateThumbnail data={data} design={design} templateId={t.id} width={250} />
              <span className="mt-1 block text-sm font-semibold">
                {t.name} <span className="font-normal text-slate-500">· {t.id}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex justify-center p-6">
          <PagedDocument data={data} design={design} letter={letter} scale={scale} />
        </div>
      )}
    </div>
  )
}
