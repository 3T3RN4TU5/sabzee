/**
 * Cover-letter preferences that are not part of the CoverLetter data model: the visual layout per
 * resume (persisted in localStorage['resumeforge-letter']) and the page count of the letter preview
 * (memory only). Kept inside the cover feature so the frozen store/types need no change.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_LETTER_LAYOUT, isLetterLayout, type LetterLayoutId } from '../../lib/letterTools.ts'
import { useResumeStore } from '../../store'

interface LetterPrefsState {
  layouts: Record<string, LetterLayoutId>
  /** Pages of the letter shown in the preview (set by CoverLetterDocument in preview mode). */
  pages: number
}

export const useLetterPrefs = create<LetterPrefsState>()(
  persist(() => ({ layouts: {}, pages: 1 }), {
    name: 'resumeforge-letter',
    version: 1,
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ layouts: s.layouts }),
    merge: (persisted, current) => {
      const raw = (persisted as Partial<LetterPrefsState> | undefined)?.layouts
      const layouts: Record<string, LetterLayoutId> = {}
      if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (isLetterLayout(v)) layouts[k] = v
      return { ...current, layouts }
    },
  }),
)

export function setLetterLayout(docId: string, layout: LetterLayoutId): void {
  useLetterPrefs.setState((s) => ({ layouts: { ...s.layouts, [docId]: layout } }))
}

export function setLetterPages(pages: number): void {
  if (useLetterPrefs.getState().pages !== pages) useLetterPrefs.setState({ pages })
}

/** Layout of the given resume (defaults to the active one). */
export function useLetterLayout(docId?: string | null): LetterLayoutId {
  const active = useResumeStore((s) => s.activeId)
  const id = docId ?? active
  return useLetterPrefs((s) => (id ? s.layouts[id] : undefined) ?? DEFAULT_LETTER_LAYOUT)
}
