import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import type { Board } from './board.ts'

/**
 * Renders rows × cols empty cells exactly once per size; the Board paints
 * them imperatively. Memoised so React never reconciles the cells again.
 */
export const BoardGrid = memo(function BoardGrid({ board, rows, cols, cell }: { board: Board; rows: number; cols: number; cell: number }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const announcerRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    board.attach(grid, announcerRef.current)
    return () => board.detach()
  }, [board, rows, cols])

  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, i) => <div key={i} />), [rows, cols])

  return (
    <>
      <div
        ref={gridRef}
        className="board"
        role="application"
        tabIndex={0}
        aria-roledescription="pathfinding grid"
        aria-label={`Pathfinding grid, ${rows} rows by ${cols} columns`}
        aria-describedby="board-help"
        style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px` }}
      >
        {cells}
      </div>
      <p id="board-help" className="sr-only">
        Arrow keys move the cursor. Space or Enter toggles the current brush, W toggles a weight, S places the start and T places the target.
      </p>
      <p ref={announcerRef} className="sr-only" aria-live="polite" />
    </>
  )
})
