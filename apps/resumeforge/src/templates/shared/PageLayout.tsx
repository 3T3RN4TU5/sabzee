/**
 * <PageLayout> — the paginating layout every template returns.
 *
 *   1. renders an off-screen measuring copy (portal on <body>, unscaled, same classes/vars):
 *        page 0 frame with the header and ALL blocks of each column, plus an empty page-1 frame;
 *   2. measures each block (height + trailing gap) and where each column starts on page 0 / page ≥1;
 *   3. distributes blocks per column with lib/paginate.ts (blocks never split) and zips the columns
 *      into pages (header on page 0 only, the side column continues on later pages);
 *   4. renders the real pages at true paper size (A4 210×297 mm / Letter 8.5×11 in), stacked with a
 *      gap and scaled with a CSS transform in preview/thumbnail mode, or unscaled with exact page
 *      breaks in print mode.
 *
 * It re-measures after every render, when web fonts finish loading and when an image loads.
 * This file must not import the registry (templates import it — that would be a cycle).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { distribute, samePages, zipColumns, type MeasuredBlock } from '../../lib/paginate.ts'
import { mmToPx } from '../../lib/templateData.ts'
import type { Block, PageLayoutProps } from '../types.ts'
import { useDocContext } from './context.ts'
import { DEFAULT_GAPS } from './cssVars.ts'
import { cx } from './utils.ts'
import './base.css'

type PageModel = { main: number[]; side: number[] }

function BlockBox({ block, gap }: { block: Block; gap: number }) {
  return (
    <div className="rf-block" data-rf-block="" data-gap={gap} data-section-id={block.sectionId} data-entry-id={block.entryId} style={{ marginBottom: gap || undefined }}>
      {block.node}
    </div>
  )
}

/**
 * Paginating page layout — the element every template returns. See PageLayoutProps in ../types.ts.
 */
