import { useId, useRef, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

const labelClass = 'eyebrow mb-1.5 block'

interface Option<T extends string> {
  value: T
  label: string
  /** Options sharing a group are rendered inside one <optgroup>. */
  group?: string
}

function renderOptions<T extends string>(options: readonly Option<T>[]) {
  const toElement = (o: Option<T>) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  )
  const groups = [...new Set(options.map((o) => o.group))]
  if (groups.length === 1 && groups[0] === undefined) return options.map(toElement)
  return groups.map((group) => (
    <optgroup key={group ?? ''} label={group ?? 'Other'}>
      {options.filter((o) => o.group === group).map(toElement)}
    </optgroup>
  ))
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        className="select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {renderOptions(options)}
      </select>
    </div>
  )
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueText,
  disabled,
  className,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Human-readable value shown next to the label and announced to screen readers. */
  valueText: string
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
        <span className="text-xs font-medium text-slate-300 tabular-nums" aria-hidden>
          {valueText}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/** A radio group rendered as a segmented control, with arrow-key navigation. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  className,
  hideLabel,
}: {
  label: string
  value: T
  options: readonly (Option<T> & { icon?: ReactNode })[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
  hideLabel?: boolean
}) {
  const labelId = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (delta === 0) return
    e.preventDefault()
    const current = options.findIndex((o) => o.value === value)
    const next = (current + delta + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div className={className}>
      <span id={labelId} className={cn(labelClass, hideLabel && 'sr-only')}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="flex rounded-lg border border-white/10 bg-slate-950/60 p-0.5"
      >
        {options.map((o, k) => {
          const checked = o.value === value
          return (
            <button
              key={o.value}
              ref={(el) => {
                buttons.current[k] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {o.icon}
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-r from-cyan-400 to-violet-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:shadow-none',
  secondary: 'border border-white/10 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
}

export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-slate-950/40 px-3 py-2">
      <dt className="eyebrow truncate" title={hint}>
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-lg font-semibold text-white tabular-nums">{value}</dd>
    </div>
  )
}
