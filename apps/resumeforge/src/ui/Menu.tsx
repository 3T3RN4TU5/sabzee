import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { cn } from './cn.ts'

export interface MenuItem {
  key: string
  label: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string }>
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
}

export interface MenuProps {
  /** Render the trigger; spread `props` onto a button. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode
  items: (MenuItem | 'separator' | { heading: string })[]
  align?: 'left' | 'right'
  className?: string
  width?: string
}

/** Small dropdown menu with keyboard support (arrows, Enter, Escape). */
export function Menu({ trigger, items, align = 'right', className, width = 'w-64' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const btns = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not([disabled])') ?? [])
        const i = btns.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.key === 'ArrowDown' ? btns[(i + 1) % btns.length] : btns[(i - 1 + btns.length) % btns.length]
        next?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    setTimeout(() => root.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not([disabled])')?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className={cn('relative', className)}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div role="menu" className={cn('absolute z-40 mt-2 overflow-hidden rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10 dark:bg-slate-900 dark:ring-white/10', width, align === 'right' ? 'right-0' : 'left-0')}>
          {items.map((item, i) => {
            if (item === 'separator') return <div key={`sep${i}`} className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            if ('heading' in item)
              return (
                <div key={`h${i}`} className="px-2.5 pt-2 pb-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  {item.heading}
                </div>
              )
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-slate-100 focus:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:focus:bg-slate-800',
                  item.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200',
                )}
              >
                {Icon && <Icon className="mt-0.5 size-4 shrink-0 opacity-70" />}
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  {item.description && <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
