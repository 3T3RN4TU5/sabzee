import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { uiActions, useUiStore } from '../store'
import { cn } from './cn.ts'

const ICONS = { success: CheckCircle2, error: TriangleAlert, info: Info }
const TONES = { success: 'text-emerald-400', error: 'text-rose-400', info: 'text-sky-400' }

/** Renders ui-store toasts (mounted once by the shell). */
export function Toaster() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 print:hidden" aria-live="polite" role="status">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 py-2.5 pr-2 pl-3.5 text-sm text-white shadow-xl ring-1 ring-white/10 dark:bg-slate-800">
            <Icon className={cn('size-4 shrink-0', TONES[t.kind])} aria-hidden />
            <span className="min-w-0 flex-1 font-medium">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-bold text-indigo-300 hover:bg-white/10"
                onClick={() => {
                  t.action?.onClick()
                  uiActions.dismissToast(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => uiActions.dismissToast(t.id)} aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
