/**
 * Cover letter rendered with the active template's styling: <PagedDocument letter={blocks}> keeps the
 * template's page frame, header (name/title/contact) and every block the template marked
 * `letter: true` (e.g. Modern's photo + contact sidebar), and replaces the resume body with the
 * letter blocks below. The letter paginates like a resume (paragraphs are blocks).
 *
 * OWNER: cover agent (working baseline).
 */
import { useMemo } from 'react'
import type { FieldTarget } from '../../lib/target.ts'
import type { CoverLetter, Design, ResumeData } from '../../lib/types.ts'
import { PagedDocument, type DocMode, type LayoutInfo } from '../../templates'
import { letterBlocks } from './letterBlocks.tsx'
import './letter.css'

export interface CoverLetterDocumentProps {
  data: ResumeData
  design: Design
  letter: CoverLetter
  mode?: DocMode
  scale?: number
  pageGap?: number
  onLayout?: (info: LayoutInfo) => void
  onBlockClick?: (target: FieldTarget) => void
}

export function CoverLetterDocument({ data, design, letter, mode = 'preview', scale = 1, pageGap, onLayout, onBlockClick }: CoverLetterDocumentProps) {
  const blocks = useMemo(() => letterBlocks(letter, data), [letter, data])
  return <PagedDocument data={data} design={design} letter={blocks} mode={mode} scale={scale} pageGap={pageGap} onLayout={onLayout} onBlockClick={onBlockClick} />
}
