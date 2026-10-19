/**
 * Renders the modal named by `useUiStore().modal` (open with `uiActions.openModal(id, props)`).
 * Add a case here for new app-level modals. OWNER: shell agent.
 */
import { Suspense } from 'react'
import { uiActions, useUiStore } from '../store'
import { ImportDialog } from './lazy.ts'

export function ModalHost() {
  const modal = useUiStore((s) => s.modal)
  if (!modal) return null
  switch (modal.id) {
    case 'import':
      return (
        <Suspense fallback={null}>
          <ImportDialog open onClose={uiActions.closeModal} />
        </Suspense>
      )
    default:
      return null
  }
}
