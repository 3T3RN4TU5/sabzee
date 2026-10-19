/**
 * Pure page-distribution for the paged preview. Blocks (a section heading + first entry, or a
 * single entry) are atomic: a block that does not fit moves to the next page whole, which is
 * what `break-inside: avoid` would do in print. Each column is distributed independently.
 */
export interface MeasuredBlock {
  /** Rendered height including the trailing gap below the block. */
  height: number
  /** Trailing gap included in `height` — it may overflow the bottom of a page. */
  gap: number
}

/**
 * @param blocks measured blocks in reading order
 * @param available available column height for a page index (page 0 usually has the header)
 * @returns block indices for each page
 */
export function distribute(blocks: MeasuredBlock[], available: (page: number) => number, tolerance = 0.5): number[][] {
  const pages: number[][] = [[]]
  let used = 0
  blocks.forEach((b, i) => {
    let page = pages.length - 1
    const need = Math.max(0, b.height - b.gap)
    if (pages[page].length > 0 && used + need > available(page) + tolerance) {
      pages.push([])
      page++
      used = 0
    }
    pages[page].push(i)
    used += b.height
  })
  return pages
}

export interface ColumnLayout {
  main: number[][]
  side: number[][]
}

/** Combine column distributions into page models of equal length. */
export function zipColumns(layout: ColumnLayout): { main: number[]; side: number[] }[] {
  const n = Math.max(1, layout.main.filter((p) => p.length).length, layout.side.filter((p) => p.length).length)
  return Array.from({ length: n }, (_, i) => ({ main: layout.main[i] ?? [], side: layout.side[i] ?? [] }))
}

export function samePages(a: { main: number[]; side: number[] }[], b: { main: number[]; side: number[] }[]): boolean {
  if (a.length !== b.length) return false
  return a.every((p, i) => p.main.join() === b[i].main.join() && p.side.join() === b[i].side.join())
}
