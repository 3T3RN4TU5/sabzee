/**
 * App root: hash routing + global mounts (toasts, confirm dialog, modals, print root).
 *   #/            Dashboard
 *   #/edit[/id]   Editor (activates the resume id when given)
 *   #/view/<enc>  Read-only shared resume
 *   #/lab?…       Template QA lab (unlinked, see app/TemplateLab.tsx)
 * Routes are code-split (app/lazy.ts). OWNER: shell agent.
 */
import { Suspense, useEffect } from 'react'
import { useApplyTheme } from './app/hooks.ts'
import { DashboardScreen, EditorScreen, SharedView, TemplateLab } from './app/lazy.ts'
import { LogoMark } from './app/Logo.tsx'
import { ModalHost } from './app/ModalHost.tsx'
import { PrintRoot } from './app/PrintRoot.tsx'
import { navigate, resumeActions, useResumeStore, useRoute } from './store'
import { ConfirmDialog, Toaster } from './ui'

function RouteFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 dark:bg-slate-950" aria-busy="true">
      <div className="flex flex-col items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <LogoMark className="size-10 animate-pulse" />
        {label}
      </div>
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
  return (
    <Suspense fallback={<RouteFallback label="Opening the editor…" />}>
      <EditorScreen />
    </Suspense>
  )
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
        <Suspense fallback={<RouteFallback label="Loading resume…" />}>
          <SharedView payload={route.payload} />
        </Suspense>
      ) : route.name === 'edit' ? (
        <EditRoute id={route.id} />
      ) : (
        <Suspense fallback={<RouteFallback />}>
          <DashboardScreen />
        </Suspense>
      )}
      <Toaster />
      <ConfirmDialog />
      <ModalHost />
      <PrintRoot />
    </>
  )
}
