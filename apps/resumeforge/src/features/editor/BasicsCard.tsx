/** Personal details: photo (upload → crop → data URL) and contact fields with validation. OWNER: shell agent. */
import { Camera, ChevronDown, Crop, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { initials } from '../../lib/templateData.ts'
import { fieldError } from '../../lib/validate.ts'
import type { Basics, PhotoShape } from '../../lib/types.ts'
import { resumeActions, toast, useActiveDesign, useFieldFocus } from '../../store'
import { getTemplate } from '../../templates'
import { Button, cn, TextField } from '../../ui'
import { undoableToast } from '../../app/undoToast.ts'
import { setOpen, useIsOpen } from './editorUi.ts'
import { loadImage, MAX_INPUT_BYTES, readFile } from './photo.ts'
import { PhotoCropDialog } from './PhotoCropDialog.tsx'

type BasicKey = Exclude<keyof Basics, 'photo'>
const FIELDS: { key: BasicKey; label: string; placeholder: string; type?: string; check?: 'email' | 'phone' | 'url' | 'linkedin' | 'github'; auto?: string }[] = [
  { key: 'name', label: 'Full name', placeholder: 'Aarav Mehta', auto: 'name' },
  { key: 'title', label: 'Job title', placeholder: 'Full-Stack Developer', auto: 'organization-title' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email', check: 'email', auto: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel', check: 'phone', auto: 'tel' },
  { key: 'location', label: 'Location', placeholder: 'Bengaluru, India', auto: 'address-level2' },
  { key: 'website', label: 'Website', placeholder: 'yourname.dev', check: 'url', auto: 'url' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/you', check: 'linkedin' },
  { key: 'github', label: 'GitHub', placeholder: 'github.com/you', check: 'github' },
]

export function BasicsCard({ basics }: { basics: Basics }) {
  const open = useIsOpen('basics', true)
  const { ref, flash } = useFieldFocus<HTMLDivElement>({})
  return (
    <div ref={ref} className={cn('rounded-2xl bg-white shadow-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800', flash && 'ring-2 ring-indigo-400')}>
      <button type="button" onClick={() => setOpen('basics', !open)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <ChevronDown className={cn('size-4 text-slate-400 transition', !open && '-rotate-90')} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900 dark:text-white">Personal details</span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{open ? 'Shown in the header of every template' : [basics.name, basics.title, basics.email].filter(Boolean).join(' · ') || 'Name, contact, photo'}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
          <PhotoField basics={basics} />
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <BasicField key={f.key} field={f} value={basics[f.key]} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BasicField({ field: f, value }: { field: (typeof FIELDS)[number]; value: string }) {
  const { ref, flash } = useFieldFocus<HTMLInputElement>({ field: f.key })
  const [focused, setFocused] = useState(false)
  const error = f.check && !focused ? fieldError(f.check, value) : null
  return (
    <TextField
      ref={ref}
      flash={flash}
      label={f.label}
      placeholder={f.placeholder}
      type={f.type}
      autoComplete={f.auto ?? 'off'}
      value={value}
      error={error}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onValue={(v) => resumeActions.updateBasics({ [f.key]: v })}
    />
  )
}

function PhotoField({ basics }: { basics: Basics }) {
  const design = useActiveDesign()
  const input = useRef<HTMLInputElement>(null)
  const [crop, setCrop] = useState<{ img: HTMLImageElement; src: string } | null>(null)
  if (!design) return null
  const tpl = getTemplate(design.template)
  const shapeClass = design.photoShape === 'circle' ? 'rounded-full' : design.photoShape === 'rounded' ? 'rounded-2xl' : 'rounded-md'

  const pick = async (file: File | undefined) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.type)) return toast('Please choose a JPG, PNG or WebP image', 'error')
    if (file.size > MAX_INPUT_BYTES) return toast('That image is over 8 MB — please choose a smaller one', 'error')
    try {
      const src = await readFile(file)
      setCrop({ img: await loadImage(src), src })
    } catch {
      toast('Could not read this image. Try a JPG or PNG.', 'error')
    }
  }
  const edit = async () => {
    if (basics.photo) setCrop({ img: await loadImage(basics.photo), src: basics.photo })
  }
  const save = (url: string, shape: PhotoShape) => {
    setCrop(null)
    if (!url) return toast('Could not process the image', 'error')
    resumeActions.updateBasics({ photo: url }, null)
    if (shape !== design.photoShape || !design.showPhoto) resumeActions.updateDesign({ photoShape: shape, showPhoto: true }, null)
    toast('Photo updated', 'success')
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => (basics.photo ? void edit() : input.current?.click())} className={cn('group relative grid size-16 shrink-0 place-items-center overflow-hidden bg-slate-100 ring-1 ring-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:ring-slate-700', shapeClass)} aria-label={basics.photo ? 'Adjust photo crop' : 'Upload photo'}>
        {basics.photo ? <img src={basics.photo} alt="Profile" className="size-full object-cover" /> : basics.name ? <span className="text-lg font-bold text-slate-400">{initials(basics.name)}</span> : <ImagePlus className="size-5 text-slate-400" aria-hidden />}
        <span className="absolute inset-0 hidden place-items-center bg-slate-900/50 text-white group-hover:grid">
          <Camera className="size-4" aria-hidden />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" icon={ImagePlus} onClick={() => input.current?.click()}>
            {basics.photo ? 'Change' : 'Upload photo'}
          </Button>
          {basics.photo && (
            <>
              <Button size="xs" variant="ghost" icon={Crop} onClick={() => void edit()}>
                Crop
              </Button>
              <Button
                size="xs"
                variant="ghost"
                icon={Trash2}
                onClick={() => {
                  resumeActions.updateBasics({ photo: '' }, null)
                  undoableToast('Photo removed')
                }}
              >
                Remove
              </Button>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {!basics.photo
            ? 'Optional · JPG, PNG or WebP up to 8 MB. Many ATS and US/UK recruiters prefer no photo.'
            : !tpl.supportsPhoto
              ? `${tpl.name} doesn’t show photos — pick a “Photo” template in Design.`
              : !design.showPhoto
                ? 'Photo is hidden on the resume.'
                : 'Shown on the resume.'}
          {basics.photo && tpl.supportsPhoto && !design.showPhoto && (
            <button type="button" className="ml-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => resumeActions.updateDesign({ showPhoto: true }, null)}>
              Show it
            </button>
          )}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose photo file"
        onChange={(e) => {
          void pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {crop && <PhotoCropDialog img={crop.img} src={crop.src} shape={design.photoShape} onCancel={() => setCrop(null)} onSave={save} />}
    </div>
  )
}
