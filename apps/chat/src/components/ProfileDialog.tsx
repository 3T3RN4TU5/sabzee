import { useId, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { AVATAR_COLORS, NAME_MAX, validateName } from '../lib/profile'
import type { Profile } from '../lib/types'
import { Avatar } from './Avatar'
import { Dialog } from './Dialog'
import { inputClass, primaryButtonClass } from './ui'

interface ProfileDialogProps {
  open: boolean
  /** null = first visit (onboarding, cannot be dismissed). */
  profile: Profile | null
  onSave: (profile: Profile) => void
  onClose: () => void
}

export function ProfileDialog({ open, profile, onSave, onClose }: ProfileDialogProps) {
  const onboarding = profile === null
  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!onboarding}
      title={onboarding ? 'Welcome to DevChat 👋' : 'Edit your profile'}
      description={
        onboarding
          ? 'Pick a display name and a colour. No sign-up — your identity lives in this browser.'
          : 'Changes apply to new messages and to how others see you online.'
      }
    >
      <ProfileForm initial={profile} submitLabel={onboarding ? 'Start chatting' : 'Save changes'} onSave={onSave} />
    </Dialog>
  )
}

function ProfileForm({ initial, submitLabel, onSave }: { initial: Profile | null; submitLabel: string; onSave: (p: Profile) => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState<string>(initial?.color ?? AVATAR_COLORS[0].value)
  const [touched, setTouched] = useState(false)
  const nameId = useId()
  const errorId = useId()
  const error = validateName(name)
  const showError = touched && error

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (error) return
    onSave({ name: name.trim(), color })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3 dark:bg-ink-850">
        <Avatar name={name.trim() || '?'} color={color} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ color }}>
            {name.trim() || 'Your name'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">This is how your messages will look.</p>
        </div>
      </div>

      <div>
        <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium">
          Display name
        </label>
        <input
          id={nameId}
          autoFocus
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="e.g. Asha"
          autoComplete="nickname"
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? errorId : undefined}
          className={inputClass}
        />
        {showError && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-500">
            {error}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Avatar colour</legend>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_COLORS.map((c) => (
            <label key={c.value} className="relative cursor-pointer" title={c.name}>
              <input
                type="radio"
                name="avatar-color"
                value={c.value}
                checked={color === c.value}
                onChange={() => setColor(c.value)}
                className="peer sr-only"
              />
              <span className="sr-only">{c.name}</span>
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-full ring-offset-2 ring-offset-white transition peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 hover:scale-110 dark:ring-offset-ink-900 dark:peer-checked:ring-white"
                style={{ backgroundColor: c.value }}
              >
                {color === c.value && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className={`${primaryButtonClass} w-full`}>
        {submitLabel}
      </button>
    </form>
  )
}
