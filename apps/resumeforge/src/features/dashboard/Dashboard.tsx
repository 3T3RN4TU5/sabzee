/**
 * Dashboard (#/): all resumes as cards with live thumbnails, create from a starter, import,
 * duplicate, rename and delete. OWNER: the shell agent — a working baseline.
 */
import { Copy, FilePlus2, FileUp, FlaskConical, Code2, MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import type { StarterKind } from '../../lib/samples.ts'
import type { ResumeDoc } from '../../lib/types.ts'
import { confirmDialog, navigate, resumeActions, toast, uiActions, useResumes } from '../../store'
import { TemplateThumbnail, getTemplate } from '../../templates'
import { Button, Menu } from '../../ui'

const STARTERS: { id: StarterKind; title: string; description: string; icon: typeof Code2 }[] = [
  { id: 'developer', title: 'Developer sample', description: 'One page, full-stack engineer', icon: Code2 },
  { id: 'researcher', title: 'Researcher sample', description: 'Two pages, publications & awards', icon: FlaskConical },
  { id: 'blank', title: 'Start blank', description: 'Empty resume with the basics', icon: FilePlus2 },
]

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Dashboard() {
  const resumes = useResumes()
  const sorted = useMemo(() => [...resumes].sort((a, b) => b.updatedAt - a.updatedAt), [resumes])
  const create = (starter: StarterKind) => navigate({ name: 'edit', id: resumeActions.createResume(starter) })
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Your resumes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything is saved in this browser. Nothing is uploaded.</p>
        </div>
        <Button icon={FileUp} onClick={() => uiActions.openModal('import')}>
          Import
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {STARTERS.map((s) => (
          <button key={s.id} type="button" onClick={() => create(s.id)} className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-indigo-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-indigo-500/50">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <s.icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">{s.title}</span>
              <span className="block text-xs text-slate-500">{s.description}</span>
            </span>
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <Sparkles className="mx-auto size-8 text-indigo-500" aria-hidden />
          <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">No resumes yet</p>
          <p className="text-sm text-slate-500">Pick a starter above to begin.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((r) => (
            <ResumeCard key={r.id} doc={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResumeCard({ doc }: { doc: ResumeDoc }) {
  const open = () => navigate({ name: 'edit', id: doc.id })
  const rename = () => {
    const name = window.prompt('Rename resume', doc.name)
    if (name?.trim()) resumeActions.renameResume(doc.id, name.trim())
  }
  const remove = async () => {
    if (await confirmDialog({ title: `Delete “${doc.name}”?`, message: 'This removes the resume, its cover letter and saved versions from this browser.', confirmLabel: 'Delete', danger: true })) {
      resumeActions.deleteResume(doc.id)
      toast('Resume deleted')
    }
  }
  return (
    <div className="group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition hover:shadow-xl hover:ring-indigo-300 dark:bg-slate-900 dark:ring-slate-800">
      <button type="button" onClick={open} className="block w-full bg-slate-100 p-3 dark:bg-slate-800" aria-label={`Open ${doc.name}`}>
        <TemplateThumbnail data={doc.data} design={doc.design} width={200} className="mx-auto rounded-sm" />
      </button>
      <div className="flex items-start gap-1 p-3">
        <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{doc.name}</p>
          <p className="truncate text-xs text-slate-500">
            {getTemplate(doc.design.template).name} · {ago(doc.updatedAt)}
          </p>
        </button>
        <Menu
          width="w-44"
          trigger={(p) => (
            <button type="button" {...p} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Resume actions">
              <MoreHorizontal className="size-4" />
            </button>
          )}
          items={[
            { key: 'rename', icon: Pencil, label: 'Rename', onSelect: rename },
            { key: 'dup', icon: Copy, label: 'Duplicate', onSelect: () => (resumeActions.duplicateResume(doc.id, { activate: false }), toast('Duplicated', 'success')) },
            'separator',
            { key: 'del', icon: Trash2, label: 'Delete', danger: true, onSelect: () => void remove() },
          ]}
        />
      </div>
    </div>
  )
}
