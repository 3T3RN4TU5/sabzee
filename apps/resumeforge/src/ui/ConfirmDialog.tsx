import { uiActions, useUiStore } from '../store'
import { Button } from './Button.tsx'
import { Modal } from './Modal.tsx'

/** Renders the promise-based `confirmDialog()` (mounted once by the shell). */
export function ConfirmDialog() {
  const c = useUiStore((s) => s.confirm)
  return (
    <Modal
      open={!!c}
      onClose={() => uiActions.resolveConfirm(false)}
      title={c?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => uiActions.resolveConfirm(false)}>
            {c?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={c?.danger ? 'danger' : 'primary'} onClick={() => uiActions.resolveConfirm(true)} data-autofocus>
            {c?.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      {c?.message && <p className="text-sm text-slate-600 dark:text-slate-300">{c.message}</p>}
    </Modal>
  )
}
