/**
 * Content editor ("Content" side-panel tab) — a generic, KIND_SPECS-driven baseline that shows how to
 * use the store and the focus mechanism (useFieldFocus / useRevealOnFocus).
 * OWNER: the editor/shell agent — replace freely (drag & drop, rich bullets, photo crop …).
 */
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, ImagePlus, Lightbulb, Plus, Trash2, X } from 'lucide-react'
import { Suspense, useState, type ReactNode } from 'react'
import { canAddSection } from '../../lib/ops.ts'
import { ADDABLE_KINDS, entryLabel, KIND_SPECS, type FieldSpec } from '../../lib/sections.ts'
import type { Basics, ColumnPlacement, Entry, Section } from '../../lib/types.ts'
import { confirmDialog, focusField, resumeActions, toast, useActiveDoc, useFieldFocus, useRevealOnFocus } from '../../store'
import { BulletHelper } from '../../app/lazy.ts'
import { Button, cn, IconButton, Menu, Select, TextArea, TextField } from '../../ui'

export function ContentEditor() {
  const doc = useActiveDoc()
  if (!doc) return null
  const { data } = doc
  return (
    <div className="space-y-3 p-4 sm:p-5">
      <BasicsCard basics={data.basics} />
      {data.sections.map((s, i) => (
        <SectionCard key={s.id} section={s} index={i} count={data.sections.length} />
      ))}
      <Menu
        align="left"
        width="w-72"
        trigger={(p) => (
          <Button icon={Plus} className="w-full" {...p}>
            Add section
          </Button>
        )}
        items={ADDABLE_KINDS.map((k) => ({
          key: k,
          label: KIND_SPECS[k].label,
          description: KIND_SPECS[k].description,
          disabled: !canAddSection(data, k),
          onSelect: () => {
            const id = resumeActions.addSection(k)
            focusField({ sectionId: id })
          },
        }))}
      />
    </div>
  )
}

function Card({ children, className, innerRef }: { children: ReactNode; className?: string; innerRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={innerRef} className={cn('rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800', className)}>
      {children}
    </div>
  )
}

/* ---------------- basics ---------------- */

