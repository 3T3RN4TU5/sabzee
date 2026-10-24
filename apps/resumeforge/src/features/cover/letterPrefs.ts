/**
 * Cover-letter UI state that is not part of the data model: the page count of the letter preview
 * (memory only). The visual layout lives in `doc.coverLetter.layout` (so it travels with backups and
 * undo); layouts saved by older builds in localStorage['resumeforge-letter'] are migrated once here.
 */
import { create } from 'zustand'
import { applyLegacyLetterLayouts, DEFAULT_LETTER_LAYOUT, type LetterLayoutId } from '../../lib/letterTools.ts'
import { resumeActions, useResumeStore } from '../../store'

const LEGACY_KEY = 'resumeforge-letter'

function migrateLegacyLayouts(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw == null) return
    const s = useResumeStore.getState()
    const resumes = applyLegacyLetterLayouts(s.resumes, JSON.parse(raw))
    if (resumes !== s.resumes) useResumeStore.setState({ resumes })
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* unreadable legacy prefs: ignore */
  }
}
migrateLegacyLayouts()

interface LetterPrefsState {
  /** Pages of the letter shown in the preview (set by CoverLetterDocument in preview mode). */
  pages: number
}

export const useLetterPrefs = create<LetterPrefsState>()(() => ({ pages: 1 }))

/** Change the active resume's letter layout (undoable). */
export function setLetterLayout(layout: LetterLayoutId): void {
  resumeActions.updateCoverLetter({ layout }, null)
}

export function setLetterPages(pages: number): void {
  if (useLetterPrefs.getState().pages !== pages) useLetterPrefs.setState({ pages })
}

/** Layout of the active resume's cover letter. */
export function useLetterLayout(): LetterLayoutId {
  return useResumeStore((s) => s.resumes.find((r) => r.id === s.activeId)?.coverLetter.layout ?? DEFAULT_LETTER_LAYOUT)
}
