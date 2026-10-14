import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/format.ts'

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card p-4', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="eyebrow">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-xs text-slate-400">
        <span>{label}</span>
        {value !== undefined && <span className="font-mono text-slate-200">{value}</span>}
      </span>
      {children}
    </label>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  disabled?: boolean
}) {
  const fill = ((value - min) / (max - min || 1)) * 100
  return (
    <Field label={label} value={format ? format(value) : value}>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  )
}

/** Slider over a fixed list of values (e.g. log-spaced learning rates). */
export function StepSlider<T extends number>({
  label,
  values,
  value,
  onChange,
  format,
}: {
  label: string
  values: readonly T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
}) {
  const idx = Math.max(0, values.indexOf(value))
  return (
    <Slider
      label={label}
      value={idx}
      min={0}
      max={values.length - 1}
      onChange={(i) => onChange(values[i])}
      format={() => (format ? format(values[idx]) : String(values[idx]))}
    />
  )
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Field label={label}>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T
  options: readonly { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-white/[0.07] bg-slate-950/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg font-medium whitespace-nowrap transition',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            o.value === value ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 select-none">
      <span
        className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-cyan-500' : 'bg-white/10')}
        aria-hidden
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Button({
  children,
  onClick,
  variant = 'default',
  disabled,
  title,
  className,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'primary' | 'ghost'
  disabled?: boolean
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300',
        variant === 'default' && 'border border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]',
        variant === 'ghost' && 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 px-3 py-2">
      <div className="text-[11px] tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="font-mono text-lg font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Legend({ items }: { items: { color: string; label: ReactNode }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
