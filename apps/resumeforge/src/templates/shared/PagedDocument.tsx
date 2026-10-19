/**
 * <PagedDocument> — the entry point for rendering any resume/cover letter with any template.
 *
 * Resolves the template (registry), builds view-models and CSS variables, and renders the template
 * component inside a DocContext. The template returns a <PageLayout> (./PageLayout.tsx), which does
 * the measuring, pagination and page rendering.
 */
import { useMemo, type CSSProperties } from 'react'
import { FONT_BY_ID } from '../../lib/fonts.ts'
import type { FieldTarget } from '../../lib/target.ts'
import { buildSectionViews, paperSize, resolveFont, resolveHeadingCase } from '../../lib/templateData.ts'
import type { Design, ResumeData, TemplateId } from '../../lib/types.ts'
import { getTemplate } from '../registry.ts'
import type { Block, DocMode, LayoutInfo } from '../types.ts'
import { DocContext, type DocContextValue } from './context.ts'
import { docCssVars } from './cssVars.ts'
import { useFont } from './fonts.ts'
import { cx } from './utils.ts'

export interface PagedDocumentProps {
  data: ResumeData
  design: Design
  /** Render with another template than design.template (gallery thumbnails). */
  templateId?: TemplateId
  /** 'preview' (default): scaled pages with gaps + shadows. 'print': unscaled, exact page breaks. 'thumbnail': like preview, no interaction. */
  mode?: DocMode
  /** CSS scale for preview/thumbnail (1 = true size, 96 dpi). */
  scale?: number
  /** Render at most this many pages (thumbnails: 1). */
  maxPages?: number
  /** Unscaled px between pages in preview/thumbnail (default 32). */
  pageGap?: number
  /** Cover-letter mode: these blocks replace the resume body (template header/frame + `letter` blocks are kept). */
  letter?: Block[] | null
  /** Called when the page count / overflow state changes. */
  onLayout?: (info: LayoutInfo) => void
  /** Preview click-to-edit: called with {sectionId, entryId?} for blocks, {field:'name'} for the header. */
  onBlockClick?: (target: FieldTarget) => void
  className?: string
  style?: CSSProperties
}

export function PagedDocument({ data, design, templateId, mode = 'preview', scale = 1, maxPages, pageGap = 32, letter = null, onLayout, onBlockClick, className, style }: PagedDocumentProps) {
  const def = getTemplate(templateId ?? design.template)
  const fontId = resolveFont(design, def.defaultFont)
  const font = FONT_BY_ID[fontId] ?? FONT_BY_ID.inter
  useFont(fontId)
  const headingCase = resolveHeadingCase(design, def.headingCase ?? 'upper')
  const paper = useMemo(() => paperSize(design.paper), [design.paper])
  const views = useMemo(() => buildSectionViews(data, design, { columns: def.columns, sideKinds: def.sideKinds }), [data, design, def])
  const rootStyle = useMemo(() => ({ ...docCssVars({ design, font, paper, headingCase, gaps: def.gaps }), ...style }), [design, font, paper, headingCase, def.gaps, style])
  const interactive = mode === 'preview' && !!onBlockClick
  const rootClassName = cx('rf-doc', `rf-t-${def.id}`, className)

  const ctx = useMemo<DocContextValue>(
    () => ({ data, design, meta: def, font, headingCase, mode, paper, scale, maxPages, pageGap, letterBlocks: letter, interactive, onBlockClick, onLayout, rootClassName, rootStyle }),
    [data, design, def, font, headingCase, mode, paper, scale, maxPages, pageGap, letter, interactive, onBlockClick, onLayout, rootClassName, rootStyle],
  )
  const Template = def.Component
  return (
    <DocContext.Provider value={ctx}>
      <Template data={data} design={design} meta={def} sections={views.all} main={views.main} side={views.side} font={font} headingCase={headingCase} mode={mode} isLetter={!!letter} />
    </DocContext.Provider>
  )
}
