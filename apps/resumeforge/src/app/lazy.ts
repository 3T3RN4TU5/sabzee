/**
 * Code-split feature modules and routes. The shell (and the editor, for BulletHelper) render these
 * inside <Suspense>. Feature owners keep the named exports and props stable; nobody needs to edit
 * this file to change a feature's internals.
 */
import { lazy } from 'react'

export const AnalysisPanel = lazy(() => import('../features/analysis/AnalysisPanel.tsx').then((m) => ({ default: m.AnalysisPanel })))
export const BulletHelper = lazy(() => import('../features/analysis/BulletHelper.tsx').then((m) => ({ default: m.BulletHelper })))
export const CoverLetterEditor = lazy(() => import('../features/cover/CoverLetterEditor.tsx').then((m) => ({ default: m.CoverLetterEditor })))
export const CoverLetterDocument = lazy(() => import('../features/cover/CoverLetterDocument.tsx').then((m) => ({ default: m.CoverLetterDocument })))
export const ExportMenu = lazy(() => import('../features/io/ExportMenu.tsx').then((m) => ({ default: m.ExportMenu })))
export const ImportDialog = lazy(() => import('../features/io/ImportDialog.tsx').then((m) => ({ default: m.ImportDialog })))
export const SharedView = lazy(() => import('../features/io/SharedView.tsx').then((m) => ({ default: m.SharedView })))
export const TemplateLab = lazy(() => import('./TemplateLab.tsx').then((m) => ({ default: m.TemplateLab })))

/* routes (shell) */
const loadEditor = () => import('./EditorScreen.tsx')
const loadDashboard = () => import('./DashboardScreen.tsx')
export const EditorScreen = lazy(() => loadEditor().then((m) => ({ default: m.EditorScreen })))
export const DashboardScreen = lazy(() => loadDashboard().then((m) => ({ default: m.DashboardScreen })))
export const ShortcutsDialog = lazy(() => import('./ShortcutsDialog.tsx').then((m) => ({ default: m.ShortcutsDialog })))
export const NewResumeDialog = lazy(() => import('../features/dashboard/NewResumeDialog.tsx').then((m) => ({ default: m.NewResumeDialog })))

/** Warm the chunks the user is likely to need next (called when the editor becomes idle). */
export function prefetchFeatures(): void {
  void import('../features/io/ExportMenu.tsx')
  void import('../features/analysis/AnalysisPanel.tsx')
  void import('../features/analysis/BulletHelper.tsx')
  void import('../features/cover/CoverLetterDocument.tsx')
  void import('../features/cover/CoverLetterEditor.tsx')
  void import('./ShortcutsDialog.tsx')
}

/** Warm the editor route from the dashboard. */
export function prefetchEditor(): void {
  void loadEditor()
}
