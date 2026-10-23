/** #/ — app bar + the dashboard feature. OWNER: shell agent. */
import { FileUp, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Dashboard } from '../features/dashboard/Dashboard.tsx'
import { uiActions } from '../store'
import { Button } from '../ui'
import { useDocumentTitle } from './hooks.ts'
import { prefetchEditor } from './lazy.ts'
import { Logo } from './Logo.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

export function DashboardScreen() {
  useDocumentTitle('My resumes — ResumeForge')
  useEffect(() => {
    const t = setTimeout(prefetchEditor, 800)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" icon={FileUp} onClick={() => uiActions.openModal('import')} aria-label="Import a resume">
              <span className="hidden sm:inline">Import</span>
            </Button>
            <ThemeToggle />
            <Button variant="primary" icon={Plus} onClick={() => uiActions.openModal('new-resume')}>
              <span className="hidden min-[400px]:inline">New resume</span>
              <span className="min-[400px]:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
