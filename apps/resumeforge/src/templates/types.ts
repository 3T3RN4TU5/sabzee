/**
 * Template contract. A template is a folder `src/templates/<id>/` whose `index.tsx` exports
 *   export const meta: TemplateMeta
 *   export default function MyTemplate(props: TemplateProps) { return <PageLayout … /> }
 * The registry discovers folders automatically (import.meta.glob), so adding a template never
 * touches a shared file. See the contract document for the full guide.
 */
import type { ReactNode } from 'react'
import type { FontPairing } from '../lib/fonts.ts'
import type { SectionView } from '../lib/templateData.ts'
import type { Design, FontId, ResumeData, SectionKind, TemplateId } from '../lib/types.ts'

export type TemplateTag = 'ATS-friendly' | 'Two-column' | 'Photo' | 'Creative' | 'One-page' | 'Classic' | 'Modern'

export interface TemplateMeta {
  id: TemplateId
  name: string
  /** One sentence for the gallery. */
  description: string
  tags: TemplateTag[]
  /** Gallery position (ascending). Modern = 10, then 20, 30 … */
  order: number
  /** Renders basics.photo when design.showPhoto is on. */
  supportsPhoto: boolean
  columns: 1 | 2
  /** Used when design.font === 'auto'. */
  defaultFont: FontId
  /** Suggested accent (the design panel may offer "use template colours"). */
  defaultAccent: string
  /** Two-column only: kinds placed in the side column when section.column === 'auto'. */
  sideKinds?: SectionKind[]
  /** Heading case used when design.headingCase === 'auto' (default 'upper'). */
  headingCase?: 'upper' | 'normal'
  /** Vertical gaps in px at design.spacing = 1 (defaults: entry 10, section 18). */
  gaps?: { entry?: number; section?: number }
}

export type DocMode = 'preview' | 'print' | 'thumbnail'

export interface TemplateProps {
  /** Raw data (use for basics; prefer `sections`/`main`/`side` for content). */
  data: ResumeData
  /** The design as stored (font may be 'auto' — use `font` instead). */
  design: Design
  meta: TemplateMeta
  /** Visible, non-empty sections in order, as view-models (see lib/templateData.ts). */
  sections: SectionView[]
  /** Sections for the main column (all sections for single-column templates). */
  main: SectionView[]
  /** Sections for the side column (always [] for single-column templates). */
  side: SectionView[]
  /** Resolved font pairing (design.font, or meta.defaultFont when 'auto'). */
  font: FontPairing
  /** Resolved heading case (design.headingCase, or meta.headingCase when 'auto'). */
  headingCase: 'upper' | 'normal'
  mode: DocMode
  /** True when rendering a cover letter with this template's header/frame. */
  isLetter: boolean
}

/**
 * The unit of pagination. A block is never split across pages. Typical blocks:
 *   - section heading + first entry
 *   - each following entry
 *   - a whole small section (summary, a chip cloud …)
 */
export interface Block {
  /** Stable, unique within its column. */
  key: string
  node: ReactNode
  /** Used for click-to-edit and data attributes. */
  sectionId?: string
  entryId?: string
  /**
   * Space after the block: 'entry' (between entries of a section), 'section' (after the last block
   * of a section), 'none', or px (all multiplied by design.spacing). Default 'entry'.
   */
  gap?: 'entry' | 'section' | 'none' | number
  /** Also show this block in cover-letter mode (contact details, photo …). */
  letter?: boolean
}

/** What a template's `page` render function receives for every page. */
export interface PageSlots {
  /** 0-based page index. */
  index: number
  /** Total pages (approximate during measurement — never let it change layout). */
  count: number
  /** The `header` node on page 0, null on later pages. */
  header: ReactNode
  /** Main column slot — place it exactly once. */
  main: ReactNode
  /** Side column slot — place it exactly once in two-column templates (it may be empty). */
  side: ReactNode
}

export interface PageLayoutProps {
  /** Page-1-only content (name, title, contact …). The `page` function decides where it goes. */
  header?: ReactNode
  main: Block[]
  side?: Block[]
  /**
   * Renders one page's frame and places the slots. The returned element fills the page box
   * (paper width × height, overflow hidden). Rules: column widths must not depend on `index`;
   * the slots must sit in normal top-to-bottom flow (no vertical centring / flex gap on them).
   */
  page: (slots: PageSlots) => ReactNode
  /**
   * Space reserved at the bottom of every page, in px (default: design.margin in mm → px).
   * Blocks are placed so they end above `pageHeight - bottom`.
   */
  bottom?: number
  /** Override meta.gaps for this render. */
  gaps?: { entry?: number; section?: number }
}

export interface LayoutInfo {
  templateId: TemplateId
  pages: number
  /** A single block was taller than a page and got clipped. */
  overflow: boolean
}

export interface TemplateModule {
  meta: TemplateMeta
  default: (props: TemplateProps) => ReactNode
}

export interface TemplateDef extends TemplateMeta {
  Component: (props: TemplateProps) => ReactNode
}
