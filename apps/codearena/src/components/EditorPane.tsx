import { Check, CodeXml, LoaderCircle, Minus, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { FONT_SIZE, updateSettings } from '../lib/progress.ts'
import { FOCUS_RING, ICON_BUTTON } from '../lib/theme.ts'
import type { Problem } from '../problems/types.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Editor } from './editor/Editor.tsx'

interface EditorPaneProps {
  problem: Problem
  code: string
  onChange: (code: string) => void
  onReset: () => void
  fontSize: number
  saveState: 'saved' | 'saving'
}

export function EditorPane({ problem, code, onChange, onReset, fontSize, saveState }: EditorPaneProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const setFontSize = (size: number) => updateSettings({ fontSize: Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, size)) })

  return (
    <section aria-label="Code editor" className="@container flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line pr-1.5 pl-3">
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <CodeXml className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="font-medium text-ink">Code</span>
          <span className="rounded-md bg-raised px-2 py-0.5 text-xs text-ink-muted">JavaScript</span>
          <span className="hidden items-center gap-1 text-xs whitespace-nowrap text-ink-faint @lg:flex">
            {saveState === 'saving' ? (
              <>
                <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden /> Saving…
              </>
            ) : (
              <>
                <Check className="size-3" aria-hidden /> Saved locally
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <div className="flex items-center" role="group" aria-label="Editor font size">
            <button
              type="button"
              onClick={() => setFontSize(fontSize - 1)}
              disabled={fontSize <= FONT_SIZE.min}
              className={ICON_BUTTON}
              aria-label="Decrease font size"
              title="Decrease font size"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-9 text-center font-mono text-xs tabular-nums text-ink-muted" aria-live="polite">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={() => setFontSize(fontSize + 1)}
              disabled={fontSize >= FONT_SIZE.max}
              className={ICON_BUTTON}
              aria-label="Increase font size"
              title="Increase font size"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-hover hover:text-ink ${FOCUS_RING}`}
            title="Reset to the starter code"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            <span className="hidden @sm:inline">Reset</span>
            <span className="sr-only @sm:hidden">Reset code</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor value={code} onChange={onChange} fontSize={fontSize} label={`Solution code for ${problem.title}`} />
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset to starter code?"
        message="Your current code for this problem will be replaced with the original starter template. Past submissions are kept."
        confirmLabel="Reset code"
        tone="danger"
        onConfirm={onReset}
        onClose={() => setConfirmReset(false)}
      />
    </section>
  )
}
