import { useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react'
import { uid, useStore } from '../store'
import type { Basics, Resume, SectionId } from '../lib/types'
import { sectionLabels } from '../lib/types'

type ListKey = Exclude<keyof Resume, 'basics'>

interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'checkbox'
  placeholder?: string
  wide?: boolean
  hint?: string
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'

function Field({ def, value, onChange }: { def: FieldDef; value: string | boolean; onChange: (v: string | boolean) => void }) {
  if (def.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        {def.label}
      </label>
    )
  }
  return (
    <label className={`block ${def.wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-500">{def.label}</span>
      {def.type === 'textarea' ? (
        <textarea rows={4} value={String(value)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y leading-relaxed`} />
      ) : (
        <input value={String(value)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
      {def.hint && <span className="mt-1 block text-[11px] text-slate-400">{def.hint}</span>}
    </label>
  )
}

const basicsFields: FieldDef[] = [
  { name: 'name', label: 'Full name', placeholder: 'Aarav Mehta' },
  { name: 'title', label: 'Job title', placeholder: 'Full-Stack Developer' },
  { name: 'email', label: 'Email', placeholder: 'you@example.com' },
  { name: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
  { name: 'location', label: 'Location', placeholder: 'Pune, India' },
  { name: 'website', label: 'Portfolio / website', placeholder: 'yourname.dev' },
  { name: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/you' },
  { name: 'github', label: 'GitHub', placeholder: 'github.com/you' },
]

const listConfig: Record<ListKey, { fields: FieldDef[]; title: (x: Record<string, unknown>) => string; create: () => Record<string, unknown> }> = {
  experience: {
    fields: [
      { name: 'role', label: 'Role', placeholder: 'Software Engineer' },
      { name: 'company', label: 'Company', placeholder: 'Acme Corp' },
      { name: 'start', label: 'Start', placeholder: 'Jul 2024' },
      { name: 'end', label: 'End', placeholder: 'Mar 2026' },
      { name: 'location', label: 'Location', placeholder: 'Bengaluru / Remote' },
      { name: 'current', label: 'I currently work here', type: 'checkbox' },
      { name: 'bullets', label: 'Achievements (one per line)', type: 'textarea', wide: true, placeholder: 'Built … that improved … by 30%', hint: 'Start with an action verb and include numbers wherever possible.' },
    ],
    title: (x) => [x.role, x.company].filter(Boolean).join(' @ ') || 'New position',
    create: () => ({ id: uid(), role: '', company: '', location: '', start: '', end: '', current: false, bullets: '' }),
  },
  projects: {
    fields: [
      { name: 'name', label: 'Project name', placeholder: 'TaskFlow' },
      { name: 'link', label: 'Link', placeholder: 'taskflow.vercel.app' },
      { name: 'tech', label: 'Tech stack', placeholder: 'React, TypeScript, Tailwind', wide: true },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, placeholder: 'What it does and what you built' },
    ],
    title: (x) => String(x.name || 'New project'),
    create: () => ({ id: uid(), name: '', link: '', tech: '', description: '' }),
  },
  education: {
    fields: [
      { name: 'degree', label: 'Degree', placeholder: 'B.Tech, Computer Science', wide: true },
      { name: 'school', label: 'Institution', placeholder: 'IIT Delhi', wide: true },
      { name: 'start', label: 'Start', placeholder: '2020' },
      { name: 'end', label: 'End', placeholder: '2024' },
      { name: 'score', label: 'CGPA / %', placeholder: 'CGPA 8.5 / 10' },
    ],
    title: (x) => String(x.degree || 'New education'),
    create: () => ({ id: uid(), degree: '', school: '', start: '', end: '', score: '' }),
  },
  skills: {
    fields: [
      { name: 'group', label: 'Group', placeholder: 'Frontend' },
      { name: 'items', label: 'Skills (comma separated)', placeholder: 'React, Next.js, Tailwind', wide: true },
    ],
    title: (x) => String(x.group || 'New skill group'),
    create: () => ({ id: uid(), group: '', items: '' }),
  },
  certifications: {
    fields: [
      { name: 'name', label: 'Certificate', placeholder: 'AWS Cloud Practitioner', wide: true },
      { name: 'issuer', label: 'Issuer', placeholder: 'Amazon Web Services' },
      { name: 'year', label: 'Year', placeholder: '2025' },
    ],
    title: (x) => String(x.name || 'New certificate'),
    create: () => ({ id: uid(), name: '', issuer: '', year: '' }),
  },
}

function ListEditor({ listKey }: { listKey: ListKey }) {
  const items = useStore((s) => s.resume[listKey]) as unknown as Record<string, unknown>[]
  const addItem = useStore((s) => s.addItem)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const moveItem = useStore((s) => s.moveItem)
  const [openId, setOpenId] = useState<string | null>(null)
  const cfg = listConfig[listKey]

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const id = String(item.id)
        const open = openId === id
        return (
          <div key={id} className="rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
              <button type="button" onClick={() => setOpenId(open ? null : id)} className="min-w-0 flex-1 truncate px-1 py-1 text-left text-sm font-semibold text-slate-700">
                {cfg.title(item)}
              </button>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveItem(listKey, id, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => moveItem(listKey, id, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Remove" onClick={() => removeItem(listKey, id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {open && (
              <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
                {cfg.fields.map((f) => (
                  <Field key={f.name} def={f} value={item[f.name] as string | boolean} onChange={(v) => updateItem(listKey, id, { [f.name]: v } as never)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => {
          const created = cfg.create()
          addItem(listKey, created as never)
          setOpenId(String(created.id))
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
      >
        <Plus className="h-4 w-4" /> Add {sectionLabels[listKey].toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )
}

function Panel({ title, id, children, defaultOpen = false }: { title: string; id?: SectionId; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const hidden = useStore((s) => (id ? s.settings.hidden.includes(id) : false))
  const toggleSection = useStore((s) => s.toggleSection)
  const moveSection = useStore((s) => s.moveSection)
  const order = useStore((s) => s.settings.order)
  const index = id ? order.indexOf(id) : -1

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex flex-1 items-center gap-2 text-left">
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? '' : '-rotate-90'}`} />
          <h2 className={`font-bold ${hidden ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{title}</h2>
        </button>
        {id && (
          <>
            <button type="button" title="Move section up in resume" aria-label={`Move ${title} up`} disabled={index <= 0} onClick={() => moveSection(id, -1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
              <ChevronUp className="h-4 w-4" />
            </button>
            <button type="button" title="Move section down in resume" aria-label={`Move ${title} down`} disabled={index === order.length - 1} onClick={() => moveSection(id, 1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
              <ChevronDown className="h-4 w-4" />
            </button>
            <button type="button" title={hidden ? 'Show in resume' : 'Hide from resume'} aria-label={hidden ? `Show ${title}` : `Hide ${title}`} onClick={() => toggleSection(id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
      {open && <div className="border-t border-slate-100 p-4">{children}</div>}
    </section>
  )
}

export function Editor() {
  const basics = useStore((s) => s.resume.basics)
  const setBasics = useStore((s) => s.setBasics)
  const order = useStore((s) => s.settings.order)

  return (
    <div className="space-y-3">
      <Panel title="Personal details" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2">
          {basicsFields.map((f) => (
            <Field key={f.name} def={f} value={basics[f.name as keyof Basics]} onChange={(v) => setBasics({ [f.name]: v })} />
          ))}
        </div>
      </Panel>
      {order.map((id) => (
        <Panel key={id} id={id} title={sectionLabels[id]}>
          {id === 'summary' ? (
            <Field
              def={{ name: 'summary', label: 'Professional summary', type: 'textarea', placeholder: 'Who you are, what you do best and the impact you have had.', hint: `${basics.summary.trim().split(/\s+/).filter(Boolean).length} words · aim for 25–80` }}
              value={basics.summary}
              onChange={(v) => setBasics({ summary: String(v) })}
            />
          ) : (
            <ListEditor listKey={id} />
          )}
        </Panel>
      ))}
    </div>
  )
}
