/** "Deleted · Undo" toasts that only undo when nothing else changed since. OWNER: shell agent. */
import { getActiveDoc, resumeActions, toast } from '../store'

export function undoableToast(message: string): void {
  const doc = getActiveDoc()
  const snap = doc ? { id: doc.id, data: doc.data, design: doc.design, letter: doc.coverLetter } : null
  toast(message, 'info', {
    duration: 6000,
    action: {
      label: 'Undo',
      onClick: () => {
        const now = getActiveDoc()
        if (snap && now && now.id === snap.id && now.data === snap.data && now.design === snap.design && now.coverLetter === snap.letter) resumeActions.undo()
        else toast('Other changes were made since — use Undo in the toolbar', 'info')
      },
    },
  })
}
