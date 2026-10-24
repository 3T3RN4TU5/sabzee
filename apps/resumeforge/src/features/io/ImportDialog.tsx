/**
 * Import dialog (opened with `uiActions.openModal('import')`, rendered by the shell's ModalHost).
 * Drop or pick a .json file (or paste JSON) → the format is detected (ResumeForge backup, ResumeForge
 * v1 export, JSON Resume) → a preview shows what will be imported → import as a new resume or
 * replace the current one (undoable). Files are read locally; nothing is uploaded.
 * OWNER: io agent.
 */
import { AlertCircle, ArrowLeft, Check, ClipboardPaste, FileJson, FileUp, Info, Loader2 } from 'lucide-react'
import { useId, useMemo, useState, type DragEvent } from 'react'
import { defaultDesign } from '../../lib/design.ts'
import { hasLetterContent } from '../../lib/docxModel.ts'
import type { ImportedResume } from '../../lib/importer.ts'
import { checkImportFile, parseImportText, summarizeImport, uniqueName, type ImportSummary } from '../../lib/ioHelpers.ts'
import { navigate, resumeActions, toast, useActiveDoc, useResumes } from '../../store'
import { getTemplate, TemplateThumbnail } from '../../templates'
import { Button, cn, Modal, TextArea, TextField } from '../../ui'

export interface ImportDialogProps {
  open: boolean
  onClose: () => void
}

interface Loaded {
  imported: ImportedResume
  summary: ImportSummary
  /** File name, or 'pasted JSON'. */
  source: string
}

interface ImportError {
  title: string
  message: string
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const active = useActiveDoc()
  const resumes = useResumes()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<ImportError | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'new' | 'replace'>('new')

  function accept(text: string, source: string) {
    try {
      const imported = parseImportText(text)
      const summary = summarizeImport(imported)
      setLoaded({ imported, summary, source })
      setName(uniqueName(imported.name, resumes.map((r) => r.name)))
      setMode('new')
      setError(null)
    } catch (e) {
      setError({ title: `Couldn’t import ${source === 'pasted JSON' ? 'the pasted JSON' : `“${source}”`}`, message: e instanceof Error ? e.message : String(e) })
    }
  }

  async function readFile(file: File) {
    setError(null)
    const problem = checkImportFile(file)
    if (problem) return setError({ title: 'This file can’t be imported', message: problem })
    setReading(true)
    try {
      accept(await file.text(), file.name)
    } catch {
      setError({ title: `Couldn’t read “${file.name}”`, message: 'The browser could not read the file. Try saving it again and re-importing.' })
    } finally {
      setReading(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 1) toast('Importing the first file only', 'info')
    if (files[0]) void readFile(files[0])
  }

  function doImport() {
    if (!loaded) return
    const { imported } = loaded
    if (mode === 'replace' && active) {
      resumeActions.replaceData(imported.data, imported.design)
      let steps = 1
      if (imported.coverLetter && hasLetterContent(imported.coverLetter)) {
        resumeActions.updateCoverLetter(imported.coverLetter, null)
        steps++
      }
      toast(`Replaced the content of “${active.name}”`, 'success', {
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: () => {
            for (let i = 0; i < steps; i++) resumeActions.undo()
          },
        },
      })
      onClose()
      navigate({ name: 'edit', id: active.id })
      return
    }
    const finalName = name.trim() || uniqueName(imported.name, resumes.map((r) => r.name))
    const id = resumeActions.importDoc({ ...imported, name: finalName })
    toast(`Imported “${finalName}”`, 'success')
    onClose()
    navigate({ name: 'edit', id })
  }

  const footer = loaded ? (
    <>
      <Button variant="ghost" icon={ArrowLeft} onClick={() => setLoaded(null)} className="mr-auto">
        Choose another file
      </Button>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" icon={Check} onClick={doImport} data-import-confirm>
        {mode === 'replace' ? 'Replace content' : 'Import resume'}
      </Button>
    </>
  ) : (
    <Button onClick={onClose}>Cancel</Button>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={loaded ? 'Check before importing' : 'Import a resume'}
      description={loaded ? `From ${loaded.source}` : 'ResumeForge backups and JSON Resume files (.json). Files are read in your browser — nothing is uploaded.'}
      footer={footer}
    >
      {loaded ? (
        <Preview loaded={loaded} name={name} onName={setName} mode={mode} onMode={setMode} activeName={active?.name ?? null} />
      ) : (
        <div
          className="space-y-3"
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDragging(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
          }}
          onDrop={onDrop}
        >
          <label
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30',
              dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40',
            )}
            data-dropzone
          >
            {reading ? <Loader2 className="size-9 animate-spin text-indigo-500" aria-hidden /> : <FileUp className="size-9 text-indigo-500" aria-hidden />}
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{dragging ? 'Drop to import' : 'Drop a .json file here or click to browse'}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ResumeForge backup · ResumeForge v1 export · JSON Resume (jsonresume.org)</span>
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Choose a resume file to import"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void readFile(f)
                e.target.value = ''
              }}
            />
          </label>

          {error && (
            <div role="alert" className="flex gap-2.5 rounded-xl bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/30">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{error.title}</p>
                <p className="mt-0.5 text-rose-800/90 dark:text-rose-100/80">{error.message}</p>
              </div>
            </div>
          )}

          {pasting ? (
            <div className="space-y-2">
              <TextArea
                label="Paste JSON"
                rows={6}
                value={pasted}
                onValue={setPasted}
                placeholder='{ "basics": { "name": "…" }, "work": [ … ] }'
                className="font-mono text-xs"
                spellCheck={false}
                data-native-undo
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPasting(false)}>
                  Close
                </Button>
                <Button size="sm" variant="primary" disabled={!pasted.trim()} onClick={() => accept(pasted, 'pasted JSON')}>
                  Preview import
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setPasting(true)} className="inline-flex items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-400">
              <ClipboardPaste className="size-4" aria-hidden />
              Paste JSON instead
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}

