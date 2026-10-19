import { memo, useDeferredValue } from 'react'
import { paperSize } from '../../lib/templateData.ts'
import type { Design, ResumeData, TemplateId } from '../../lib/types.ts'
import { PagedDocument } from './PagedDocument.tsx'

export interface TemplateThumbnailProps {
  data: ResumeData
  design: Design
  /** Template to render (default design.template). */
  templateId?: TemplateId
  /** Rendered width in CSS px; height follows the paper ratio (first page only). */
  width: number
  className?: string
}

/** First page of a resume, scaled to `width` — for galleries and dashboard cards. */
export const TemplateThumbnail = memo(function TemplateThumbnail({ data: liveData, design: liveDesign, templateId, width, className }: TemplateThumbnailProps) {
  // Thumbnails are low priority: keep typing/slider drags responsive when many are on screen.
  const data = useDeferredValue(liveData)
  const design = useDeferredValue(liveDesign)
  const paper = paperSize(design.paper)
  const scale = width / paper.widthPx
  return (
    <div className={className} style={{ width, height: paper.heightPx * scale, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
      <PagedDocument data={data} design={design} templateId={templateId} mode="thumbnail" scale={scale} maxPages={1} />
    </div>
  )
})
