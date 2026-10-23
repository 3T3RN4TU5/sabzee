/**
 * Renders the modal named by `useUiStore().modal` (open with `uiActions.openModal(id, props)`).
 * Add a case here for new app-level modals. OWNER: shell agent.
 *   'import'     → io ImportDialog
 *   'shortcuts'  → keyboard shortcut list
 *   'new-resume' → dashboard "New resume" dialog (props: { starter?, template? })
 */
import { Suspense } from 'react'
import type { StarterKind } from '../lib/samples.ts'
import type { TemplateId } from '../lib/types.ts'
import { uiActions, useUiStore } from '../store'
import { ImportDialog, NewResumeDialog, ShortcutsDialog } from './lazy.ts'

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
    case 'shortcuts':
      return (
        <Suspense fallback={null}>
          <ShortcutsDialog open onClose={uiActions.closeModal} />
        </Suspense>
      )
    case 'new-resume':
      return (
        <Suspense fallback={null}>
          <NewResumeDialog open onClose={uiActions.closeModal} starter={modal.props.starter as StarterKind | undefined} template={modal.props.template as TemplateId | undefined} />
        </Suspense>
      )
    default:
      return null
  }
}
