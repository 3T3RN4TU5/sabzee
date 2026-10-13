export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])$/
export const ROOM_NAME_MIN = 2
export const ROOM_NAME_MAX = 40
export const ROOM_DESCRIPTION_MAX = 140

export interface RoomDraft {
  slug: string
  name: string
  description: string
}

export type RoomErrors = Partial<Record<keyof RoomDraft, string>>

/** "Rust & WebAssembly!" → "rust-webassembly" */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '')
}

/** Mirrors the CHECK constraints on chat_rooms so users get instant feedback. */
export function validateRoom(draft: RoomDraft): RoomErrors {
  const errors: RoomErrors = {}
  const name = draft.name.trim()
  if (name.length < ROOM_NAME_MIN) errors.name = `Name needs at least ${ROOM_NAME_MIN} characters.`
  else if (name.length > ROOM_NAME_MAX) errors.name = `Name can be at most ${ROOM_NAME_MAX} characters.`

  if (draft.slug.length < 2 || draft.slug.length > 32) errors.slug = 'Slug must be 2–32 characters.'
  else if (!SLUG_RE.test(draft.slug))
    errors.slug = 'Use lowercase letters, numbers and dashes (no leading or trailing dash).'

  if (draft.description.trim().length > ROOM_DESCRIPTION_MAX)
    errors.description = `Description can be at most ${ROOM_DESCRIPTION_MAX} characters.`
  return errors
}
