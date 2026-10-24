/**
 * Editor header: logo (→ dashboard), editable resume name + save status, undo/redo, versions,
 * shortcuts, theme and the export menu. Collapses to icons on narrow screens. OWNER: shell agent.
 */
import { Check, ChevronLeft, CloudOff, Keyboard, Loader2, MoreHorizontal, Redo2, Undo2 } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { navigate, resumeActions, uiActions, useActiveDoc, useHistoryState, useTheme, useUiStore } from '../store'
import { Button, cn, IconButton, Menu } from '../ui'
import { useMediaQuery } from './hooks.ts'
import { ExportMenu } from './lazy.ts'
import { Logo } from './Logo.tsx'
import { shortcut, MOD, SHIFT } from './platform.ts'
import { SnapshotsMenu } from './SnapshotsMenu.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

export function AppHeader() {
  const doc = useActiveDoc()
  const { canUndo, canRedo } = useHistoryState()
  const wide = useMediaQuery('(min-width: 640px)')
  const theme = useTheme()
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-2 sm:gap-2 sm:px-4 dark:border-slate-800 dark:bg-slate-900">
      <a href="#editor-panel" className="rf-skip rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
        Skip to editor
      </a>
      <a href="#preview-pane" className="rf-skip rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white focus:left-40">
        Skip to preview
      </a>
      <div className="hidden sm:block">
        <Logo compact />
      </div>
      <IconButton
        icon={ChevronLeft}
        label="All resumes"
        className="sm:hidden"
        onClick={() => navigate({ name: 'dashboard' })}
      />
      <div className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
      {doc && <NameInput id={doc.id} name={doc.name} />}
      {doc && <SaveStatus updatedAt={doc.updatedAt} />}
      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <IconButton icon={Undo2} label={`Undo (${shortcut(MOD, 'Z')})`} disabled={!canUndo} onClick={() => resumeActions.undo()} />
        <IconButton icon={Redo2} label={`Redo (${shortcut(MOD, SHIFT, 'Z')})`} disabled={!canRedo} onClick={() => resumeActions.redo()} />
        <div className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <SnapshotsMenu />
        {wide ? (
          <>
            <IconButton icon={Keyboard} label="Keyboard shortcuts (?)" onClick={() => uiActions.openModal('shortcuts')} />
            <ThemeToggle />
          </>
        ) : (
          <Menu
            width="w-52"
            label="More"
            trigger={(p) => <IconButton icon={MoreHorizontal} label="More" {...p} />}
            items={[
              { key: 'dash', label: 'All resumes', onSelect: () => navigate({ name: 'dashboard' }) },
              { key: 'keys', icon: Keyboard, label: 'Keyboard shortcuts', onSelect: () => uiActions.openModal('shortcuts') },
              'separator',
              { heading: 'Theme' },
              ...(['light', 'dark', 'system'] as const).map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1), checked: theme === t, onSelect: () => resumeActions.setTheme(t) })),
            ]}
          />
        )}
        <div className="ml-0.5 sm:ml-1">
          <Suspense fallback={<Button variant="primary" disabled aria-label="Download">{wide ? 'Download' : null}</Button>}>
            <ExportMenu compact={!wide} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}

/** Inline-editable resume name (commits on every keystroke; Escape restores, Enter blurs). */
function NameInput({ id, name }: { id: string; name: string }) {
  const original = useRef(name)
  return (
    <input
      aria-label="Resume name"
      data-native-undo=""
      value={name}
      maxLength={120}
      spellCheck={false}
      onFocus={() => (original.current = name)}
      onChange={(e) => resumeActions.renameResume(id, e.target.value)}
      onBlur={(e) => {
        if (!e.target.value.trim()) resumeActions.renameResume(id, original.current.trim() || 'Untitled resume')
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          resumeActions.renameResume(id, original.current)
          e.currentTarget.blur()
        }
      }}
      title="Rename resume"
      className="field-sizing-content h-9 max-w-[min(22rem,40vw)] min-w-[5rem] truncate rounded-lg border-0 bg-transparent px-2 text-sm font-semibold text-slate-800 ring-inset hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:min-w-[8rem] dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-950"
    />
  )
}

/** "Saving…" briefly after each change, then "Saved". */
function SaveStatus({ updatedAt }: { updatedAt: number }) {
  const saveError = useUiStore((s) => s.saveError)
  const [saving, setSaving] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaving(true)
    const t = setTimeout(() => setSaving(false), 700)
    return () => clearTimeout(t)
  }, [updatedAt])
  if (saveError)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" title="Browser storage is full — recent changes are not saved. Delete old versions/resumes or export a JSON backup." role="status">
        <CloudOff className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Not saved</span>
        <span className="sr-only sm:hidden">Not saved</span>
      </span>
    )
  return (
    <span className={cn('hidden shrink-0 items-center gap-1 text-xs md:inline-flex', saving ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400')} title="Everything is saved in this browser (localStorage)" aria-live="polite">
      {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
      {saving ? 'Saving…' : 'Saved'}
    </span>
  )
}
