import { useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

interface SplitHandleProps {
  /** `x` resizes widths (a vertical bar), `y` resizes heights (a horizontal bar). */
  axis: 'x' | 'y'
  /** Element whose size the percentage is measured against. */
  containerRef: RefObject<HTMLElement | null>
  value: number
  min: number
  max: number
  label: string
  /** Live updates while dragging. */
  onChange: (value: number) => void
  /** Final value once a drag or key press finishes. */
  onCommit: (value: number) => void
}

const KEY_STEP = 2

/** Draggable, keyboard-accessible splitter (WAI-ARIA window splitter pattern). */
export function SplitHandle({ axis, containerRef, value, min, max, label, onChange, onCommit }: SplitHandleProps) {
  const dragging = useRef(false)
  const latest = useRef(value)

  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  const valueFromPointer = (event: PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return value
    const ratio = axis === 'x' ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height
    return clamp(ratio * 100)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    latest.current = value
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    latest.current = valueFromPointer(event)
    onChange(latest.current)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    onCommit(latest.current)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const decrease = axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
    const increase = axis === 'x' ? 'ArrowRight' : 'ArrowDown'
    let next: number | null = null
    if (event.key === decrease) next = value - KEY_STEP
    else if (event.key === increase) next = value + KEY_STEP
    else if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    if (next === null) return
    event.preventDefault()
    onCommit(clamp(next))
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className={`group flex shrink-0 touch-none items-center justify-center outline-none ${
        axis === 'x' ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'
      }`}
    >
      <span
        className={`rounded-full bg-line-strong transition-colors group-hover:bg-accent/70 group-focus-visible:bg-accent group-active:bg-accent ${
          axis === 'x' ? 'h-10 w-0.5' : 'h-0.5 w-10'
        }`}
        aria-hidden
      />
    </div>
  )
}
