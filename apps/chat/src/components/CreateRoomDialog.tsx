import { useId, useState, type FormEvent } from 'react'
import { Hash, Loader2 } from 'lucide-react'
import { createRoom } from '../lib/api'
import { describeError } from '../lib/errors'
import type { Room } from '../lib/types'
import { ROOM_DESCRIPTION_MAX, ROOM_NAME_MAX, slugify, validateRoom, type RoomDraft } from '../lib/validation'
import { Dialog } from './Dialog'
import { inputClass, primaryButtonClass, secondaryButtonClass } from './ui'

interface CreateRoomDialogProps {
  open: boolean
  clientId: string
  /** Pre-fill the slug, e.g. when following a link to a room that does not exist yet. */
  initialSlug?: string
  existingSlugs: ReadonlySet<string>
  onClose: () => void
  onCreated: (room: Room) => void
}

export function CreateRoomDialog({ open, onClose, ...rest }: CreateRoomDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Create a room" description="Rooms are public. Anyone with the link can read and post.">
      <CreateRoomForm onClose={onClose} {...rest} />
    </Dialog>
  )
}

function CreateRoomForm({ clientId, initialSlug = '', existingSlugs, onClose, onCreated }: Omit<CreateRoomDialogProps, 'open'>) {
  const [draft, setDraft] = useState<RoomDraft>({ name: '', slug: initialSlug, description: '' })
  const [slugEdited, setSlugEdited] = useState(initialSlug !== '')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const ids = { name: useId(), slug: useId(), description: useId() }

  const errors = validateRoom(draft)
  if (!errors.slug && existingSlugs.has(draft.slug)) errors.slug = `#${draft.slug} already exists.`
  const visible = submitted ? errors : {}

  function update(patch: Partial<RoomDraft>) {
    setServerError(null)
    setDraft((d) => {
      const next = { ...d, ...patch }
      if (patch.name !== undefined && !slugEdited) next.slug = slugify(patch.name)
      return next
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    try {
      const room = await createRoom(draft, clientId)
      onCreated(room)
    } catch (error) {
      setServerError(describeError(error, 'Could not create the room.').message)
      setSaving(false)
    }
  }

  const describedBy = (field: keyof RoomDraft, hint?: string) => [visible[field] ? `${ids[field]}-error` : null, hint].filter(Boolean).join(' ') || undefined

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input
          id={ids.name}
          autoFocus
          value={draft.name}
          maxLength={ROOM_NAME_MAX}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Rust & WebAssembly"
          aria-invalid={visible.name ? true : undefined}
          aria-describedby={describedBy('name')}
          className={inputClass}
        />
        {visible.name && <FieldError id={`${ids.name}-error`} message={visible.name} />}
      </div>

      <div>
        <label htmlFor={ids.slug} className="mb-1.5 block text-sm font-medium">
          URL slug
        </label>
        <div className="relative">
          <Hash className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id={ids.slug}
            value={draft.slug}
            maxLength={32}
            onChange={(e) => {
              setSlugEdited(true)
              update({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
            }}
            placeholder="rust-wasm"
            spellCheck={false}
            autoCapitalize="off"
            aria-invalid={visible.slug ? true : undefined}
            aria-describedby={describedBy('slug', `${ids.slug}-hint`)}
            className={`${inputClass} pl-9 font-mono`}
          />
        </div>
        {visible.slug ? (
          <FieldError id={`${ids.slug}-error`} message={visible.slug} />
        ) : (
          <p id={`${ids.slug}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Lowercase letters, numbers and dashes. Shareable as <span className="font-mono">#{draft.slug || 'slug'}</span>
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor={ids.description} className="text-sm font-medium">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <span className={`text-xs tabular-nums ${draft.description.length > ROOM_DESCRIPTION_MAX ? 'text-rose-500' : 'text-slate-400'}`}>
            {draft.description.length}/{ROOM_DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id={ids.description}
          rows={2}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What is this room about?"
          aria-invalid={visible.description ? true : undefined}
          aria-describedby={describedBy('description')}
          className={`${inputClass} resize-none`}
        />
        {visible.description && <FieldError id={`${ids.description}-error`} message={visible.description} />}
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? 'Creating…' : 'Create room'}
        </button>
      </div>
    </form>
  )
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-rose-500">
      {message}
    </p>
  )
}
