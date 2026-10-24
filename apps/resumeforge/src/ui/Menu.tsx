import { Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { cn } from './cn.ts'
import { useDismiss, useKeepInViewport } from './hooks.ts'

export interface MenuItem {
  key: string
  label: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string }>
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
  /** Radio/check state: renders a check mark and role="menuitemradio". */
  checked?: boolean
  /** Right-aligned hint (e.g. a keyboard shortcut). */
  hint?: ReactNode
}

export interface MenuProps {
  /** Render the trigger; spread `props` onto a button. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode
  items: (MenuItem | 'separator' | { heading: string })[]
  align?: 'left' | 'right'
  className?: string
  width?: string
  /** Open upwards (e.g. for triggers near the bottom of the screen). */
  side?: 'bottom' | 'top'
  /** Accessible name of the menu. */
  label?: string
}

/** Small dropdown menu with keyboard support (arrows, Home/End, Enter, Escape). Stays inside the viewport. */
export function Menu({ trigger, items, align = 'right', className, width = 'w-64', side = 'bottom', label }: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const triggerEl = useRef<HTMLElement | null>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, root, triggerEl)
  const dx = useKeepInViewport(open, panel)

  useEffect(() => {
    if (!open) return
    triggerEl.current = root.current?.querySelector<HTMLElement>('[aria-haspopup]') ?? null
    const onKey = (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
      e.preventDefault()
      const btns = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role^=menuitem]:not([disabled])') ?? [])
      if (!btns.length) return
      const i = btns.indexOf(document.activeElement as HTMLButtonElement)
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length
      btns[next]?.focus()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const checked = panel.current?.querySelector<HTMLButtonElement>('[aria-checked=true]:not([disabled])')
      ;(checked ?? panel.current?.querySelector<HTMLButtonElement>('[role^=menuitem]:not([disabled])'))?.focus()
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className={cn('relative', className)}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div
          ref={panel}
          role="menu"
          aria-label={label}
          style={dx ? { translate: `${dx}px 0` } : undefined}
          className={cn(
            'absolute z-40 max-h-[min(70vh,34rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10 dark:bg-slate-900 dark:ring-white/10',
            width,
            align === 'right' ? 'right-0' : 'left-0',
            side === 'top' ? 'bottom-full mb-2' : 'mt-2',
          )}
        >
          {items.map((item, i) => {
            if (item === 'separator') return <div key={`sep${i}`} role="separator" className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            if ('heading' in item)
              return (
                <div key={`h${i}`} className="px-2.5 pt-2 pb-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  {item.heading}
                </div>
              )
            const Icon = item.icon
            const radio = item.checked !== undefined
            return (
              <button
                key={item.key}
                type="button"
                role={radio ? 'menuitemradio' : 'menuitem'}
                aria-checked={radio ? item.checked : undefined}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  triggerEl.current?.focus()
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800',
                  item.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200',
                )}
              >
                {Icon && <Icon className="mt-0.5 size-4 shrink-0 opacity-70" />}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  {item.description && <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>}
                </span>
                {item.hint && <span className="mt-0.5 shrink-0 text-xs text-slate-400 dark:text-slate-500">{item.hint}</span>}
                {radio && <Check className={cn('mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400', !item.checked && 'invisible')} aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
