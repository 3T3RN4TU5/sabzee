import { useLayoutEffect, useState, type RefObject } from 'react'

const GAP = 1
const ROWS = 21
const MAX_COLS = 51
const MAX_CELL = 30

export interface BoardSize {
  rows: number
  cols: number
  cell: number
}

/** Odd dimensions keep maze walls on even lines and rooms on odd ones. */
export function boardSizeFor(width: number): BoardSize {
  const minCell = width >= 640 ? 24 : 21
  let cols = Math.floor((width + GAP) / (minCell + GAP))
  cols = Math.max(11, Math.min(MAX_COLS, cols))
  if (cols % 2 === 0) cols--
  // Border (2px) + gaps between cells must fit too.
  const cell = Math.max(12, Math.min(MAX_CELL, Math.floor((width - 2 - (cols - 1) * GAP) / cols)))
  return { rows: ROWS, cols, cell }
}

/** Measures the container and derives a board size; null while hidden (width 0). */
export function useBoardSize(ref: RefObject<HTMLElement | null>): BoardSize | null {
  const [size, setSize] = useState<BoardSize | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width)
      if (width <= 0) return
      const next = boardSizeFor(width)
      setSize((prev) => (prev && prev.rows === next.rows && prev.cols === next.cols && prev.cell === next.cell ? prev : next))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}
