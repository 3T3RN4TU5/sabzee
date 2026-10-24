/**
 * UI state: editor panel, mobile tab, preview zoom, page count, field-focus requests, toasts,
 * modals, confirm dialogs and print jobs. Only `panel` and `zoom` are persisted (separate key).
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { FieldTarget } from '../lib/target.ts'
import type { CoverLetter, Design, ResumeData } from '../lib/types.ts'
import { persistStorage } from './storage.ts'

export type EditorPanel = 'content' | 'design' | 'analysis' | 'cover'
export type AnalysisTab = 'ats' | 'jd'
export type MobileTab = 'edit' | 'preview'
export type Zoom = 'fit' | number
export type ToastKind = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  kind: ToastKind
  action?: ToastAction
  /** ms before auto-dismiss (0 = sticky). */
  duration: number
}

/** Known modal ids (features may use any string). */
export type ModalId = 'import' | 'templates' | 'snapshots' | 'share' | (string & {})

export interface ModalState {
  id: ModalId
  props: Record<string, unknown>
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button. */
  danger?: boolean
}

export interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/** What to print. Without data/design the active resume is used. */
export interface PrintJob {
  target: 'resume' | 'letter'
  data?: ResumeData
  design?: Design
  letter?: CoverLetter
}

export interface FocusRequest {
  target: FieldTarget
  nonce: number
}

export interface UiState {
  panel: EditorPanel
  analysisTab: AnalysisTab
  mobileTab: MobileTab
  zoom: Zoom
  /** Pages in the active resume preview (reported by the preview's PagedDocument onLayout). */
  pageCount: number
  /** Current "jump to field" request (see focus.ts). */
  focus: FocusRequest | null
  /** Key of the element currently flashing after a focus request. */
  flash: { key: string; nonce: number } | null
  toasts: Toast[]
  modal: ModalState | null
  confirm: ConfirmState | null
  /** Job rendered by PrintRoot while the browser print dialog is open. */
  printing: PrintJob | null
  /** What Ctrl+P prints on the current screen (set by screens via usePrintSource). */
  printSource: PrintJob | null
  /** The last localStorage write failed (quota full / storage blocked): changes are NOT being saved. */
  saveError: boolean
}

export const useUiStore = create<UiState>()(
  persist(
    (): UiState => ({
      panel: 'content',
      analysisTab: 'ats',
      mobileTab: 'edit',
      zoom: 'fit',
      pageCount: 1,
      focus: null,
      flash: null,
      toasts: [],
      modal: null,
      confirm: null,
      printing: null,
      printSource: null,
      saveError: false,
    }),
    {
      name: 'resumeforge-ui',
      version: 1,
      storage: createJSONStorage(() => persistStorage),
      partialize: (s) => ({ panel: s.panel, zoom: s.zoom }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UiState>
        const panels: EditorPanel[] = ['content', 'design', 'analysis', 'cover']
        return {
          ...current,
          panel: panels.includes(p.panel as EditorPanel) ? (p.panel as EditorPanel) : current.panel,
          zoom: p.zoom === 'fit' || (typeof p.zoom === 'number' && p.zoom >= 0.25 && p.zoom <= 2) ? p.zoom : current.zoom,
        }
      },
    },
  ),
)

const set = useUiStore.setState
const get = useUiStore.getState

let toastSeq = 0

/** Keep at most `max` timed toasts (the newest); sticky ones (duration 0, e.g. "storage is full") are never evicted. */
function capToasts(toasts: Toast[], max: number): Toast[] {
  const timed = toasts.filter((t) => t.duration !== 0)
  const drop = new Set(timed.slice(0, Math.max(0, timed.length - max)))
  return toasts.filter((t) => !drop.has(t))
}

export const ZOOM_LIMITS = { min: 0.3, max: 2, step: 0.1 }

export const uiActions = {
  setPanel(panel: EditorPanel): void {
    set({ panel })
  },
  setAnalysisTab(analysisTab: AnalysisTab): void {
    set({ analysisTab, panel: 'analysis' })
  },
  setMobileTab(mobileTab: MobileTab): void {
    set({ mobileTab })
  },
  setZoom(zoom: Zoom): void {
    set({ zoom: zoom === 'fit' ? 'fit' : Math.round(Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, zoom)) * 100) / 100 })
  },
  setPageCount(pageCount: number): void {
    if (get().pageCount !== pageCount) set({ pageCount })
  },

  /** Show a toast; returns its id. Errors stay 6 s, others 3.5 s (override with `duration`, 0 = sticky). */
  toast(message: string, kind: ToastKind = 'info', opts: { duration?: number; action?: ToastAction } = {}): string {
    const id = `t${++toastSeq}`
    const duration = opts.duration ?? (kind === 'error' ? 6000 : 3500)
    set((s) => ({ toasts: [...capToasts(s.toasts, 3), { id, message, kind, action: opts.action, duration }] }))
    if (duration > 0) setTimeout(() => uiActions.dismissToast(id), duration)
    return id
  },
  dismissToast(id: string): void {
    set((s) => (s.toasts.some((t) => t.id === id) ? { toasts: s.toasts.filter((t) => t.id !== id) } : s))
  },

  openModal(id: ModalId, props: Record<string, unknown> = {}): void {
    set({ modal: { id, props } })
  },
  closeModal(): void {
    set({ modal: null })
  },

  /** Promise-based confirm dialog (rendered by the shell's ConfirmDialog). */
  confirm(opts: ConfirmOptions): Promise<boolean> {
    get().confirm?.resolve(false)
    return new Promise((resolve) => set({ confirm: { ...opts, resolve } }))
  },
  resolveConfirm(ok: boolean): void {
    const c = get().confirm
    if (!c) return
    set({ confirm: null })
    c.resolve(ok)
  },

  startPrint(job: PrintJob): void {
    set({ printing: job })
  },
  endPrint(): void {
    if (get().printing) set({ printing: null })
  },
  setPrintSource(printSource: PrintJob | null): void {
    set({ printSource })
  },
}

/* ---------------- save status (localStorage quota) ---------------- */

let saveToastId: string | null = null
const SAVE_ERROR_MESSAGE = 'Changes are not being saved — browser storage is full. Delete old versions or resumes, or export a backup (Download → JSON).'
const STORAGE_BLOCKED_MESSAGE = 'Changes are not being saved — this browser is blocking site storage (private mode or privacy settings). Export a backup (Download → JSON) before you close the tab.'
const storageBlocked = (): boolean => {
  try {
    return typeof localStorage === 'undefined' || !localStorage
  } catch {
    return true
  }
}

persistStorage.onStatus = (ok) => {
  const was = get().saveError
  if (ok === !was) return
  set({ saveError: !ok })
  if (!ok) {
    saveToastId = uiActions.toast(storageBlocked() ? STORAGE_BLOCKED_MESSAGE : SAVE_ERROR_MESSAGE, 'error', { duration: 0 })
  } else {
    if (saveToastId) uiActions.dismissToast(saveToastId)
    saveToastId = null
    uiActions.toast('Saving works again — all changes are stored', 'success')
  }
}

export type UiActions = typeof uiActions

/** Shorthands. */
export const toast = uiActions.toast
export const confirmDialog = uiActions.confirm
