/** One entry (position, degree, project …): sortable, collapsible, KIND_SPECS-driven form. OWNER: shell agent. */
import { ChevronDown, Copy, Trash2 } from 'lucide-react'
import { formatRange } from '../../lib/dates.ts'
import { entryLabel, KIND_SPECS, type FieldSpec } from '../../lib/sections.ts'
import { fieldError } from '../../lib/validate.ts'
import type { Entry, Section } from '../../lib/types.ts'
import { focusField, resumeActions, useFieldFocus, useRevealOnFocus } from '../../store'
import { cn, IconButton, TextField } from '../../ui'
import { undoableToast } from '../../app/undoToast.ts'
import { BulletsEditor } from './BulletsEditor.tsx'
import { setOpen, useIsOpen } from './editorUi.ts'
import { EndField, LevelPicker, MonthField, TagsInput } from './Fields.tsx'
import { RichTextArea } from './RichTextArea.tsx'
import { DragHandle, type DragHandleProps } from './Sortable.tsx'
import { useState } from 'react'

const isBlank = (e: Entry) => !e.title.trim() && !e.subtitle.trim() && !e.description.trim() && e.bullets.every((b) => !b.trim()) && e.keywords.length === 0

const PRESENT: Partial<Record<string, string>> = { experience: 'I currently work here', education: 'Currently studying', volunteering: 'Ongoing' }

export function EntryCard({ section: s, entry: e, index, handle }: { section: Section; entry: Entry; index: number; handle: DragHandleProps }) {
  const [initiallyBlank] = useState(() => isBlank(e))
  const open = useIsOpen(e.id, initiallyBlank)
  const { ref, flash } = useFieldFocus<HTMLDivElement>({ sectionId: s.id, entryId: e.id })
  useRevealOnFocus({ sectionId: s.id, entryId: e.id }, () => setOpen(e.id, true))
  const spec = KIND_SPECS[s.kind]
  const label = entryLabel(s.kind, e)
  const when = spec.singleDate ? e.start : formatRange(e.start, e.end, e.current, 'MMM YYYY')
  const remove = () => {
    resumeActions.removeEntry(s.id, e.id)
    undoableToast(`Deleted “${label}”`)
  }
  return (
    <div ref={ref} className={cn('rounded-xl bg-slate-50 ring-1 ring-slate-200/80 dark:bg-slate-950/40 dark:ring-slate-800', flash && 'ring-2 ring-indigo-400')}>
      <div className="flex items-center gap-0.5 py-1 pr-1 pl-0.5">
        <DragHandle handle={handle} size="xs" label={`Reorder ${label}`} />
        <button type="button" onClick={() => setOpen(e.id, !open)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-expanded={open}>
          <ChevronDown className={cn('size-3.5 shrink-0 text-slate-400 transition', !open && '-rotate-90')} aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
            {!open && when && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{when}</span>}
          </span>
        </button>
        <IconButton size="xs" icon={Copy} label={`Duplicate ${label}`} onClick={() => focusField({ sectionId: s.id, entryId: resumeActions.duplicateEntry(s.id, e.id) })} />
        <IconButton size="xs" icon={Trash2} label={`Delete ${label}`} onClick={remove} />
      </div>
      {open && (
        <div className="grid gap-3 border-t border-slate-200/70 p-3 sm:grid-cols-2 dark:border-slate-800">
          {spec.fields.map((f) => (
            <EntryField key={f.key} section={s} entry={e} spec={f} levels={spec.levelLabels} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

function EntryField({ section: s, entry: e, spec: f, levels }: { section: Section; entry: Entry; spec: FieldSpec; levels?: string[]; index: number }) {
  const target = { sectionId: s.id, entryId: e.id, field: f.key }
  const { ref, flash } = useFieldFocus<HTMLElement>(target)
  const [focused, setFocused] = useState(false)
  const set = (patch: Partial<Entry>, key?: string | null) => resumeActions.updateEntry(s.id, e.id, patch, key)
  const wide = f.wide || f.type === 'bullets' || f.type === 'textarea' || f.type === 'tags' ? 'sm:col-span-2' : ''
  switch (f.type) {
    case 'textarea':
      return <RichTextArea className={wide} label={f.label} placeholder={f.placeholder} rows={3} value={e.description} onValue={(v) => set({ description: v })} fieldRef={ref} flash={flash} />
    case 'tags':
      return <TagsInput className={wide} label={f.label} placeholder={f.placeholder} tags={e.keywords} onChange={(keywords) => set({ keywords }, null)} fieldRef={ref} flash={flash} />
    case 'level':
      return <LevelPicker className={wide} label={f.label} level={e.level} labels={levels ?? ['', '1', '2', '3', '4', '5']} onChange={(level) => set({ level }, null)} fieldRef={ref} flash={flash} />
    case 'month':
      return <MonthField className={wide} label={f.label} value={e.start} onChange={(start) => set({ start }, null)} fieldRef={ref} flash={flash} />
    case 'end':
      return <EndField className={wide} label={f.label} value={e.end} current={e.current} presentLabel={PRESENT[s.kind] ?? 'Ongoing'} onChange={(end) => set({ end }, null)} onCurrent={(current) => set({ current, ...(current ? { end: '' } : {}) }, null)} fieldRef={ref} flash={flash} />
    case 'bullets':
      return <BulletsEditor className={wide} sectionId={s.id} entry={e} label={f.label} hint={f.hint} />
    default: {
      const key = f.key as 'title' | 'subtitle' | 'location' | 'url' | 'meta'
      const err = f.type === 'url' && !focused ? fieldError('url', e[key]) : null
      return (
        <TextField
          ref={ref}
          flash={flash}
          shellClassName={wide}
          label={f.label}
          placeholder={f.placeholder}
          type={f.type === 'url' ? 'url' : 'text'}
          inputMode={f.type === 'url' ? 'url' : undefined}
          value={e[key]}
          error={err}
          hint={f.hint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onValue={(v) => set({ [key]: v })}
        />
      )
    }
  }
}
