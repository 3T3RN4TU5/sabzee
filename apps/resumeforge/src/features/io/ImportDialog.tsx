/**
 * Import dialog (opened with `uiActions.openModal('import')`, rendered by the shell's ModalHost).
 * OWNER: io agent — baseline accepts ResumeForge JSON (v1/v2) and JSON Resume files.
 */
import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { importJson } from '../../lib/importer.ts'
import { navigate, resumeActions, toast } from '../../store'
import { Button, Modal } from '../../ui'

export interface ImportDialogProps {
  open: boolean
  onClose: () => void
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function handle(file: File) {
    setError(null)
    try {
      const imported = importJson(JSON.parse(await file.text()))
      const id = resumeActions.importDoc(imported)
      toast(`Imported “${imported.name}”`, 'success')
      onClose()
      navigate({ name: 'edit', id })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import a resume" description="ResumeForge backups (.json) and JSON Resume files are supported." footer={<Button onClick={onClose}>Cancel</Button>}>
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) void handle(f)
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700'}`}
      >
        <FileUp className="size-8 text-indigo-500" aria-hidden />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Drop a .json file or click to browse</span>
        <span className="text-xs text-slate-500">Nothing is uploaded — files are read in your browser.</span>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handle(f)
            e.target.value = ''
          }}
        />
      </label>
      {error && <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </Modal>
  )
}
