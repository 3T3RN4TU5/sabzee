/** One resume on the dashboard: live first-page thumbnail, inline rename, duplicate, delete. OWNER: shell agent. */
import { Copy, ExternalLink, History, Mail, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { relativeTime } from '../../lib/shell.ts'
import type { ResumeDoc } from '../../lib/types.ts'
import { confirmDialog, navigate, resumeActions, toast } from '../../store'
import { getTemplate, TemplateThumbnail } from '../../templates'
import { cn, inputClass, LazyMount, Menu } from '../../ui'

export function ResumeCard({ doc, now }: { doc: ResumeDoc; now: number }) {
  const [renaming, setRenaming] = useState(false)
  const nameBtn = useRef<HTMLButtonElement>(null)
  const open = () => navigate({ name: 'edit', id: doc.id })
  const duplicate = () => {
    resumeActions.duplicateResume(doc.id, { activate: false })
    toast(`Duplicated “${doc.name}”`, 'success')
  }
  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete “${doc.name}”?`,
      message: `This removes the resume${doc.snapshots.length ? `, its ${doc.snapshots.length} saved version${doc.snapshots.length === 1 ? '' : 's'}` : ''} and its cover letter from this browser. You can undo it for a few seconds; after that it is gone for good, so export a JSON backup first if you might need it again.`,
      confirmLabel: 'Delete resume',
      danger: true,
    })
    if (!ok) return
    // Keep keyboard focus in the grid: the next card (or the previous one, or the section heading).
    const card = nameBtn.current?.closest('article')
    const neighbour = (card?.nextElementSibling ?? card?.previousElementSibling) as HTMLElement | null
    const deleted = resumeActions.deleteResume(doc.id)
    requestAnimationFrame(() => {
      const target = neighbour?.isConnected ? neighbour.querySelector<HTMLElement>('[data-card-name]') : document.getElementById('mine-h')
      target?.focus()
    })
    toast(`Deleted “${doc.name}”`, 'info', {
      duration: 8000,
      action: deleted
        ? {
            label: 'Undo',
            onClick: () => {
              resumeActions.restoreResume(deleted)
              toast(`Restored “${doc.name}”`, 'success')
              // Return focus to the restored card (the toast button that had it is about to go away).
              requestAnimationFrame(() => document.querySelector<HTMLElement>(`article[data-resume-id="${CSS.escape(doc.id)}"] [data-card-name]`)?.focus())
            },
          }
        : undefined,
    })
  }
  const tpl = getTemplate(doc.design.template)
  const hasLetter = doc.coverLetter.body.trim().length > 0
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 hover:ring-indigo-300 focus-within:ring-indigo-400 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-indigo-500/60" aria-label={doc.name} data-resume-id={doc.id}>
      <button type="button" onClick={open} className="relative block bg-linear-to-b from-slate-100 to-slate-200/70 px-[9%] pt-[8%] outline-none dark:from-slate-800 dark:to-slate-800/60" aria-label={`Open ${doc.name} in the editor`} tabIndex={-1}>
        <LazyMount className="aspect-[210/245] w-full overflow-hidden rounded-t-[3px] shadow-md shadow-slate-900/10">{(w) => <TemplateThumbnail data={doc.data} design={doc.design} width={w} />}</LazyMount>
        <span className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/10 group-hover:opacity-100">
          <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-lg ring-1 ring-slate-900/5">Open editor</span>
        </span>
      </button>
      <div className="flex items-start gap-1 border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <RenameInput
              initial={doc.name}
              onDone={(name) => {
                if (name !== null && name.trim() && name.trim() !== doc.name) {
                  resumeActions.renameResume(doc.id, name.trim())
                  toast('Renamed', 'success')
                }
                setRenaming(false)
                requestAnimationFrame(() => nameBtn.current?.focus())
              }}
            />
          ) : (
            <button ref={nameBtn} data-card-name="" type="button" onClick={open} onDoubleClick={() => setRenaming(true)} className="block w-full truncate rounded text-left text-sm font-bold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white" title={`${doc.name} — double-click to rename`}>
              {doc.name}
            </button>
          )}
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {tpl.name} · <time dateTime={new Date(doc.updatedAt).toISOString()} title={`Last edited ${new Date(doc.updatedAt).toLocaleString()}`}>Edited {relativeTime(doc.updatedAt, now)}</time>
          </p>
          {(doc.snapshots.length > 0 || hasLetter) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {doc.snapshots.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <History className="size-3" aria-hidden />
                  {doc.snapshots.length} version{doc.snapshots.length === 1 ? '' : 's'}
                </span>
              )}
              {hasLetter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <Mail className="size-3" aria-hidden />
                  Cover letter
                </span>
              )}
            </div>
          )}
        </div>
        <Menu
          width="w-48"
          label={`Actions for ${doc.name}`}
          trigger={(p) => (
            <button type="button" {...p} className="-mr-1 rounded-lg p-1.5 text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label={`Actions for ${doc.name}`}>
              <MoreVertical className="size-4" aria-hidden />
            </button>
          )}
          items={[
            { key: 'open', icon: ExternalLink, label: 'Open', onSelect: open },
            { key: 'rename', icon: Pencil, label: 'Rename', onSelect: () => setRenaming(true) },
            { key: 'dup', icon: Copy, label: 'Duplicate', onSelect: duplicate },
            'separator',
            { key: 'del', icon: Trash2, label: 'Delete', danger: true, onSelect: () => void remove() },
          ]}
        />
      </div>
    </article>
  )
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial)
  const done = useRef(false)
  const finish = (v: string | null) => {
    if (done.current) return
    done.current = true
    onDone(v)
  }
  return (
    <input
      autoFocus
      value={value}
      maxLength={120}
      aria-label="Resume name"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') {
          e.stopPropagation()
          finish(null)
        }
      }}
      className={cn(inputClass, 'h-7 px-2 py-0.5 text-sm font-semibold')}
    />
  )
}
