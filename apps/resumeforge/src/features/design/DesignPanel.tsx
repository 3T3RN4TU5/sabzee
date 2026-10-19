/**
 * Design side-panel tab: template gallery, accent colour, fonts, sizing, dates, paper, photo.
 * OWNER: the shell/design agent — a working baseline using every Design field.
 */
import { Check } from 'lucide-react'
import { ACCENT_PRESETS, DATE_FORMATS, DESIGN_LIMITS } from '../../lib/design.ts'
import { FONT_PAIRINGS } from '../../lib/fonts.ts'
import type { Design, FontId } from '../../lib/types.ts'
import { resumeActions, useActiveDoc } from '../../store'
import { TEMPLATES, TemplateThumbnail } from '../../templates'
import { cn, Select, Toggle } from '../../ui'

export function DesignPanel() {
  const doc = useActiveDoc()
  if (!doc) return null
  const d = doc.design
  const set = (patch: Partial<Design>) => resumeActions.updateDesign(patch)
  return (
    <div className="space-y-6 p-4 sm:p-5">
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Template</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set({ template: t.id })}
              aria-pressed={d.template === t.id}
              className={cn('group relative overflow-hidden rounded-xl bg-white text-left ring-1 transition dark:bg-slate-900', d.template === t.id ? 'ring-2 ring-indigo-500' : 'ring-slate-200 hover:ring-indigo-300 dark:ring-slate-800')}
            >
              <div className="overflow-hidden bg-slate-100 p-2 dark:bg-slate-800">
                <TemplateThumbnail data={doc.data} design={d} templateId={t.id} width={132} className="mx-auto" />
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</p>
                <p className="truncate text-[11px] text-slate-500">{t.tags.join(' · ')}</p>
              </div>
              {d.template === t.id && (
                <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-indigo-600 text-white">
                  <Check className="size-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Accent colour</h2>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => set({ accent: c })} aria-label={`Accent ${c}`} aria-pressed={d.accent === c} className={cn('size-7 rounded-full ring-2 ring-offset-2 transition ring-offset-white dark:ring-offset-slate-950', d.accent === c ? 'ring-slate-900 dark:ring-white' : 'ring-transparent')} style={{ background: c }} />
          ))}
          <input type="color" value={d.accent} onChange={(e) => set({ accent: e.target.value })} className="size-7 cursor-pointer rounded-full border-0 bg-transparent" aria-label="Custom accent colour" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Select label="Font" value={d.font} onValue={(v) => set({ font: v as FontId | 'auto' })} options={[{ value: 'auto', label: 'Template default' }, ...FONT_PAIRINGS.map((f) => ({ value: f.id, label: f.label }))]} />
        <Select label="Date format" value={d.dateFormat} onValue={(v) => set({ dateFormat: v as Design['dateFormat'] })} options={DATE_FORMATS.map((f) => ({ value: f.id, label: f.label }))} />
        <Select label="Headings" value={d.headingCase} onValue={(v) => set({ headingCase: v as Design['headingCase'] })} options={[{ value: 'auto', label: 'Template default' }, { value: 'upper', label: 'UPPERCASE' }, { value: 'normal', label: 'Normal case' }]} />
        <Select label="Paper" value={d.paper} onValue={(v) => set({ paper: v as Design['paper'] })} options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }]} />
      </section>

      <section className="space-y-4">
        <Slider label="Font size" value={d.fontSize} {...DESIGN_LIMITS.fontSize} unit="px" onChange={(v) => set({ fontSize: v })} />
        <Slider label="Line height" value={d.lineHeight} {...DESIGN_LIMITS.lineHeight} onChange={(v) => set({ lineHeight: v })} />
        <Slider label="Spacing" value={d.spacing} {...DESIGN_LIMITS.spacing} unit="×" onChange={(v) => set({ spacing: v })} />
        <Slider label="Page margins" value={d.margin} {...DESIGN_LIMITS.margin} unit="mm" onChange={(v) => set({ margin: v })} />
      </section>

      <section className="space-y-3">
        <Toggle label="Show photo" description="Templates with photo support" checked={d.showPhoto} onChange={(v) => set({ showPhoto: v })} />
        <Select label="Photo shape" value={d.photoShape} onValue={(v) => set({ photoShape: v as Design['photoShape'] })} options={[{ value: 'circle', label: 'Circle' }, { value: 'rounded', label: 'Rounded' }, { value: 'square', label: 'Square' }]} />
        <Toggle label="Contact icons" checked={d.showIcons} onChange={(v) => set({ showIcons: v })} />
      </section>
    </div>
  )
}

function Slider({ label, value, min, max, step, unit = '', onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        <span className="font-mono text-slate-500 tabular-nums">
          {Number(value.toFixed(2))}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-indigo-600" />
    </label>
  )
}