const BASIC_FIELDS: { key: Exclude<keyof Basics, 'photo'>; label: string; placeholder: string; type?: string }[] = [
  { key: 'name', label: 'Full name', placeholder: 'Aarav Mehta' },
  { key: 'title', label: 'Job title', placeholder: 'Full-Stack Developer' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
  { key: 'location', label: 'Location', placeholder: 'Bengaluru, India' },
  { key: 'website', label: 'Website', placeholder: 'yourname.dev' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/you' },
  { key: 'github', label: 'GitHub', placeholder: 'github.com/you' },
]

function BasicsCard({ basics }: { basics: Basics }) {
  const { ref } = useFieldFocus<HTMLDivElement>({})
  return (
    <Card innerRef={ref} className="p-4">
      <div className="mb-3 flex items-center gap-3">
        <PhotoPicker photo={basics.photo} />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Personal details</h2>
          <p className="text-xs text-slate-500">Shown in the header of every template.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {BASIC_FIELDS.map((f) => (
          <BasicField key={f.key} field={f} value={basics[f.key]} />
        ))}
      </div>
    </Card>
  )
}

function BasicField({ field, value }: { field: (typeof BASIC_FIELDS)[number]; value: string }) {
  const { ref, flash } = useFieldFocus<HTMLInputElement>({ field: field.key })
  return <TextField ref={ref} flash={flash} label={field.label} placeholder={field.placeholder} type={field.type} value={value} onValue={(v) => resumeActions.updateBasics({ [field.key]: v })} />
}

function PhotoPicker({ photo }: { photo: string }) {
  const pick = (file: File) => {
    if (file.size > 1.5 * 1024 * 1024) return toast('Please choose an image under 1.5 MB', 'error')
    const reader = new FileReader()
    reader.onload = () => resumeActions.updateBasics({ photo: String(reader.result) }, null)
    reader.readAsDataURL(file)
  }
  return (
    <label className="group relative grid size-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" title="Upload photo">
      {photo ? <img src={photo} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-slate-400" aria-hidden />}
      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} aria-label="Upload photo" />
      {photo && (
        <button type="button" onClick={(e) => (e.preventDefault(), resumeActions.updateBasics({ photo: '' }, null))} className="absolute inset-0 hidden place-items-center bg-slate-900/60 text-white group-hover:grid" aria-label="Remove photo">
          <X className="size-4" />
        </button>
      )}
    </label>
  )
}

/* ---------------- sections ---------------- */

function SectionCard({ section: s, index, count }: { section: Section; index: number; count: number }) {
  const [open, setOpen] = useState(index < 3)
  const { ref } = useFieldFocus<HTMLDivElement>({ sectionId: s.id })
  useRevealOnFocus({ sectionId: s.id }, () => setOpen(true))
  const spec = KIND_SPECS[s.kind]
  const remove = async () => {
    if (await confirmDialog({ title: `Delete “${s.title || spec.label}”?`, message: 'You can undo this with Ctrl+Z.', confirmLabel: 'Delete', danger: true })) resumeActions.removeSection(s.id)
  }
  return (
    <Card innerRef={ref} className={cn(s.hidden && 'opacity-70')}>
      <div className="flex items-center gap-1 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left" aria-expanded={open}>
          <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition', !open && '-rotate-90')} aria-hidden />
          <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{s.title || spec.label}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800">{spec.label}</span>
        </button>
        <IconButton size="xs" icon={ChevronUp} label="Move up" disabled={index === 0} onClick={() => resumeActions.moveSection(index, index - 1)} />
        <IconButton size="xs" icon={ChevronDown} label="Move down" disabled={index === count - 1} onClick={() => resumeActions.moveSection(index, index + 1)} />
        <IconButton size="xs" icon={s.hidden ? EyeOff : Eye} label={s.hidden ? 'Show section' : 'Hide section'} onClick={() => resumeActions.updateSection(s.id, { hidden: !s.hidden }, null)} />
        <IconButton size="xs" icon={Trash2} label="Delete section" onClick={() => void remove()} />
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <TextField label="Section title" value={s.title} onValue={(v) => resumeActions.updateSection(s.id, { title: v })} />
            <Select
              label="Column"
              value={s.column}
              onValue={(v) => resumeActions.updateSection(s.id, { column: v as ColumnPlacement }, null)}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'main', label: 'Main' },
                { value: 'side', label: 'Sidebar' },
              ]}
            />
          </div>
          {s.kind === 'summary' ? (
            <SummaryField section={s} />
          ) : (
            <>
              {s.items.map((e, i) => (
                <EntryCard key={e.id} section={s} entry={e} index={i} count={s.items.length} />
              ))}
              <Button size="sm" variant="subtle" icon={Plus} onClick={() => focusField({ sectionId: s.id, entryId: resumeActions.addEntry(s.id) })}>
                Add {spec.singular}
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function SummaryField({ section }: { section: Section }) {
  const { ref, flash } = useFieldFocus<HTMLTextAreaElement>({ sectionId: section.id, field: 'content' })
  return <TextArea ref={ref} flash={flash} label="Summary" hint="2–4 sentences. **bold** and *italic* work." rows={5} value={section.content} onValue={(v) => resumeActions.updateSection(section.id, { content: v })} />
}

function EntryCard({ section: s, entry: e, index, count }: { section: Section; entry: Entry; index: number; count: number }) {
  const [open, setOpen] = useState(false)
  const { ref } = useFieldFocus<HTMLDivElement>({ sectionId: s.id, entryId: e.id })
  useRevealOnFocus({ sectionId: s.id, entryId: e.id }, () => setOpen(true))
  const spec = KIND_SPECS[s.kind]
  return (
    <div ref={ref} className="rounded-xl bg-slate-50 ring-1 ring-slate-200/70 dark:bg-slate-950/40 dark:ring-slate-800">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left" aria-expanded={open}>
          <ChevronDown className={cn('size-3.5 shrink-0 text-slate-400 transition', !open && '-rotate-90')} aria-hidden />
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{entryLabel(s.kind, e)}</span>
        </button>
        <IconButton size="xs" icon={ChevronUp} label="Move up" disabled={index === 0} onClick={() => resumeActions.moveEntry(s.id, index, index - 1)} />
        <IconButton size="xs" icon={ChevronDown} label="Move down" disabled={index === count - 1} onClick={() => resumeActions.moveEntry(s.id, index, index + 1)} />
        <IconButton size="xs" icon={Copy} label="Duplicate" onClick={() => resumeActions.duplicateEntry(s.id, e.id)} />
        <IconButton size="xs" icon={Trash2} label="Delete" onClick={() => resumeActions.removeEntry(s.id, e.id)} />
      </div>
      {open && (
        <div className="grid gap-3 border-t border-slate-200/70 p-3 sm:grid-cols-2 dark:border-slate-800">
          {spec.fields.map((f) => (
            <EntryField key={f.key} section={s} entry={e} spec={f} levels={spec.levelLabels} />
          ))}
        </div>
      )}
    </div>
  )
}

function EntryField({ section: s, entry: e, spec: f, levels }: { section: Section; entry: Entry; spec: FieldSpec; levels?: string[] }) {
  const { ref, flash } = useFieldFocus<HTMLInputElement & HTMLTextAreaElement>({ sectionId: s.id, entryId: e.id, field: f.key })
  const set = (patch: Partial<Entry>) => resumeActions.updateEntry(s.id, e.id, patch)
  const wide = f.wide || f.type === 'bullets' || f.type === 'textarea' ? 'sm:col-span-2' : ''
  switch (f.type) {
    case 'textarea':
      return <TextArea ref={ref} flash={flash} shellClassName={wide} label={f.label} placeholder={f.placeholder} rows={3} value={e.description} onValue={(v) => set({ description: v })} />
    case 'tags':
      return <TextField key={e.keywords.join('|')} ref={ref} flash={flash} shellClassName={wide} label={f.label} hint="Separate with commas" placeholder={f.placeholder} defaultValue={e.keywords.join(', ')} onBlur={(ev) => set({ keywords: ev.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
    case 'level':
      return (
        <Select
          shellClassName={wide}
          label={f.label}
          value={String(e.level)}
          onValue={(v) => set({ level: Number(v) })}
          options={(levels ?? ['', '1', '2', '3', '4', '5']).map((l, i) => ({ value: String(i), label: i === 0 ? 'Not shown' : l }))}
        />
      )
    case 'end':
      return (
        <div className={wide}>
          <TextField ref={ref} flash={flash} label={f.label} placeholder="2024-06" value={e.end} disabled={e.current} onValue={(v) => set({ end: v })} />
          <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={e.current} onChange={(ev) => set({ current: ev.target.checked })} className="rounded" /> Currently here
          </label>
        </div>
      )
    case 'bullets':
      return <BulletsField section={s} entry={e} label={f.label} hint={f.hint} className={wide} />
    default: {
      const key = f.key as 'title' | 'subtitle' | 'location' | 'url' | 'start' | 'meta'
      return <TextField ref={ref} flash={flash} shellClassName={wide} label={f.label} placeholder={f.type === 'month' ? '2024-07' : f.placeholder} value={e[key]} onValue={(v) => set({ [key]: v })} />
    }
  }
}

function BulletsField({ section: s, entry: e, label, hint, className }: { section: Section; entry: Entry; label: string; hint?: string; className?: string }) {
  const [helper, setHelper] = useState(false)
  const { ref } = useFieldFocus<HTMLDivElement>({ sectionId: s.id, entryId: e.id, field: 'bullets' })
  return (
    <div ref={ref} className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        <Button size="xs" variant="ghost" icon={Lightbulb} onClick={() => setHelper((h) => !h)}>
          Ideas
        </Button>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {e.bullets.map((b, i) => (
        <BulletRow key={i} section={s} entry={e} index={i} text={b} />
      ))}
      <Button size="xs" variant="subtle" icon={Plus} onClick={() => (resumeActions.addBullet(s.id, e.id), focusField({ sectionId: s.id, entryId: e.id, field: 'bullets', bullet: e.bullets.length }))}>
        Add bullet
      </Button>
      {helper && (
        <Suspense fallback={<p className="text-xs text-slate-500">Loading ideas…</p>}>
          <BulletHelper sectionId={s.id} entryId={e.id} role={e.title} onDone={() => setHelper(false)} />
        </Suspense>
      )}
    </div>
  )
}

function BulletRow({ section: s, entry: e, index, text }: { section: Section; entry: Entry; index: number; text: string }) {
  const { ref, flash } = useFieldFocus<HTMLTextAreaElement>({ sectionId: s.id, entryId: e.id, field: 'bullets', bullet: index })
  return (
    <div className="flex items-start gap-1.5">
      <TextArea ref={ref} flash={flash} shellClassName="flex-1" rows={2} value={text} onValue={(v) => resumeActions.updateBullet(s.id, e.id, index, v)} aria-label={`Bullet ${index + 1}`} />
      <IconButton size="xs" icon={X} label="Remove bullet" onClick={() => resumeActions.removeBullet(s.id, e.id, index)} />
    </div>
  )
}
