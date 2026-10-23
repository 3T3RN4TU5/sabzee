/** Store-writing helpers shared by the analysis panel and the bullet helper (non-component module). */
import type { Issue } from '../../lib/analysis.ts'
import type { Placement } from '../../lib/jobMatch.ts'
import type { FieldTarget } from '../../lib/target.ts'
import type { Basics, SectionKind } from '../../lib/types.ts'
import { focusField, getActiveDoc, resumeActions, toast, uiActions } from '../../store'
import { copyText } from '../io/download.ts'

/** Replace the text behind a target (bullet, summary, entry text field or basics field) as one undo step. */
export function writeAt(t: FieldTarget, text: string): boolean {
  if (!t.sectionId) {
    if (!t.field) return false
    resumeActions.updateBasics({ [t.field]: text } as Partial<Basics>, null)
    return true
  }
  if (!t.entryId) {
    if (t.field !== 'content' && t.field !== 'title') return false
    resumeActions.updateSection(t.sectionId, { [t.field]: text }, null)
    return true
  }
  if (t.field === 'bullets') {
    if (t.bullet === undefined) return false
    resumeActions.updateBullet(t.sectionId, t.entryId, t.bullet, text, null)
    return true
  }
  if (!t.field) return false
  resumeActions.updateEntry(t.sectionId, t.entryId, { [t.field]: text }, null)
  return true
}

/** Toast with an Undo button for one-click edits made outside the content editor. */
export function toastWithUndo(message: string): void {
  toast(message, 'success', { action: { label: 'Undo', onClick: () => void resumeActions.undo() } })
}

export async function copyWithToast(text: string, what = `“${text}”`): Promise<void> {
  const ok = await copyText(text)
  toast(ok ? `Copied ${what}` : 'Could not copy to the clipboard', ok ? 'success' : 'error')
}

/** Create a section (with one entry) and jump to it — or to its first entry's `field`. */
export function addSectionAndFocus(kind: SectionKind, field?: string): void {
  const sectionId = resumeActions.addSection(kind, { withEntry: true, ...(kind === 'summary' ? { index: 0 } : {}) })
  const s = getActiveDoc()?.data.sections.find((x) => x.id === sectionId)
  if (kind === 'summary') return focusField({ sectionId, field: 'content' })
  const entry = s?.items[0]
  focusField(entry ? (field ? { sectionId, entryId: entry.id, field } : { sectionId, entryId: entry.id, field: 'title' }) : { sectionId })
}

export function goToPlacement(p: Placement): void {
  if (p.target) focusField(p.target)
  else if (p.addKind) addSectionAndFocus(p.addKind, p.addKind === 'skills' ? 'keywords' : undefined)
}

export interface IssueAction {
  label: string
  run: () => void
}

/** What the "Fix" button does: jump to the target, or a sensible fallback for target-less issues. */
export function issueAction(issue: Issue): IssueAction | null {
  if (issue.target) return { label: 'Fix', run: () => focusField(issue.target!) }
  switch (issue.rule) {
    case 'experience-missing':
      return { label: 'Add experience', run: () => addSectionAndFocus('experience') }
    case 'education-missing':
      return { label: 'Add education', run: () => addSectionAndFocus('education') }
    case 'summary-missing':
      return { label: 'Add summary', run: () => addSectionAndFocus('summary') }
    case 'skills-few':
      return { label: 'Add skills', run: () => addSectionAndFocus('skills', 'keywords') }
    case 'pages':
      return { label: 'Adjust design', run: () => uiActions.setPanel('design') }
    default:
      return null
  }
}
