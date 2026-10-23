import { useId, useRef, type ComponentType, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn.ts'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** Accessible label when `label` is visual only. */
  ariaLabel?: string
  title?: string
  disabled?: boolean
}

export interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Visible group label. */
  label?: ReactNode
  /** Accessible name when there is no visible label. */
  ariaLabel?: string
  size?: 'xs' | 'sm'
  className?: string
  disabled?: boolean
  /** Stretch options to fill the width. */
  block?: boolean
}

/** Radio group styled as a segmented control (arrow keys move the selection). */
export function Segmented<T extends string>({ value, onChange, options, label, ariaLabel, size = 'sm', className, disabled, block = true }: SegmentedProps<T>) {
  const labelId = useId()
  const group = useRef<HTMLDivElement>(null)
  const enabled = options.filter((o) => !o.disabled)
  const onKey = (e: KeyboardEvent) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key) || !enabled.length) return
    e.preventDefault()
    const i = enabled.findIndex((o) => o.value === value)
    const n = enabled.length
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n
    onChange(enabled[next].value)
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus())
  }
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <div id={labelId} className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </div>
      )}
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        onKeyDown={onKey}
        className={cn('flex gap-0.5 rounded-lg bg-slate-100 p-0.5 ring-1 ring-slate-200/70 dark:bg-slate-800/80 dark:ring-slate-700/60', block ? 'w-full' : 'inline-flex', disabled && 'opacity-50')}
      >
        {options.map((o) => {
          const on = o.value === value
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.ariaLabel}
              title={o.title}
              tabIndex={on ? 0 : -1}
              disabled={disabled || o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                'inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 disabled:cursor-not-allowed',
                block && 'flex-1',
                size === 'xs' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-[13px]',
                on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-950 dark:text-white dark:ring-white/10' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
              )}
            >
              {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
              {o.label !== '' && <span className="truncate">{o.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
