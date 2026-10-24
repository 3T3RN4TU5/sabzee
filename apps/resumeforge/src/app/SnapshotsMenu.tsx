/**
 * Header "Versions" popover: save a named snapshot of the active resume (data + design), list,
 * restore (undoable), rename and delete. OWNER: shell agent.
 */
import { Check, History, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { relativeTime } from '../lib/shell.ts'
import type { Snapshot } from '../lib/types.ts'
import { confirmDialog, MAX_SNAPSHOTS, resumeActions, toast, useActiveDoc } from '../store'
import { getTemplate } from '../templates'
import { Button, cn, IconButton, inputClass, Popover } from '../ui'

export function SnapshotsMenu() {
  const doc = useActiveDoc()
  const [name, setName] = useState('')
  if (!doc) return null
  const snaps = doc.snapshots
  const save = (e: FormEvent) => {
    e.preventDefault()
    resumeActions.saveSnapshot(name)
    setName('')
    toast(`Saved “${name.trim() || `Version ${snaps.length + 1}`}”`, 'success')
  }
  return (
    <Popover
      label="Saved versions"
      width="w-[22rem]"
      trigger={(p) => (
        <span className="relative inline-flex">
          <IconButton icon={History} label="Versions (snapshots)" {...p} />
          {snaps.length > 0 && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-white dark:ring-slate-900">{snaps.length}</span>
          )}
        </span>
      )}
    >
      {() => (
        <div className="flex max-h-[min(70vh,32rem)] flex-col">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Versions</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Save a snapshot before big changes or to keep one version per job. Restoring can be undone.</p>
            <form onSubmit={save} className="mt-3 flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Version ${snaps.length + 1}`} maxLength={120} aria-label="Version name" className={cn(inputClass, 'h-8 py-1')} data-autofocus data-native-undo="" />
              <Button type="submit" variant="primary" icon={Save}>
                Save
              </Button>
            </form>
            {snaps.length >= MAX_SNAPSHOTS && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Only the newest {MAX_SNAPSHOTS} versions are kept.</p>}
          </div>
          <ul className="rf-scroll min-h-0 flex-1 overflow-y-auto p-2" aria-label="Saved versions">
            {snaps.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <History className="mx-auto mb-2 size-6 text-slate-300 dark:text-slate-600" aria-hidden />
                No versions yet
              </li>
            ) : (
              snaps.map((s) => <SnapshotRow key={s.id} snap={s} />)
            )}
          </ul>
        </div>
      )}
    </Popover>
  )
}

function SnapshotRow({ snap }: { snap: Snapshot }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(snap.name)
  const restore = async () => {
    const ok = await confirmDialog({ title: `Restore “${snap.name}”?`, message: 'Your current content and design are replaced by this version. You can undo this with Ctrl+Z.', confirmLabel: 'Restore' })
    if (!ok) return
    resumeActions.restoreSnapshot(snap.id)
    toast(`Restored “${snap.name}”`, 'success', { action: { label: 'Undo', onClick: () => resumeActions.undo() } })
  }
  const remove = async () => {
    if (await confirmDialog({ title: `Delete “${snap.name}”?`, message: 'This saved version will be removed permanently.', confirmLabel: 'Delete', danger: true })) resumeActions.deleteSnapshot(snap.id)
  }
  const commit = () => {
    if (draft.trim()) resumeActions.renameSnapshot(snap.id, draft.trim())
    setEditing(false)
  }
  const sections = snap.data.sections.filter((s) => !s.hidden).length
  return (
    <li className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setDraft(snap.name)
                setEditing(false)
              }
            }}
            autoFocus
            maxLength={120}
            aria-label="Version name"
            data-native-undo=""
            className={cn(inputClass, 'h-7 px-2 py-0.5 text-sm')}
          />
          <IconButton size="xs" type="submit" icon={Check} label="Save name" />
          <IconButton size="xs" icon={X} label="Cancel" onClick={() => (setDraft(snap.name), setEditing(false))} />
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{snap.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              <time dateTime={new Date(snap.createdAt).toISOString()} title={new Date(snap.createdAt).toLocaleString()}>
                {relativeTime(snap.createdAt)}
              </time>{' '}
              · {sections} sections · {getTemplate(snap.design.template).name}
            </p>
          </div>
          <Button size="xs" variant="subtle" icon={RotateCcw} onClick={() => void restore()} aria-label={`Restore ${snap.name}`}>
            Restore
          </Button>
          <IconButton size="xs" icon={Pencil} label={`Rename ${snap.name}`} onClick={() => (setDraft(snap.name), setEditing(true))} />
          <IconButton size="xs" icon={Trash2} label={`Delete ${snap.name}`} onClick={() => void remove()} />
        </>
      )}
    </li>
  )
}
