import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { cx } from './ui.tsx'

/**
 * Drag handle between two panels. `value` is whatever unit the parent uses (pixels or a
 * fraction); `toValue` converts a pointer position into that unit. Keyboard: arrows nudge,
 * Home/End jump to the limits.
 */
export function Splitter({
  orientation,
  value,
  min,
  max,
  step,
  label,
  onChange,
  toValue,
}: {
  orientation: 'vertical' | 'horizontal'
  value: number
  min: number
  max: number
  step: number
  label: string
  onChange: (v: number) => void
  toValue: (clientX: number, clientY: number) => number
}) {
  const dragging = useRef(false)
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onChange(clamp(toValue(e.clientX, e.clientY)))
  }
  const end = () => {
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dec = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp'
    const inc = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'
    if (e.key === dec) onChange(clamp(value - step))
    else if (e.key === inc) onChange(clamp(value + step))
    else if (e.key === 'Home') onChange(min)
    else if (e.key === 'End') onChange(max)
    else return
    e.preventDefault()
  }
  const vertical = orientation === 'vertical'
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuemin={Math.round(min * 100) / 100}
      aria-valuemax={Math.round(max * 100) / 100}
      aria-valuenow={Math.round(value * 100) / 100}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKeyDown}
      className={cx(
        'group relative z-10 flex shrink-0 touch-none items-center justify-center outline-none',
        vertical ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize',
      )}
    >
      <div
        className={cx(
          'rounded-full bg-white/[0.06] transition group-hover:bg-cyan-400/60 group-focus-visible:bg-cyan-400',
          vertical ? 'h-full w-px group-hover:w-0.5' : 'h-px w-full group-hover:h-0.5',
        )}
      />
    </div>
  )
}
