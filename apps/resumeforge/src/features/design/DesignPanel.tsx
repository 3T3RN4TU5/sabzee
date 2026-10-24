/**
 * Design side-panel tab: template gallery (live thumbnails + tag filters), accent presets + custom
 * hex, font pairings (previewed in their own fonts, loaded on demand), size/spacing/margin sliders,
 * headings, dates, paper, photo & icons, reset to template defaults. OWNER: shell agent.
 */
import { Check, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ACCENT_PRESETS, DATE_FORMATS, defaultDesign, DESIGN_LIMITS, isHexColor, normalizeHex } from '../../lib/design.ts'
import { FONT_PAIRINGS } from '../../lib/fonts.ts'
import { filterByTag, resetDesignToTemplate, TEMPLATE_FILTERS, type TemplateFilter } from '../../lib/shell.ts'
import type { Design, FontId } from '../../lib/types.ts'
import { resumeActions, toast, useActiveDoc } from '../../store'
import { ensureFont, getTemplate, TEMPLATES, TemplateThumbnail } from '../../templates'
import { Button, cn, inputClass, LazyMount, Segmented, Slider, Toggle } from '../../ui'
import { FitControls } from './FitControls.tsx'

const set = (patch: Partial<Design>, key?: string | null) => resumeActions.updateDesign(patch, key)

function Group({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="mr-auto text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function DesignPanel() {
  const doc = useActiveDoc()
  if (!doc) return null
  const d = doc.design
  const tpl = getTemplate(d.template)
  return (
    <div className="space-y-3 p-3 sm:p-5">
      <TemplateGallery />
      <Group title="Colour">
        <AccentPicker accent={d.accent} templateAccent={tpl.defaultAccent} />
      </Group>
      <Group title="Typography">
        <FontPicker font={d.font} templateFont={tpl.defaultFont} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Slider label="Font size" value={d.fontSize} {...DESIGN_LIMITS.fontSize} unit="px" defaultValue={defaultDesign.fontSize} onChange={(v) => set({ fontSize: v })} />
          <Slider label="Line height" value={d.lineHeight} {...DESIGN_LIMITS.lineHeight} defaultValue={defaultDesign.lineHeight} onChange={(v) => set({ lineHeight: v })} />
        </div>
        <Segmented
          className="mt-4"
          label="Section headings"
          value={d.headingCase}
          onChange={(v) => set({ headingCase: v }, null)}
          options={[
            { value: 'auto', label: 'Template' },
            { value: 'upper', label: 'UPPERCASE' },
            { value: 'normal', label: 'Normal' },
          ]}
        />
      </Group>
      <Group title="Layout">
        <FitControls data={doc.data} design={d} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Spacing" value={d.spacing} {...DESIGN_LIMITS.spacing} unit="×" defaultValue={defaultDesign.spacing} onChange={(v) => set({ spacing: v })} />
          <Slider label="Page margins" value={d.margin} {...DESIGN_LIMITS.margin} unit=" mm" defaultValue={defaultDesign.margin} onChange={(v) => set({ margin: v })} />
        </div>
        <div className="mt-4 grid gap-4">
          <Segmented
            label="Paper"
            value={d.paper}
            onChange={(paper) => set({ paper }, null)}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'US Letter' },
            ]}
          />
          <Segmented label="Dates" value={d.dateFormat} onChange={(dateFormat) => set({ dateFormat }, null)} options={DATE_FORMATS.map((f) => ({ value: f.id, label: f.label }))} />
        </div>
      </Group>
      <Group title="Photo & icons">
        <div className="space-y-4">
          <Toggle label="Show photo" description={tpl.supportsPhoto ? (doc.data.basics.photo ? 'Upload or crop it in Content → Personal details' : 'No photo uploaded yet (Content → Personal details)') : `${tpl.name} has no photo slot — try a template tagged “Photo”.`} checked={d.showPhoto} onChange={(showPhoto) => set({ showPhoto }, null)} />
          <Segmented
            label="Photo shape"
            disabled={!d.showPhoto}
            value={d.photoShape}
            onChange={(photoShape) => set({ photoShape }, null)}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'square', label: 'Square' },
            ]}
          />
          <Toggle label="Contact icons" description="Small icons next to email, phone and links" checked={d.showIcons} onChange={(showIcons) => set({ showIcons }, null)} />
        </div>
      </Group>
      <div className="flex justify-center pb-4">
        <Button
          variant="ghost"
          icon={RotateCcw}
          onClick={() => {
            resumeActions.replaceData(doc.data, resetDesignToTemplate(d, tpl))
            toast(`Reset to ${tpl.name} defaults`, 'success', { action: { label: 'Undo', onClick: () => resumeActions.undo() } })
          }}
        >
          Reset to template defaults
        </Button>
      </div>
    </div>
  )
}

