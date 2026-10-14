import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { badgeTone, typeBadge, type TypeCategory } from '../lib/types.ts'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={cx('animate-spin text-cyan-300', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function TypeBadge({ category, title }: { category: TypeCategory; title?: string }) {
  return (
    <span className={cx('badge', badgeTone(category))} title={title ?? category}>
      {typeBadge(category)}
    </span>
  )
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
      {icon && <div className="grid size-11 place-items-center rounded-xl bg-white/[0.04] text-slate-400 ring-1 ring-white/10">{icon}</div>}
      <div className="max-w-md">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        {children && <div className="mt-1 text-[13px] leading-relaxed text-slate-400">{children}</div>}
      </div>
      {action}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="eyebrow mb-1 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'fade-in pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] shadow-xl shadow-black/40',
            t.tone === 'error' && 'border-rose-400/30 bg-rose-950/90 text-rose-100',
            t.tone === 'success' && 'border-emerald-400/30 bg-emerald-950/90 text-emerald-100',
            t.tone === 'info' && 'border-white/10 bg-slate-900/95 text-slate-100',
          )}
        >
          <span className="min-w-0 flex-1 break-words">{t.message}</span>
          <button type="button" className="text-current/60 hover:text-current" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cx(
        'm-auto max-h-[85dvh] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-0 text-slate-200 shadow-2xl shadow-black/60 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close dialog">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
export const MOD = isMac ? '⌘' : 'Ctrl'
