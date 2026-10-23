import { RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { cn } from './cn.ts'

export interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  /** Formats the value badge (default: up to 2 decimals + unit). */
  format?: (value: number) => string
  unit?: string
  /** Shows a reset button when the value differs. */
  defaultValue?: number
  hint?: string
  disabled?: boolean
  className?: string
}

/** Labelled range input with a value badge and optional reset-to-default. */
export function Slider({ label, value, min, max, step, onChange, format, unit = '', defaultValue, hint, disabled, className }: SliderProps) {
  const id = useId()
  const shown = format ? format(value) : `${Number(value.toFixed(2))}${unit}`
  const pct = ((value - min) / (max - min)) * 100
  const changed = defaultValue !== undefined && Math.abs(value - defaultValue) > 1e-9
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-center gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </label>
        {changed && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={`Reset ${label.toLowerCase()}`}
            aria-label={`Reset ${label.toLowerCase()}`}
          >
            <RotateCcw className="size-3" aria-hidden />
          </button>
        )}
        <span className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300">{shown}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rf-range w-full"
        style={{ ['--rf-range-pct' as string]: `${pct}%` }}
      />
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}
