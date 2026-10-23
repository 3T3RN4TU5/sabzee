/**
 * Editor-local UI state (not persisted): which section/entry cards are expanded. Kept outside the
 * components so it survives switching panels (Content → Design → Content). OWNER: shell agent.
 */
import { create } from 'zustand'

interface EditorUiState {
  open: Record<string, boolean>
}

export const useEditorUi = create<EditorUiState>(() => ({ open: {} }))

export function setOpen(id: string, value: boolean): void {
  useEditorUi.setState((s) => (s.open[id] === value ? s : { open: { ...s.open, [id]: value } }))
}

export function setManyOpen(ids: readonly string[], value: boolean): void {
  useEditorUi.setState((s) => {
    const open = { ...s.open }
    for (const id of ids) open[id] = value
    return { open }
  })
}

/** Expanded state of a card; `fallback` applies until the user toggles it. */
export function useIsOpen(id: string, fallback: boolean): boolean {
  return useEditorUi((s) => s.open[id] ?? fallback)
}
