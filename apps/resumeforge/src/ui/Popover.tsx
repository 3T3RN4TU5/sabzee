import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn.ts'
import { useDismiss, useKeepInViewport } from './hooks.ts'

export interface PopoverProps {
  /** Render the trigger; spread `props` onto a button. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-controls': string; 'aria-haspopup': 'dialog' }) => ReactNode
  /** Panel content; call `close()` to dismiss. */
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  width?: string
  /** Accessible name of the panel. */
  label: string
  className?: string
  panelClassName?: string
  /** Called whenever the panel opens/closes. */
  onOpenChange?: (open: boolean) => void
}

/** Non-modal popover panel (click outside / Escape closes, focus moves in and back). */
export function Popover({ trigger, children, align = 'right', width = 'w-80', label, className, panelClassName, onOpenChange }: PopoverProps) {
  const [open, setOpenState] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const triggerEl = useRef<HTMLElement | null>(null)
  const id = useId()
  const onChange = useRef(onOpenChange)
  useEffect(() => {
    onChange.current = onOpenChange
  })
  const setOpen = useCallback((v: boolean | ((o: boolean) => boolean)) => {
    setOpenState((o) => {
      const next = typeof v === 'function' ? v(o) : v
      if (next !== o) queueMicrotask(() => onChange.current?.(next))
      return next
    })
  }, [])
  const close = useCallback(() => setOpen(false), [setOpen])
  const closeAndRestore = useCallback(() => {
    setOpen(false)
    document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(id)}"]`)?.focus()
  }, [setOpen, id])
  useDismiss(open, close, root, triggerEl)
  const dx = useKeepInViewport(open, panel)

  useEffect(() => {
    if (!open) return
    triggerEl.current = root.current?.querySelector<HTMLElement>('[aria-haspopup]') ?? null
    const t = setTimeout(() => (panel.current?.querySelector<HTMLElement>('[data-autofocus], input, button, textarea, select') ?? panel.current)?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  return (
    <div ref={root} className={cn('relative', className)}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'dialog' })}
      {open && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          style={dx ? { translate: `${dx}px 0` } : undefined}
          className={cn(
            'absolute z-40 mt-2 max-w-[calc(100vw-1rem)] rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10 outline-none dark:bg-slate-900 dark:ring-white/10',
            width,
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children(closeAndRestore)}
        </div>
      )}
    </div>
  )
}
