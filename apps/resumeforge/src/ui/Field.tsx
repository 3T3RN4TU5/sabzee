import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn.ts'

export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:placeholder:text-slate-500 dark:focus:ring-indigo-400'

export interface FieldShellProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** id of the control (generated when omitted). */
  htmlFor?: string
  className?: string
  children: ReactNode
  /** Highlight ring (e.g. useFieldFocus().flash). */
  flash?: boolean
}

export function FieldShell({ label, hint, error, htmlFor, className, children, flash }: FieldShellProps) {
  return (
    <div className={cn('min-w-0 rounded-lg transition', flash && 'ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-900', className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  )
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  flash?: boolean
  onValue?: (value: string) => void
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange']
  shellClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, flash, onValue, onChange, className, shellClassName, id, ...rest }, ref) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid} className={shellClassName} flash={flash}>
      <input
        ref={ref}
        id={fid}
        className={cn(inputClass, !!error && 'ring-rose-400 focus:ring-rose-500 dark:ring-rose-500/70', className)}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          onChange?.(e)
          onValue?.(e.target.value)
        }}
        {...rest}
      />
    </FieldShell>
  )
})

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  flash?: boolean
  onValue?: (value: string) => void
  onChange?: TextareaHTMLAttributes<HTMLTextAreaElement>['onChange']
  shellClassName?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, hint, error, flash, onValue, onChange, className, shellClassName, id, rows = 4, ...rest }, ref) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid} className={shellClassName} flash={flash}>
      <textarea
        ref={ref}
        id={fid}
        rows={rows}
        className={cn(inputClass, 'resize-y leading-relaxed', className)}
        onChange={(e) => {
          onChange?.(e)
          onValue?.(e.target.value)
        }}
        {...rest}
      />
    </FieldShell>
  )
})

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: ReactNode
  hint?: ReactNode
  options: { value: string; label: string }[]
  onValue?: (value: string) => void
  shellClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, options, onValue, className, shellClassName, id, ...rest }, ref) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell label={label} hint={hint} htmlFor={fid} className={shellClassName}>
      <select ref={ref} id={fid} className={cn(inputClass, 'pr-8', className)} onChange={(e) => onValue?.(e.target.value)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
})

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, description, disabled, className }: ToggleProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50',
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
        )}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}