export function PageLayout({ header, main, side = [], page, bottom, gaps }: PageLayoutProps) {
  const ctx = useDocContext()
  const { design, paper, mode, scale, maxPages, pageGap, letterBlocks, interactive, onBlockClick, onLayout, rootClassName, rootStyle, meta } = ctx

  const mainBlocks = useMemo(() => (letterBlocks ? [...main.filter((b) => b.letter), ...letterBlocks] : main), [main, letterBlocks])
  const sideBlocks = useMemo(() => (letterBlocks ? side.filter((b) => b.letter) : side), [side, letterBlocks])

  const entryGap = (gaps?.entry ?? meta.gaps?.entry ?? DEFAULT_GAPS.entry) * design.spacing
  const sectionGap = (gaps?.section ?? meta.gaps?.section ?? DEFAULT_GAPS.section) * design.spacing
  const gapOf = (b: Block) => (b.gap === 'none' ? 0 : b.gap === 'section' ? sectionGap : typeof b.gap === 'number' ? b.gap * design.spacing : entryGap)
  const bottomPx = bottom ?? mmToPx(design.margin)

  const [model, setModel] = useState<{ pages: PageModel[]; overflow: boolean } | null>(null)
  const [, setTick] = useState(0)
  const measureRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    const root = measureRef.current
    if (!root || !root.isConnected || root.getClientRects().length === 0) return // hidden (e.g. print media)
    if (typeof matchMedia !== 'undefined' && matchMedia('print').matches) return
    const first = root.querySelector<HTMLElement>('[data-rf-measure="first"]')
    const next = root.querySelector<HTMLElement>('[data-rf-measure="next"]')
    if (!first || !next) return
    const colTop = (pageEl: HTMLElement, col: string): number | null => {
      const c = pageEl.querySelector<HTMLElement>(`[data-rf-col="${col}"]`)
      return c ? c.getBoundingClientRect().top - pageEl.getBoundingClientRect().top : null
    }
    const heights = (col: string): MeasuredBlock[] =>
      Array.from(first.querySelectorAll<HTMLElement>(`[data-rf-col="${col}"] > [data-rf-block]`)).map((el) => {
        const gap = Number(el.dataset.gap) || 0
        return { height: el.getBoundingClientRect().height + gap, gap }
      })
    const H = paper.heightPx
    const avail = (col: string) => {
      const t0 = colTop(first, col) ?? 0
      const t1 = colTop(next, col) ?? t0
      return (p: number) => H - bottomPx - (p === 0 ? t0 : t1)
    }
    const hasSideCol = colTop(first, 'side') !== null
    if (import.meta.env.DEV && sideBlocks.length && !hasSideCol) console.warn(`[templates] ${meta.id}: side blocks were given but the page frame does not place the \`side\` slot`)
    const mainH = heights('main')
    const sideH = hasSideCol ? heights('side') : []
    const mainAvail = avail('main')
    const sideAvail = avail('side')
    const mainPages = distribute(mainH, mainAvail)
    const sidePages = sideH.length ? distribute(sideH, sideAvail) : [[]]
    let pages = zipColumns({ main: mainPages, side: sidePages })
    const tooTall = (cols: number[][], hs: MeasuredBlock[], av: (p: number) => number) => cols.some((idx, p) => idx.length === 1 && hs[idx[0]].height - hs[idx[0]].gap > av(p) + 0.5)
    const overflow = tooTall(mainPages, mainH, mainAvail) || (sideH.length > 0 && tooTall(sidePages, sideH, sideAvail))
    if (maxPages && pages.length > maxPages) pages = pages.slice(0, maxPages)
    setModel((prev) => (prev && prev.overflow === overflow && samePages(prev.pages, pages) ? prev : { pages, overflow }))
  }, [paper.heightPx, bottomPx, maxPages, sideBlocks.length, meta.id])

  // Re-measure after every render (content, design and template changes all re-render).
  useLayoutEffect(() => {
    measure()
  })

  // Web fonts change metrics when they arrive; images (photo) change block heights when they load.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    fonts?.addEventListener?.('loadingdone', bump)
    fonts?.ready.then(bump).catch(() => undefined)
    const root = measureRef.current
    root?.addEventListener('load', bump, true)
    return () => {
      fonts?.removeEventListener?.('loadingdone', bump)
      root?.removeEventListener('load', bump, true)
    }
  }, [])

  const pages = model?.pages ?? [{ main: mainBlocks.map((_, i) => i), side: sideBlocks.map((_, i) => i) }]
  const count = pages.length

  const onLayoutRef = useRef(onLayout)
  useEffect(() => {
    onLayoutRef.current = onLayout
  })
  const overflow = model?.overflow ?? false
  useEffect(() => {
    if (model) onLayoutRef.current?.({ templateId: meta.id, pages: count, overflow })
  }, [model, count, overflow, meta.id])

  const column = (col: 'main' | 'side', blocks: Block[], indices: number[]) => (
    <div data-rf-col={col} className={`rf-col rf-col--${col}`}>
      {indices.map((i) => (blocks[i] ? <BlockBox key={blocks[i].key} block={blocks[i]} gap={gapOf(blocks[i])} /> : null))}
    </div>
  )
  const headerNode: ReactNode = header ? (
    <div className="rf-header" data-rf-header="" style={{ display: 'contents' }}>
      {header}
    </div>
  ) : null
  const pageBox: CSSProperties = { width: `${paper.widthMm}mm`, height: `${paper.heightMm}mm` }
  const all = (n: number) => Array.from({ length: n }, (_, i) => i)

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onBlockClick) return
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-rf-block], [data-rf-header]')
    if (!el) return
    if (el.hasAttribute('data-rf-header')) return onBlockClick({ field: 'name' })
    const { sectionId, entryId } = el.dataset
    if (sectionId) onBlockClick(entryId ? { sectionId, entryId } : { sectionId })
  }
  // Links inside an editable/thumbnail preview must not navigate away (they work in the PDF).
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if ((mode === 'thumbnail' || interactive) && (e.target as HTMLElement).closest('a')) e.preventDefault()
  }

  const printMode = mode === 'print'
  const doc = (
    <div
      className={cx(rootClassName, `rf-mode-${mode}`, interactive && 'rf-interactive')}
      style={printMode ? rootStyle : { ...rootStyle, width: paper.widthPx, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: '0 0' }}
      onClick={interactive ? onClick : undefined}
      onClickCapture={onClickCapture}
      data-pages={count}
      data-overflow={overflow ? 'true' : undefined}
      data-template={meta.id}
    >
      {pages.map((p, i) => (
        <div key={i} className="rf-page" data-page={i + 1} style={printMode || i === 0 ? pageBox : { ...pageBox, marginTop: pageGap }}>
          {page({ index: i, count, header: i === 0 ? headerNode : null, main: column('main', mainBlocks, p.main), side: column('side', sideBlocks, p.side) })}
        </div>
      ))}
    </div>
  )

  const measuring =
    typeof document === 'undefined'
      ? null
      : createPortal(
          <div className="rf-measure" aria-hidden="true" ref={measureRef}>
            <div className={rootClassName} style={rootStyle}>
              <div className="rf-page" data-rf-measure="first" style={pageBox}>
                {page({ index: 0, count: Math.max(1, count), header: headerNode, main: column('main', mainBlocks, all(mainBlocks.length)), side: column('side', sideBlocks, all(sideBlocks.length)) })}
              </div>
              <div className="rf-page" data-rf-measure="next" style={pageBox}>
                {page({ index: 1, count: Math.max(2, count), header: null, main: column('main', [], []), side: column('side', [], []) })}
              </div>
            </div>
          </div>,
          document.body,
        )

  if (printMode) {
    return (
      <>
        {doc}
        {measuring}
      </>
    )
  }
  const totalHeight = count * paper.heightPx + (count - 1) * pageGap
  return (
    <div className="rf-viewport" style={{ width: paper.widthPx * scale, height: totalHeight * scale }}>
      {doc}
      {measuring}
    </div>
  )
}
