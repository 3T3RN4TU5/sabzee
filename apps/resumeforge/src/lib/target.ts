/**
 * Field targets: a stable address for any editable field, shared by the ATS checker (Issue.target),
 * the preview (click a block → edit it) and the editor (scroll/focus/highlight).
 *
 *   {}                                         → the basics/personal-details group
 *   { field: 'email' }                         → a basics field
 *   { sectionId }                              → a section card
 *   { sectionId, field: 'content' }            → summary text
 *   { sectionId, field: 'title' }              → section title input (no entryId)
 *   { sectionId, entryId }                     → an entry card
 *   { sectionId, entryId, field }              → an entry field (keyof Entry)
 *   { sectionId, entryId, field: 'bullets', bullet: 2 } → one bullet
 */
import type { Target } from './analysis.ts'

export type FieldTarget = Target

/** Canonical string key — used for the focus registry. */
export function targetKey(t: FieldTarget): string {
  return `${t.sectionId ?? 'basics'}/${t.entryId ?? '-'}/${t.field ?? '-'}/${t.bullet ?? '-'}`
}

/** The target itself followed by each less specific ancestor (bullet → field → entry → section/basics). */
export function targetAncestors(t: FieldTarget): FieldTarget[] {
  const out: FieldTarget[] = []
  const push = (x: FieldTarget) => {
    if (!out.some((o) => targetKey(o) === targetKey(x))) out.push(x)
  }
  push(t)
  if (t.bullet !== undefined) push({ sectionId: t.sectionId, entryId: t.entryId, field: t.field })
  if (t.field !== undefined) push({ sectionId: t.sectionId, entryId: t.entryId })
  if (t.entryId !== undefined) push({ sectionId: t.sectionId })
  if (t.sectionId === undefined) push({})
  return out
}

/**
 * Is `request` inside (or equal to) `container`? A container with no sectionId is the basics group
 * and only contains basics targets.
 */
export function isWithin(request: FieldTarget, container: FieldTarget): boolean {
  if ((request.sectionId ?? null) !== (container.sectionId ?? null)) return false
  if (container.entryId !== undefined && request.entryId !== container.entryId) return false
  if (container.field !== undefined && request.field !== container.field) return false
  if (container.bullet !== undefined && request.bullet !== container.bullet) return false
  return true
}

export function sameTarget(a: FieldTarget | null | undefined, b: FieldTarget | null | undefined): boolean {
  if (!a || !b) return a === b
  return targetKey(a) === targetKey(b)
}
