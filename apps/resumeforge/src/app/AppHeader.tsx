/** Editor header: logo, resume name, undo/redo, theme, export. OWNER: shell agent. */
import { Redo2, Undo2 } from 'lucide-react'
import { Suspense } from 'react'
import { resumeActions, useActiveDoc, useHistoryState } from '../store'
import { Button, IconButton } from '../ui'
import { ExportMenu } from './lazy.ts'
import { Logo } from './Logo.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

export function AppHeader() {
  const doc = useActiveDoc()
  const { canUndo, canRedo } = useHistoryState()
  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 sm:px-4 dark:border-slate-800 dark:bg-slate-900">
      <Logo />
      <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
      {doc && (
        <input
          aria-label="Resume name"
          value={doc.name}
          onChange={(e) => resumeActions.renameResume(doc.id, e.target.value)}
          className="w-full max-w-[18rem] min-w-0 truncate rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-950"
        />
      )}
      <div className="ml-auto flex items-center gap-1">
        <IconButton icon={Undo2} label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => resumeActions.undo()} />
        <IconButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => resumeActions.redo()} />
        <ThemeToggle />
        <Suspense
          fallback={
            <Button variant="primary" disabled>
              Download
            </Button>
          }
        >
          <ExportMenu />
        </Suspense>
      </div>
    </header>
  )
}
