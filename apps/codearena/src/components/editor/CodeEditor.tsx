import { javascript, javascriptLanguage, scopeCompletionSource } from '@codemirror/lang-javascript'
import { syntaxTree } from '@codemirror/language'
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror, { EditorView, Prec, type BasicSetupOptions, type Extension } from '@uiw/react-codemirror'
import { useMemo } from 'react'

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  fontSize: number
  /** Accessible name for the editable region. */
  label: string
}

/** Blends One Dark into the surrounding panel and uses the app's mono font. */
const chrome = Prec.highest(
  EditorView.theme(
    {
      '&': { height: '100%', backgroundColor: 'transparent' },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.65' },
      '.cm-content': { paddingBlock: '10px' },
      '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: '#4b5263' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#abb2bf' },
      '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.035)' },
      '.cm-tooltip': { borderRadius: '8px', overflow: 'hidden' },
    },
    { dark: true },
  ),
)

/**
 * Globals offered by autocomplete (members too, e.g. `Math.` → `max`). Only
 * built-ins that exist in the judge's Web Worker: `globalThis` here would also
 * suggest DOM APIs such as `document` or `localStorage`, which user code cannot reach.
 */
const JUDGE_GLOBALS = Object.assign(Object.create(null) as object, {
  Array, BigInt, Boolean, Date, Error, Float64Array, Infinity, Int32Array, JSON, Map, Math, NaN, Number,
  Object, Promise, RangeError, Reflect, RegExp, Set, String, Symbol, TypeError, Uint8Array, WeakMap, WeakSet,
  console, isFinite, isNaN, parseFloat, parseInt, structuredClone,
})

/** Flags the first parse error from the Lezer syntax tree while typing. */
const syntaxErrors = linter(
  (view) => {
    const diagnostics: Diagnostic[] = []
    syntaxTree(view.state).iterate({
      enter(node) {
        if (diagnostics.length > 0) return false
        if (node.type.isError) {
          diagnostics.push({ from: node.from, to: node.to, severity: 'error', message: 'Syntax error' })
        }
        return undefined
      },
    })
    return diagnostics
  },
  { delay: 500 },
)

const EDITOR_SETUP: BasicSetupOptions = { tabSize: 2, highlightActiveLine: true, foldGutter: true }
const VIEWER_SETUP: BasicSetupOptions = {
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  autocompletion: false,
  dropCursor: false,
  highlightSelectionMatches: false,
}

export default function CodeEditor({ value, onChange, readOnly = false, fontSize, label }: CodeEditorProps) {
  const extensions = useMemo<Extension[]>(() => {
    const shared = [javascript(), chrome, EditorView.contentAttributes.of({ 'aria-label': label })]
    // The read-only viewer scrolls sideways like a code block: wrapped lines would lose their indentation.
    if (readOnly) return shared
    return [
      ...shared,
      javascriptLanguage.data.of({ autocomplete: scopeCompletionSource(JUDGE_GLOBALS) }),
      syntaxErrors,
      lintGutter(),
    ]
  }, [readOnly, label])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={extensions}
      basicSetup={readOnly ? VIEWER_SETUP : EDITOR_SETUP}
      editable={!readOnly}
      readOnly={readOnly}
      height={readOnly ? 'auto' : '100%'}
      className={readOnly ? '' : 'h-full'}
      style={{ fontSize }}
    />
  )
}
