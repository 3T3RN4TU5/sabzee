/** A section: sortable header (rename, hide, column, duplicate, delete) + summary text or sortable entries. OWNER: shell agent. */
import { ChevronDown, Columns2, Copy, Eye, EyeOff, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { KIND_SPECS } from '../../lib/sections.ts'
import { entryLabel } from '../../lib/sections.ts'
import type { ColumnPlacement, Section } from '../../lib/types.ts'
import { confirmDialog, focusField, resumeActions, useActiveDesign, useFieldFocus, useRevealOnFocus } from '../../store'
import { getTemplate } from '../../templates'
import { Button, cn, IconButton, Menu, Segmented, TextField } from '../../ui'
import { undoableToast } from '../../app/undoToast.ts'
import { setOpen, useIsOpen } from './editorUi.ts'
import { EntryCard } from './EntryCard.tsx'
import { RichTextArea } from './RichTextArea.tsx'
import { DragHandle, SortableItem, SortableList, type DragHandleProps } from './Sortable.tsx'
import { sectionHasContent } from '../../lib/sections.ts'

const COLUMNS: { value: ColumnPlacement; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'main', label: 'Main' },
  { value: 'side', label: 'Side' },
]

export function SectionCard({ section: s, index, count, handle }: { section: Section; index: number; count: number; handle: DragHandleProps }) {
  const open = useIsOpen(s.id, true)
  const { ref, flash } = useFieldFocus<HTMLDivElement>({ sectionId: s.id })
  useRevealOnFocus({ sectionId: s.id }, () => setOpen(s.id, true))
  const design = useActiveDesign()
  const twoCol = design ? getTemplate(design.template).columns === 2 : false
  const spec = KIND_SPECS[s.kind]
  const title = s.title.trim() || spec.label
  const remove = async () => {
    if (sectionHasContent(s) && !(await confirmDialog({ title: `Delete “${title}”?`, message: 'The section and all its entries are removed. You can undo this with Ctrl+Z.', confirmLabel: 'Delete section', danger: true }))) return
    resumeActions.removeSection(s.id)
    undoableToast(`Deleted section “${title}”`)
  }
  const addEntry = () => {
    const id = resumeActions.addEntry(s.id)
    setOpen(id, true)
    focusField({ sectionId: s.id, entryId: id, field: spec.fields[0]?.key ?? 'title' })
  }
  return (
    <div ref={ref} className={cn('rounded-2xl bg-white shadow-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800', flash && 'ring-2 ring-indigo-400')}>
      <div className="flex items-center gap-0.5 py-1.5 pr-1.5 pl-1">
        <DragHandle handle={handle} label={`Reorder section ${title}`} />
        <button type="button" onClick={() => setOpen(s.id, !open)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-expanded={open}>
          <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition', !open && '-rotate-90')} aria-hidden />
          <span className={cn('truncate text-sm font-bold', s.hidden ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900 dark:text-white')}>{title}</span>
          {title !== spec.label && <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline dark:bg-slate-800 dark:text-slate-400">{spec.label}</span>}
          {s.kind !== 'summary' && s.items.length > 0 && <span className="shrink-0 text-xs text-slate-400 tabular-nums">{s.items.length}</span>}
          {s.hidden && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hidden</span>}
        </button>
        <IconButton size="xs" icon={s.hidden ? EyeOff : Eye} label={s.hidden ? `Show ${title} on the resume` : `Hide ${title} from the resume`} onClick={() => resumeActions.updateSection(s.id, { hidden: !s.hidden }, null)} />
        <Menu
          width="w-52"
          label={`${title} actions`}
          trigger={(p) => <IconButton size="xs" icon={MoreHorizontal} label={`${title} actions`} {...p} />}
          items={[
            { key: 'up', label: 'Move up', disabled: index === 0, onSelect: () => resumeActions.moveSection(index, index - 1) },
            { key: 'down', label: 'Move down', disabled: index === count - 1, onSelect: () => resumeActions.moveSection(index, index + 1) },
            { key: 'dup', icon: Copy, label: 'Duplicate', description: s.kind === 'custom' ? undefined : 'As a custom section', onSelect: () => focusField({ sectionId: resumeActions.duplicateSection(s.id) }) },
            'separator',
            { key: 'del', icon: Trash2, label: 'Delete section', danger: true, onSelect: () => void remove() },
          ]}
        />
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <SectionTitle section={s} />
            <Segmented
              label={
                <span className="inline-flex items-center gap-1" title={twoCol ? 'Where this section goes in two-column templates' : 'Only used by two-column templates'}>
                  <Columns2 className="size-3.5" aria-hidden /> Column{!twoCol && <span className="font-normal text-slate-400"> (2-col templates)</span>}
                </span>
              }
              size="xs"
              value={s.column}
              onChange={(column) => resumeActions.updateSection(s.id, { column }, null)}
              options={COLUMNS}
            />
          </div>
          {s.kind === 'summary' ? (
            <SummaryField section={s} />
          ) : (
            <>
              {s.items.length > 0 ? (
                <SortableList ids={s.items.map((e) => e.id)} noun={spec.singular} label={(id) => entryLabel(s.kind, s.items.find((e) => e.id === id)!)} onMove={(from, to) => resumeActions.moveEntry(s.id, from, to)}>
                  <div className="space-y-2">
                    {s.items.map((e, i) => (
                      <SortableItem key={e.id} id={e.id}>
                        {(h) => <EntryCard section={s} entry={e} index={i} handle={h} />}
                      </SortableItem>
                    ))}
                  </div>
                </SortableList>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">No {spec.singular} entries yet.</p>
              )}
              <Button size="sm" variant="subtle" icon={Plus} onClick={addEntry}>
                Add {spec.singular}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ section: s }: { section: Section }) {
  const { ref, flash } = useFieldFocus<HTMLInputElement>({ sectionId: s.id, field: 'title' })
  return <TextField ref={ref} flash={flash} label="Section title" placeholder={KIND_SPECS[s.kind].label} value={s.title} onValue={(title) => resumeActions.updateSection(s.id, { title })} />
}

function SummaryField({ section }: { section: Section }) {
  const { ref, flash } = useFieldFocus<HTMLTextAreaElement>({ sectionId: section.id, field: 'content' })
  return (
    <RichTextArea
      label="Summary"
      hint="2–4 sentences: who you are, your strongest skills and a measurable win."
      rows={5}
      words={{ ideal: [30, 90] }}
      value={section.content}
      onValue={(content) => resumeActions.updateSection(section.id, { content })}
      fieldRef={ref}
      flash={flash}
    />
  )
}
