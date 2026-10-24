/**
 * Turn section view-models into pagination blocks:
 *   summary                → 1 block: heading + paragraphs
 *   whole(section) ≠ undef → 1 block: heading + that node (chip clouds, compact lists …)
 *   otherwise              → heading + first entry, then one block per entry
 * The last block of a section gets gap 'section', the others 'entry'.
 * Short lists (≤ SHORT_LIST_MAX one-line-ish entries: languages, certifications …) are kept on one page
 * (`keepWithNext`), so a lone item is never stranded on the next page apart from its heading.
 */
import type { ReactNode } from 'react'
import type { EntryView, SectionView } from '../../lib/templateData.ts'
import type { Block } from '../types.ts'
import { DefaultEntry } from './entries.tsx'
import { isShortList } from './keep.ts'
import { RichParagraphs } from './Rich.tsx'

export interface BlockRenderers {
  /** Section heading — included in the section's first block. */
  heading: (section: SectionView) => ReactNode
  /** One entry (default: <DefaultEntry entry={e} />). */
  entry?: (entry: EntryView, section: SectionView, index: number) => ReactNode
  /** Summary body (default: <RichParagraphs text={section.content} />). */
  summary?: (section: SectionView) => ReactNode
  /** Return a node to render the whole section as ONE block, or undefined to split per entry. */
  whole?: (section: SectionView) => ReactNode | undefined
  /** Wrap every block's node (e.g. a per-section class or a timeline rail). */
  wrap?: (node: ReactNode, info: { section: SectionView; entry?: EntryView; first: boolean; last: boolean }) => ReactNode
  /** Mark blocks for cover-letter mode (rarely wanted for sections). */
  letter?: boolean
}

export function sectionsToBlocks(sections: SectionView[], r: BlockRenderers): Block[] {
  const blocks: Block[] = []
  const wrap = r.wrap ?? ((n: ReactNode) => n)
  for (const s of sections) {
    if (s.kind === 'summary') {
      const body = r.summary ? r.summary(s) : <RichParagraphs text={s.content} />
      blocks.push({ key: `${s.id}:all`, sectionId: s.id, gap: 'section', letter: r.letter, node: wrap(<>{r.heading(s)}{body}</>, { section: s, first: true, last: true }) })
      continue
    }
    const whole = r.whole?.(s)
    if (whole !== undefined) {
      blocks.push({ key: `${s.id}:all`, sectionId: s.id, gap: 'section', letter: r.letter, node: wrap(<>{r.heading(s)}{whole}</>, { section: s, first: true, last: true }) })
      continue
    }
    const keep = isShortList(s)
    s.entries.forEach((e, i) => {
      const body = r.entry ? r.entry(e, s, i) : <DefaultEntry entry={e} />
      const first = i === 0
      const last = i === s.entries.length - 1
      blocks.push({
        key: `${s.id}:${e.id}`,
        sectionId: s.id,
        entryId: e.id,
        gap: last ? 'section' : 'entry',
        keepWithNext: keep && !last ? true : undefined,
        letter: r.letter,
        node: wrap(first ? <>{r.heading(s)}{body}</> : body, { section: s, entry: e, first, last }),
      })
    })
  }
  return blocks
}
