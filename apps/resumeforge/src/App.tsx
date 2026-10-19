/**
 * App root: hash routing + global mounts (toasts, confirm dialog, modals, print root).
 *   #/            Dashboard
 *   #/edit[/id]   Editor (activates the resume id when given)
 *   #/view/<enc>  Read-only shared resume
 *   #/lab?…       Template QA lab (unlinked, see app/TemplateLab.tsx)
 * OWNER: shell agent.
 */
import { Suspense, useEffect } from 'react'
import { Dashboard } from './features/dashboard/Dashboard.tsx'
import { EditorScreen } from './app/EditorScreen.tsx'
import { useApplyTheme, useDocumentTitle } from './app/hooks.ts'
import { SharedView, TemplateLab } from './app/lazy.ts'
import { Logo } from './app/Logo.tsx'
import { ModalHost } from './app/ModalHost.tsx'
import { PrintRoot } from './app/PrintRoot.tsx'
import { ThemeToggle } from './app/ThemeToggle.tsx'
import { navigate, resumeActions, useResumeStore, useRoute } from './store'
import { ConfirmDialog, Toaster } from './ui'

function DashboardScreen() {
  useDocumentTitle('Your resumes — ResumeForge')
  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <Logo />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <Dashboard />
    </div>
  )
}

function EditRoute({ id }: { id?: string }) {
  const activeId = useResumeStore((s) => s.activeId)
  const exists = useResumeStore((s) => (id ? s.resumes.some((r) => r.id === id) : s.resumes.some((r) => r.id === s.activeId)))
  useEffect(() => {
    if (id && exists && id !== activeId) resumeActions.setActive(id)
    if (!exists) navigate({ name: 'dashboard' }, { replace: true })
  }, [id, exists, activeId])
  if (!exists || (id && id !== activeId)) return null
  return <EditorScreen />
}

export default function App() {
  useApplyTheme()
  const route = useRoute()
  return (
    <>
      {route.name === 'lab' ? (
        <Suspense fallback={null}>
          <TemplateLab params={route.params} />
        </Suspense>
      ) : route.name === 'view' ? (
        <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-slate-500">Loading resume…</div>}>
          <SharedView payload={route.payload} />
        </Suspense>
      ) : route.name === 'edit' ? (
        <EditRoute id={route.id} />
      ) : (
        <DashboardScreen />
      )}
      <Toaster />
      <ConfirmDialog />
      <ModalHost />
      <PrintRoot />
    </>
  )
}