interface PreviewProps {
  loaded: Loaded
  name: string
  onName: (name: string) => void
  mode: 'new' | 'replace'
  onMode: (mode: 'new' | 'replace') => void
  activeName: string | null
}

function Preview({ loaded, name, onName, mode, onMode, activeName }: PreviewProps) {
  const { imported, summary } = loaded
  const design = useMemo(() => imported.design ?? { ...defaultDesign }, [imported.design])
  const radio = useId()
  const extras: string[] = []
  if (summary.template) extras.push(`Design: ${getTemplate(summary.template).name} template`)
  if (summary.hasCoverLetter) extras.push('Cover letter')
  if (summary.hasPhoto) extras.push('Profile photo')
  if (summary.hasJobDescription) extras.push('Saved job description')

  return (
    <div className="space-y-5" data-import-preview data-format={summary.format}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="mx-auto shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 sm:mx-0 dark:ring-slate-700">
          <TemplateThumbnail data={imported.data} design={design} width={150} />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/30">
              <FileJson className="size-3.5" aria-hidden />
              {summary.formatLabel}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {summary.sections.length} section{summary.sections.length === 1 ? '' : 's'} · {summary.entryCount} entr{summary.entryCount === 1 ? 'y' : 'ies'} · {summary.bulletCount} bullet{summary.bulletCount === 1 ? '' : 's'}
            </span>
          </div>
          <div>
            <p className="text-lg leading-tight font-bold text-slate-900 dark:text-white">{summary.person || 'No name'}</p>
            {summary.headline && <p className="text-sm text-slate-600 dark:text-slate-300">{summary.headline}</p>}
          </div>
          {summary.sections.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Sections">
              {summary.sections.map((s, i) => (
                <li key={`${s.kind}${i}`} className={cn('rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200', s.hidden && 'opacity-60')}>
                  {s.title}
                  {s.kind !== 'summary' && <span className="ml-1 text-slate-400 tabular-nums">{s.count}</span>}
                  {s.hidden && <span className="ml-1 text-slate-400">(hidden)</span>}
                </li>
              ))}
            </ul>
          )}
          {extras.length > 0 && (
            <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
              {extras.map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
          )}
          {summary.format !== 'resumeforge' && (
            <p className="flex gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              {summary.format === 'json-resume' ? 'JSON Resume has no design — the default template is used; pick another one after importing.' : 'Converted from the original ResumeForge format.'}
            </p>
          )}
          {summary.isEmpty && (
            <p className="flex gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              This file has no resume content — you’ll get an empty resume.
            </p>
          )}
          {imported.warnings?.map((w) => (
            <p key={w} className="flex gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30" data-import-warning>
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">How to import</legend>
        <ModeOption id={`${radio}-new`} name={radio} checked={mode === 'new'} onChange={() => onMode('new')} title="As a new resume" description="Your existing resumes stay untouched." />
        {mode === 'new' && <TextField label="Name" value={name} onValue={onName} maxLength={120} shellClassName="pl-7" />}
        {activeName && (
          <ModeOption
            id={`${radio}-replace`}
            name={radio}
            checked={mode === 'replace'}
            onChange={() => onMode('replace')}
            title={`Replace “${activeName}”`}
            description={`Overwrites its content${imported.design ? ', design' : ''}${summary.hasCoverLetter ? ' and cover letter' : ''}. You can undo it.`}
          />
        )}
      </fieldset>
    </div>
  )
}

function ModeOption({ id, name, checked, onChange, title, description }: { id: string; name: string; checked: boolean; onChange: () => void; title: string; description: string }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition',
        checked ? 'bg-indigo-50/70 ring-indigo-300 dark:bg-indigo-500/10 dark:ring-indigo-500/40' : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800/50',
      )}
    >
      <input id={id} type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 size-4 shrink-0 accent-indigo-600" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </label>
  )
}
