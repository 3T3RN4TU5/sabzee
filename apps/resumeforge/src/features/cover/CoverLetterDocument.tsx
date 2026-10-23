/**
 * Cover letter rendered with the active template's styling: <PagedDocument letter={blocks}> keeps the
 * template's page frame, header (name/title/contact), accent and fonts, plus every block the template
 * marked `letter: true` (e.g. Modern's photo + contact sidebar), and replaces the resume body with the
 * letter blocks. Paragraphs paginate like resume entries. The visual layout (classic / accent /
 * minimal) is a per-resume preference (./letterPrefs.ts) unless passed explicitly.
 *
 * OWNER: cover agent.
 */
import { useCallback, useMemo } from 'react'
import type { LetterLayoutId } from '../../lib/letterTools.ts'
import type { FieldTarget } from '../../lib/target.ts'
import type { CoverLetter, Design, ResumeData } from '../../lib/types.ts'
import { PagedDocument, type DocMode, type LayoutInfo } from '../../templates'
import { letterBlocks } from './letterBlocks.tsx'
import { setLetterPages, useLetterLayout } from './letterPrefs.ts'
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
  /** Visual layout; defaults to the active resume's saved choice. */
  layout?: LetterLayoutId
}

export function CoverLetterDocument({ data, design, letter, mode = 'preview', scale = 1, pageGap, onLayout, onBlockClick, layout }: CoverLetterDocumentProps) {
  const saved = useLetterLayout()
  const lay = layout ?? saved
  const blocks = useMemo(() => letterBlocks(letter, data, lay), [letter, data, lay])
  const handleLayout = useCallback(
    (info: LayoutInfo) => {
      if (mode === 'preview') setLetterPages(info.pages)
      onLayout?.(info)
    },
    [mode, onLayout],
  )
  return <PagedDocument data={data} design={design} letter={blocks} mode={mode} scale={scale} pageGap={pageGap} onLayout={handleLayout} onBlockClick={onBlockClick} className={`rf-letter rf-letter--${lay}`} />
}
