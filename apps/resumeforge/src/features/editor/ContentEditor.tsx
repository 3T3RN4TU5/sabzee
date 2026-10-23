/**
 * Content editor ("Content" side-panel tab): personal details, sortable sections (drag or
 * keyboard), KIND_SPECS-driven entry forms and the "Add section" menu. Every field registers with
 * the focus mechanism (useFieldFocus) so the ATS checker and the preview can jump to it.
 * OWNER: shell agent.
 */
import { ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { canAddSection } from '../../lib/ops.ts'
import { ADDABLE_KINDS, KIND_SPECS } from '../../lib/sections.ts'
import type { SectionKind } from '../../lib/types.ts'
import { focusField, resumeActions, useActiveData } from '../../store'
import { Button, Menu, Modal, TextField } from '../../ui'
import { BasicsCard } from './BasicsCard.tsx'
import { setManyOpen, setOpen } from './editorUi.ts'
import { SectionCard } from './SectionCard.tsx'
import { SortableItem, SortableList } from './Sortable.tsx'

export function ContentEditor() {
  const data = useActiveData()
  const [customOpen, setCustomOpen] = useState(false)
  if (!data) return null
  const ids = data.sections.map((s) => s.id)
  const add = (kind: SectionKind, title?: string) => {
    const id = resumeActions.addSection(kind, title ? { title } : {})
    setOpen(id, true)
    focusField({ sectionId: id })
  }
  return (
    <div className="space-y-3 p-3 sm:p-5">
      <BasicsCard basics={data.basics} />
      <div className="flex items-center gap-2 px-1 pt-2">
        <h2 className="mr-auto text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">Sections</h2>
        <Button size="xs" variant="ghost" icon={ChevronsUpDown} onClick={() => setManyOpen(ids, true)}>
          Expand
        </Button>
        <Button size="xs" variant="ghost" icon={ChevronsDownUp} onClick={() => setManyOpen([...ids, ...data.sections.flatMap((s) => s.items.map((e) => e.id))], false)}>
          Collapse
        </Button>
      </div>
      {data.sections.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No sections yet</p>
          <p className="mt-1 text-xs text-slate-500">Most resumes need a summary, experience, education and skills.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {(['summary', 'experience', 'education', 'skills'] as const).map((k) => (
              <Button key={k} size="xs" icon={Plus} onClick={() => add(k)}>
                {KIND_SPECS[k].label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <SortableList ids={ids} noun="section" label={(id) => data.sections.find((s) => s.id === id)?.title || 'section'} onMove={resumeActions.moveSection}>
          <div className="space-y-3">
            {data.sections.map((s, i) => (
              <SortableItem key={s.id} id={s.id}>
                {(h) => <SectionCard section={s} index={i} count={data.sections.length} handle={h} />}
              </SortableItem>
            ))}
          </div>
        </SortableList>
      )}
      <Menu
        align="left"
        width="w-80"
        side="top"
        label="Add section"
        trigger={(p) => (
          <Button icon={Plus} className="w-full border-2 border-dashed border-slate-300 bg-transparent shadow-none ring-0 dark:border-slate-700 dark:bg-transparent" {...p}>
            Add section
          </Button>
        )}
        items={ADDABLE_KINDS.map((k) => {
          const ok = canAddSection(data, k)
          return {
            key: k,
            label: KIND_SPECS[k].label,
            description: KIND_SPECS[k].description,
            disabled: !ok,
            hint: ok ? undefined : 'Added',
            onSelect: () => (k === 'custom' ? setCustomOpen(true) : add(k)),
          }
        })}
      />
      <p className="px-1 pb-4 text-center text-xs text-slate-400 dark:text-slate-500">Tip: drag ⠿ to reorder · click anything in the preview to edit it</p>
      {customOpen && <CustomSectionDialog onClose={() => setCustomOpen(false)} onCreate={(t) => (setCustomOpen(false), add('custom', t))} />}
    </div>
  )
}

function CustomSectionDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string) => void }) {
  const [title, setTitle] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Add a custom section"
      description="e.g. Leadership, Patents, Conferences, Hackathons."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="custom-section-form">
            Add section
          </Button>
        </>
      }
    >
      <form
        id="custom-section-form"
        onSubmit={(e) => {
          e.preventDefault()
          onCreate(title.trim() || 'Custom section')
        }}
      >
        <TextField label="Section title" value={title} onValue={setTitle} placeholder="Leadership" maxLength={60} data-autofocus />
      </form>
    </Modal>
  )
}
