/**
 * Field controls used by the KIND_SPECS-driven entry forms: month/year picker (+ Present), tags
 * input and level picker. Each takes a `fieldRef` from useFieldFocus so the ATS checker can jump
 * to it. OWNER: shell agent.
 */
import { X } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode, type RefCallback } from 'react'
import { MONTHS_LONG, MONTHS_SHORT, parseStored, toStored } from '../../lib/dates.ts'
import { addTags, yearOptions } from '../../lib/shell.ts'
import { cn, FieldShell, inputClass } from '../../ui'

const selectClass = cn(inputClass, 'h-9 min-w-0 py-1.5 pr-7 pl-2.5')

/* ---------------- month / year ---------------- */

export interface MonthFieldProps {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  fieldRef?: RefCallback<HTMLDivElement>
  flash?: boolean
  disabled?: boolean
  /** Extra control under the selects (e.g. the Present toggle). */
  footer?: ReactNode
  className?: string
}

/** Month + year selects storing 'YYYY-MM' (or 'YYYY' when no month). Legacy free text is shown and can be replaced. */
export function MonthField({ label, value, onChange, fieldRef, flash, disabled, footer, className }: MonthFieldProps) {
  const id = useId()
  const parsed = parseStored(value)
  const legacy = value.trim() && !parsed ? value.trim() : ''
  // A month picked before any year is kept here (not saved) until a year is chosen — never guess the year.
  const [pendingMonth, setPendingMonth] = useState(0)
  const year = parsed?.year ?? 0
  const month = parsed ? parsed.month || 0 : pendingMonth
  const years = useMemo(() => {
    const ys = yearOptions()
    if (year && !ys.includes(year)) ys.push(year)
    return ys.sort((a, b) => b - a)
  }, [year])
  const set = (m: number, y: number) => {
    if (!y) {
      setPendingMonth(m)
      if (parsed) onChange('')
      return
    }
    setPendingMonth(0)
    onChange(toStored({ year: y, month: m }))
  }
  return (
    <FieldShell className={className} flash={flash} hint={legacy ? `Saved as text: “${legacy}” — pick a month and year to standardise it.` : !year && pendingMonth ? 'Pick a year to save this date.' : undefined}>
      <div ref={fieldRef} role="group" aria-labelledby={`${id}-l`}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span id={`${id}-l`} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {label}
          </span>
          {(value || legacy || pendingMonth > 0) && !disabled && (
            <button type="button" onClick={() => (setPendingMonth(0), onChange(''))} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Clear date" title="Clear date">
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
        <div className="grid grid-cols-[1.15fr_1fr] gap-1.5">
          <select aria-label="Month" value={month} disabled={disabled} onChange={(e) => set(Number(e.target.value), year)} className={selectClass}>
            <option value={0}>{year ? 'Month (optional)' : 'Month'}</option>
            {MONTHS_SHORT.map((m, i) => (
              <option key={m} value={i + 1} title={MONTHS_LONG[i]}>
                {m}
              </option>
            ))}
          </select>
          <select aria-label="Year" value={year} disabled={disabled} onChange={(e) => set(month, Number(e.target.value))} className={selectClass}>
            <option value={0}>Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {footer}
      </div>
    </FieldShell>
  )
}

/** End date with a "Present" toggle (`current`). */
export function EndField({ label, value, current, presentLabel, onChange, onCurrent, fieldRef, flash, className }: { label: ReactNode; value: string; current: boolean; presentLabel: string; onChange: (v: string) => void; onCurrent: (v: boolean) => void; fieldRef?: RefCallback<HTMLDivElement>; flash?: boolean; className?: string }) {
  return (
    <MonthField
      label={label}
      value={current ? '' : value}
      onChange={onChange}
      disabled={current}
      fieldRef={fieldRef}
      flash={flash}
      className={className}
      footer={
        <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={current} onChange={(e) => onCurrent(e.target.checked)} className="size-4 rounded border-slate-300 accent-indigo-600" />
          {presentLabel}
        </label>
      }
    />
  )
}

/* ---------------- tags ---------------- */

export interface TagsInputProps {
  label: ReactNode
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  fieldRef?: RefCallback<HTMLDivElement>
  flash?: boolean
  className?: string
}

/** Chips + input: Enter / comma adds, Backspace on empty removes the last, paste splits lists. */
export function TagsInput({ label, tags, onChange, placeholder, fieldRef, flash, className }: TagsInputProps) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const commit = (text = draft) => {
    const next = addTags(tags, text)
    if (next !== tags) onChange(next)
    setDraft('')
  }
  return (
    <FieldShell className={className} flash={flash} label={label} htmlFor={id} hint={tags.length ? `${tags.length} item${tags.length === 1 ? '' : 's'} · Enter or comma to add` : 'Type and press Enter or comma — paste a list to add many'}>
      <div ref={fieldRef} className={cn(inputClass, 'flex min-h-9 flex-wrap items-center gap-1 px-1.5 py-1 focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400')}>
        {tags.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-indigo-50 py-0.5 pr-0.5 pl-2 text-xs font-medium text-indigo-800 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/20">
            <span className="truncate">{t}</span>
            <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="grid size-4 shrink-0 place-items-center rounded text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-500/30 dark:hover:text-white" aria-label={`Remove ${t}`}>
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          data-native-undo=""
          value={draft}
          placeholder={tags.length ? '' : placeholder}
          onChange={(e) => {
            const v = e.target.value
            if (/[,;\n]/.test(v)) commit(v)
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Backspace' && !draft && tags.length) {
              onChange(tags.slice(0, -1))
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (/[,;\n•]/.test(text)) {
              e.preventDefault()
              commit(draft + text)
            }
          }}
          onBlur={() => draft.trim() && commit()}
          className="h-7 min-w-[6rem] flex-1 border-0 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
    </FieldShell>
  )
}

/* ---------------- level ---------------- */

export interface LevelPickerProps {
  label: ReactNode
  level: number
  labels: string[]
  onChange: (level: number) => void
  fieldRef?: RefCallback<HTMLButtonElement>
  flash?: boolean
  className?: string
}

/** 0–5 proficiency as a radio group of bars; 0 = not shown. Arrow keys change the value. */
export function LevelPicker({ label, level, labels, onChange, fieldRef, flash, className }: LevelPickerProps) {
  const id = useId()
  const move = (d: number) => onChange(Math.max(0, Math.min(5, level + d)))
  return (
    <FieldShell className={className} flash={flash}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span id={id} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </span>
        <span className={cn('text-xs font-semibold', level ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400')}>{level ? labels[level] || `${level}/5` : 'Not shown'}</span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex h-9 items-center gap-1 rounded-lg bg-white px-1.5 shadow-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        onKeyDown={(e) => {
          const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
          if (!d) return
          e.preventDefault()
          move(d)
          const group = e.currentTarget
          requestAnimationFrame(() => group.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus())
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const on = n === level
          const text = n === 0 ? 'Not shown' : labels[n] || `${n} of 5`
          return (
            <button
              key={n}
              ref={on ? fieldRef : undefined}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={text}
              title={text}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(n)}
              className={cn('group grid h-7 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', n === 0 ? 'w-7' : 'flex-1')}
            >
              {n === 0 ? (
                <X className={cn('size-3.5', on ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 group-hover:text-slate-500 dark:text-slate-600')} aria-hidden />
              ) : (
                <span className={cn('h-2 w-full rounded-full transition', n <= level ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-200 group-hover:bg-indigo-200 dark:bg-slate-700 dark:group-hover:bg-indigo-500/40')} />
              )}
            </button>
          )
        })}
      </div>
    </FieldShell>
  )
}
