/** Public store API — import from 'src/store' (e.g. `import { resumeActions, useActiveDoc } from '../store'`). */
export {
  useResumeStore,
  resumeActions,
  getActiveDoc,
  selectActiveDoc,
  useActiveDoc,
  useActiveData,
  useActiveDesign,
  useResumes,
  useTheme,
  useHistoryState,
  flushPersist,
  MAX_SNAPSHOTS,
  type ResumeStoreState,
  type ResumeActions,
  type UndoValue,
  type CreateOptions,
  type DeletedResume,
} from './resumeStore.ts'
export {
  useUiStore,
  uiActions,
  toast,
  confirmDialog,
  ZOOM_LIMITS,
  type UiState,
  type UiActions,
  type EditorPanel,
  type AnalysisTab,
  type MobileTab,
  type Zoom,
  type Toast,
  type ToastKind,
  type ToastAction,
  type ModalId,
  type ModalState,
  type ConfirmOptions,
  type PrintJob,
  type FocusRequest,
} from './uiStore.ts'
export { focusField, useFieldFocus, useFocusRequest, useRevealOnFocus, mergeRefs, FLASH_MS } from './focus.ts'
export { useRoute, navigate, currentRoute, type Route } from './router.ts'
export type { FieldTarget } from '../lib/target.ts'
