/**
 * App root: hash routing + global mounts (toasts, confirm dialog, modals, print root).
 *   #/            Dashboard
 *   #/edit[/id]   Editor (activates the resume id when given)
 *   #/view/<enc>  Read-only shared resume
 *   #/lab?…       Template QA lab (unlinked, see app/TemplateLab.tsx) — dev builds only, or opt in with
 *                 `?lab=1` (before or inside the hash, remembered in localStorage['resumeforge-lab'])
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

const LAB_FLAG = 'resumeforge-lab'

/** The QA lab ships in the bundle but is only reachable in dev or after an explicit opt-in. */
function labEnabled(params: Record<string, string>): boolean {
  if (import.meta.env.DEV) return true
  try {
    const optIn = new URLSearchParams(window.location.search).get('lab') ?? params.lab
    if (optIn === '1') localStorage.setItem(LAB_FLAG, '1')
    if (optIn === '0') localStorage.removeItem(LAB_FLAG)
    return localStorage.getItem(LAB_FLAG) === '1'
  } catch {
    return false
  }
}

function LabRoute({ params }: { params: Record<string, string> }) {
  const enabled = labEnabled(params)
  useEffect(() => {
    if (!enabled) {
      navigate({ name: 'dashboard' }, { replace: true })
      return
    }
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [enabled])
  if (!enabled) return null
  return (
    <Suspense fallback={null}>
      <TemplateLab params={params} />
    </Suspense>
  )
}

export default function App() {
  useApplyTheme()
  const route = useRoute()
  return (
    <>
      {route.name === 'lab' ? (
        <LabRoute params={route.params} />
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
