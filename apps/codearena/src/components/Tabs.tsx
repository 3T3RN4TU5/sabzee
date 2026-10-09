import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { panelId, tabId } from '../lib/a11y.ts'
import { FOCUS_RING } from '../lib/theme.ts'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: ReactNode
  /** Small trailing text, e.g. a count. */
  badge?: ReactNode
}

interface TabsProps<T extends string> {
  /** Prefix for element ids, so tabs can point at their panels. */
  idPrefix: string
  label: string
  items: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  /** `stretch` makes tabs share the width equally (mobile switcher). */
  stretch?: boolean
  /** Below the `sm` breakpoint, show only the icon of tabs that are not selected. */
  compact?: boolean
}

/** WAI-ARIA tab list with roving focus and arrow / Home / End keys. */
export function Tabs<T extends string>({
  idPrefix,
  label,
  items,
  active,
  onChange,
  className = '',
  stretch = false,
  compact = false,
}: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next: number | null = null
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next === null) return
    event.preventDefault()
    onChange(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={`flex items-center gap-0.5 ${className}`}>
      {items.map((item, index) => {
        const selected = item.id === active
        return (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, item.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`relative flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${FOCUS_RING} ${
              stretch ? 'flex-1' : ''
            } ${selected ? 'bg-raised text-ink' : 'text-ink-faint hover:bg-raised/50 hover:text-ink-muted'}`}
          >
            {item.icon}
            <span className={compact && !selected ? 'sr-only sm:not-sr-only' : undefined}>{item.label}</span>
            {item.badge !== undefined && <span className="text-[11px] tabular-nums text-ink-faint">{item.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}
