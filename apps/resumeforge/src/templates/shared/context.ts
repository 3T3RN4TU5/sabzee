import { createContext, useContext, type CSSProperties } from 'react'
import type { FontPairing } from '../../lib/fonts.ts'
import type { FieldTarget } from '../../lib/target.ts'
import type { PaperSize } from '../../lib/templateData.ts'
import type { Design, ResumeData } from '../../lib/types.ts'
import type { Block, DocMode, LayoutInfo, TemplateMeta } from '../types.ts'

/** Provided by <PagedDocument>; read by <PageLayout> and the shared primitives. */
export interface DocContextValue {
  data: ResumeData
  design: Design
  meta: TemplateMeta
  font: FontPairing
  headingCase: 'upper' | 'normal'
  mode: DocMode
  paper: PaperSize
  scale: number
  maxPages?: number
  /** Unscaled px between pages (preview/thumbnail). */
  pageGap: number
  /** Cover-letter body blocks; when set, the resume body is replaced. */
  letterBlocks: Block[] | null
  /** Preview with click-to-edit. */
  interactive: boolean
  onBlockClick?: (target: FieldTarget) => void
  onLayout?: (info: LayoutInfo) => void
  /** Class names / CSS variables for every `.rf-doc` root (visible pages and the measuring copy). */
  rootClassName: string
  rootStyle: CSSProperties
}

export const DocContext = createContext<DocContextValue | null>(null)

/** Access the current document (design, data, mode …) from inside a template. */
export function useDocContext(): DocContextValue {
  const ctx = useContext(DocContext)
  if (!ctx) throw new Error('Template components must be rendered inside <PagedDocument>')
  return ctx
}

/** Like useDocContext but returns null outside a document (for primitives used elsewhere). */
export function useOptionalDocContext(): DocContextValue | null {
  return useContext(DocContext)
}
