import { TriangleAlert } from 'lucide-react'
import { Component, lazy, Suspense, type ReactNode } from 'react'
import { Spinner } from '../ui.tsx'
import type { CodeEditorProps } from './CodeEditor.tsx'

// CodeMirror is the heaviest dependency, so it lives in its own lazily loaded chunk.
const CodeEditor = lazy(() => import('./CodeEditor.tsx'))

class EditorErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex h-full min-h-32 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-muted">
        <TriangleAlert className="size-6 text-medium" aria-hidden />
        <p>The code editor failed to load. Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-raised px-3 py-1.5 font-medium text-ink hover:bg-hover"
        >
          Reload
        </button>
      </div>
    )
  }
}

export function Editor(props: CodeEditorProps) {
  return (
    <EditorErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-full min-h-24 items-center justify-center gap-2 text-sm text-ink-faint">
            <Spinner /> Loading editor…
          </div>
        }
      >
        <CodeEditor {...props} />
      </Suspense>
    </EditorErrorBoundary>
  )
}
