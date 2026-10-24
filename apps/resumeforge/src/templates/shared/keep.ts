/**
 * "Keep with next" on top of lib/paginate.ts: blocks flagged `keep` travel to the next page together
 * with the block after them, so a short list (two certifications, three languages) is never split with
 * a lone item — or its heading — stranded on another page. Pure (no React/DOM) so it can be unit-tested.
 */
import { distribute, type MeasuredBlock } from '../../lib/paginate.ts'
import type { SectionView } from '../../lib/templateData.ts'

/**
 * @param blocks measured blocks in reading order
 * @param keep keep[i] = block i must stay on the same page as block i + 1
 * @param available available column height for a page index
 * @param maxGroup a kept group taller than this (px) is not kept together (it could never fit a page)
 * @returns block indices for each page (same shape as `distribute`)
 */
export function distributeKept(blocks: MeasuredBlock[], keep: readonly boolean[], available: (page: number) => number, maxGroup = available(1) * 0.5): number[][] {
  // chains of indices that must stay together
  const groups: number[][] = []
  for (let i = 0; i < blocks.length; i++) {
    const g = [i]
    while (keep[i] && i + 1 < blocks.length) g.push(++i)
    const height = g.reduce((h, j) => h + blocks[j].height, 0)
    if (g.length > 1 && height - blocks[g[g.length - 1]].gap > maxGroup) groups.push(...g.map((j) => [j]))
    else groups.push(g)
  }
  if (groups.length === blocks.length) return distribute(blocks, available)
  const merged: MeasuredBlock[] = groups.map((g) => ({ height: g.reduce((h, j) => h + blocks[j].height, 0), gap: blocks[g[g.length - 1]].gap }))
  return distribute(merged, available).map((page) => page.flatMap((gi) => groups[gi]))
}

/** Kinds whose entries are a line or two each. */
const SHORT_KINDS = new Set<SectionView['kind']>(['languages', 'certifications', 'awards', 'interests', 'skills'])
export const SHORT_LIST_MAX = 3

/** Should this section's entries stay together on one page? */
export function isShortList(s: Pick<SectionView, 'kind' | 'entries'>): boolean {
  return SHORT_KINDS.has(s.kind) && s.entries.length > 1 && s.entries.length <= SHORT_LIST_MAX
}