function TemplateGallery() {
  const doc = useActiveDoc()
  const [filter, setFilter] = useState<TemplateFilter>('All')
  const shown = filterByTag(TEMPLATES, filter)
  const design = doc?.design
  const designs = useMemo(() => {
    if (!design) return {}
    return Object.fromEntries(TEMPLATES.map((t) => [t.id, { ...design, template: t.id }])) as Record<string, Design>
  }, [design])
  if (!doc) return null
  const current = doc.design.template
  return (
    <Group title="Template" action={<span className="text-xs text-slate-500 dark:text-slate-400">{getTemplate(current).name}</span>}>
      <div className="-mx-1 mb-3 flex flex-wrap gap-1 px-1" role="group" aria-label="Filter templates">
        {TEMPLATE_FILTERS.map((f) => {
          const n = filterByTag(TEMPLATES, f).length
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn('rounded-full px-2.5 py-1 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', filter === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}
            >
              {f} <span className="opacity-60">{n}</span>
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Template">
        {shown.map((t) => {
          const on = t.id === current
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ template: t.id }, null)}
              className={cn('group relative min-w-0 rounded-xl p-1.5 text-left ring-1 transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', on ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 hover:ring-indigo-300 dark:ring-slate-700')}
              title={t.description}
            >
              <LazyMount className="aspect-[210/297] w-full overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-900/5">{(w) => <TemplateThumbnail data={doc.data} design={designs[t.id]} templateId={t.id} width={w} />}</LazyMount>
              <span className="mt-1.5 block truncate px-0.5 text-xs font-bold text-slate-900 dark:text-white">{t.name}</span>
              <span className="block truncate px-0.5 text-[11px] text-slate-500 dark:text-slate-400">{t.tags.slice(0, 2).join(' · ')}</span>
              {on && (
                <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-indigo-600 text-white shadow">
                  <Check className="size-3.5" aria-hidden />
                </span>
              )}
            </button>
          )
        })}
        {shown.length === 0 && <p className="col-span-full py-4 text-center text-sm text-slate-500">No templates with this tag yet.</p>}
      </div>
    </Group>
  )
}

function AccentPicker({ accent, templateAccent }: { accent: string; templateAccent: string }) {
  const [draft, setHex] = useState<string | null>(null)
  const hex = draft ?? accent
  const presets = ACCENT_PRESETS.includes(templateAccent) ? ACCENT_PRESETS : [templateAccent, ...ACCENT_PRESETS]
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent colour">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={accent === c}
            onClick={() => set({ accent: c }, null)}
            aria-label={`Accent ${c}${c === templateAccent ? ' (template default)' : ''}`}
            title={c === templateAccent ? `${c} — template default` : c}
            className={cn('relative grid size-8 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-white transition outline-none focus-visible:ring-indigo-500 dark:ring-offset-slate-900', accent === c ? 'ring-slate-900 dark:ring-white' : 'ring-transparent hover:scale-110')}
            style={{ background: c }}
          >
            {accent === c && <Check className="size-4 text-white mix-blend-difference" aria-hidden />}
            {c === templateAccent && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-white ring-2 ring-slate-300 dark:ring-slate-600" aria-hidden />}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" style={{ background: accent }} title="Pick any colour">
          <input type="color" value={accent} onChange={(e) => set({ accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Custom accent colour" />
        </label>
        <input
          value={hex}
          onChange={(e) => {
            setHex(e.target.value)
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            if (isHexColor(v)) set({ accent: normalizeHex(v) })
          }}
          onBlur={() => setHex(null)}
          spellCheck={false}
          maxLength={7}
          aria-label="Accent hex value"
          className={cn(inputClass, 'h-9 w-28 font-mono uppercase', !isHexColor(hex.startsWith('#') ? hex : `#${hex}`) && 'ring-rose-400')}
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">Dark, saturated colours print best.</span>
      </div>
    </div>
  )
}

function FontPicker({ font, templateFont }: { font: FontId | 'auto'; templateFont: FontId }) {
  // Load every pairing's stylesheet so each option previews in its own typeface.
  useEffect(() => FONT_PAIRINGS.forEach((f) => ensureFont(f.id)), [])
  const auto = FONT_PAIRINGS.find((f) => f.id === templateFont)
  const options: { id: FontId | 'auto'; label: string; heading: string; body: string; category: string }[] = [
    { id: 'auto', label: `Template default`, heading: auto?.heading ?? 'inherit', body: auto?.body ?? 'inherit', category: auto?.label ?? '' },
    ...FONT_PAIRINGS.map((f) => ({ id: f.id, label: f.label, heading: f.heading, body: f.body, category: f.category })),
  ]
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Font pairing</div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Font pairing">
        {options.map((o) => {
          const on = o.id === font
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ font: o.id }, null)}
              className={cn('min-w-0 rounded-xl px-3 py-2 text-left ring-1 transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', on ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 hover:ring-indigo-300 dark:ring-slate-700')}
            >
              <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white" style={{ fontFamily: o.heading }}>
                {o.label}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400" style={{ fontFamily: o.body }}>
                {o.id === 'auto' ? o.category : `${o.category} · The quick brown fox`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
