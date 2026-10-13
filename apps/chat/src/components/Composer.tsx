import { useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, SendHorizontal } from 'lucide-react'
import { MESSAGE_MAX_LENGTH } from '../lib/config'

interface ComposerProps {
  roomSlug: string
  onSend: (content: string) => Promise<void>
  onTyping: () => void
  onStopTyping: () => void
}

const MAX_HEIGHT_PX = 200

export function Composer({ roomSlug, onSend, onTyping, onStopTyping }: ComposerProps) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputId = useId()
  const hintId = useId()

  const length = value.trim().length
  const over = length > MESSAGE_MAX_LENGTH
  const canSend = length > 0 && !over && !sending

  // Grow with content up to a cap, then scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSend) return
    const content = value
    setValue('')
    setSending(true)
    try {
      await onSend(content)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <form onSubmit={submit} aria-busy={sending} className="px-3 pb-3 sm:px-5 sm:pb-4">
      <div className="mx-auto max-w-4xl">
        <div
          className={`flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm transition focus-within:ring-4 dark:bg-ink-900 ${
            over
              ? 'border-rose-500 focus-within:ring-rose-500/15'
              : 'border-slate-300 focus-within:border-violet-500 focus-within:ring-violet-500/15 dark:border-ink-700'
          }`}
        >
          <label htmlFor={inputId} className="sr-only">
            Message #{roomSlug}
          </label>
          <textarea
            id={inputId}
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (e.target.value.trim()) onTyping()
              else onStopTyping()
            }}
            onKeyDown={handleKeyDown}
            onBlur={onStopTyping}
            placeholder={`Message #${roomSlug}`}
            aria-describedby={hintId}
            aria-invalid={over || undefined}
            className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 sm:text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={sending ? 'Sending message' : 'Send message'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-500 focus-visible:ring-4 focus-visible:ring-violet-500/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-ink-700 dark:disabled:text-slate-500"
          >
            {sending ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" /> : <SendHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
        </div>
        <div id={hintId} className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="hidden sm:inline">
            <kbd className="font-sans font-semibold">Enter</kbd> to send · <kbd className="font-sans font-semibold">Shift + Enter</kbd> for a new line ·{' '}
            <code className="font-mono">`code`</code> · <code className="font-mono">```block```</code>
          </span>
          <span className="sm:hidden">Shift + Enter for a new line</span>
          <span
            className={`tabular-nums ${over ? 'font-semibold text-rose-500' : length > MESSAGE_MAX_LENGTH * 0.9 ? 'text-amber-500' : ''}`}
            aria-live={over ? 'polite' : 'off'}
          >
            {length}/{MESSAGE_MAX_LENGTH}
            {over && <span className="sr-only"> — message is too long</span>}
          </span>
        </div>
      </div>
    </form>
  )
}
