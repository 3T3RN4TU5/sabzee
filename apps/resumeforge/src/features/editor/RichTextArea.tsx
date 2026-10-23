/** Markdown-aware textarea (B / I / link toolbar, Ctrl+B/I/K, auto-grow, word count). OWNER: shell agent. */
import { Bold, Italic, Link2 } from 'lucide-react'
import { useId, useMemo, useRef, type ReactNode, type RefCallback } from 'react'
import type { MarkKind } from '../../lib/shell.ts'
import { mergeRefs } from '../../store'
import { cn, FieldShell, inputClass } from '../../ui'
import { applyMarkTo, countWords, handleMarkShortcut } from './markEdit.ts'

const TOOLS: { kind: MarkKind; icon: typeof Bold; label: string }[] = [
  { kind: 'bold', icon: Bold, label: 'Bold (Ctrl+B)' },
  { kind: 'italic', icon: Italic, label: 'Italic (Ctrl+I)' },
  { kind: 'link', icon: Link2, label: 'Link (Ctrl+K)' },
]

/** B / I / link buttons. `target()` returns the textarea to act on (mousedown keeps its selection). */
export function MarkToolbar({ target, commit, className }: { target: () => HTMLTextAreaElement | HTMLInputElement | null; commit: (el: HTMLTextAreaElement | HTMLInputElement, value: string) => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} role="toolbar" aria-label="Formatting">
      {TOOLS.map((t) => (
        <button
          key={t.kind}
          type="button"
          title={t.label}
          aria-label={t.label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = target()
            if (el) applyMarkTo(el, t.kind, (v) => commit(el, v))
          }}
          className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <t.icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  )
}

export interface RichTextAreaProps {
  label: ReactNode
  value: string
  onValue: (value: string) => void
  placeholder?: string
  hint?: ReactNode
  rows?: number
  /** Register with the focus mechanism (useFieldFocus().ref). */
  fieldRef?: RefCallback<HTMLTextAreaElement>
  flash?: boolean
  /** Show a word count; with `ideal` [min, max] it turns amber outside the range. */
  words?: { ideal?: [number, number] }
  className?: string
}

export function RichTextArea({ label, value, onValue, placeholder, hint, rows = 4, fieldRef, flash, words, className }: RichTextAreaProps) {
  const id = useId()
  const el = useRef<HTMLTextAreaElement>(null)
  const n = words ? countWords(value) : 0
  const off = words?.ideal && n > 0 && (n < words.ideal[0] || n > words.ideal[1])
  const ref = useMemo(() => mergeRefs(el, fieldRef), [fieldRef])
  return (
    <FieldShell className={className} flash={flash} hint={hint}>
      <div className="mb-1 flex min-h-6 items-center gap-2 text-xs">
        <label htmlFor={id} className="mr-auto font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </label>
        {words && (
          <span className={cn('tabular-nums', off ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')} title={words.ideal ? `Aim for ${words.ideal[0]}–${words.ideal[1]} words` : undefined}>
            {n} words
          </span>
        )}
        <MarkToolbar target={() => el.current} commit={(_, v) => onValue(v)} />
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        onKeyDown={(e) => handleMarkShortcut(e, onValue)}
        className={cn(inputClass, 'field-sizing-content min-h-[5.5rem] resize-y leading-relaxed')}
      />
    </FieldShell>
  )
}
