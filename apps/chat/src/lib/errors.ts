import { isRecord } from './storage'

export interface FriendlyError {
  message: string
  rateLimited: boolean
}

/**
 * Maps PostgREST / network errors to copy a user can act on.
 * PT429 is raised by our rate-limit triggers (PostgREST turns PTxyz into HTTP xyz).
 */
export function describeError(error: unknown, fallback = 'Something went wrong. Please try again.'): FriendlyError {
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : ''
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : ''

  if (code === 'PT429') return { message: message || 'You are going too fast. Try again in a moment.', rateLimited: true }
  if (code === '23505') return { message: 'That already exists — pick a different slug.', rateLimited: false }
  if (code === '23514') return { message: 'The server rejected that input. Check the length and format.', rateLimited: false }
  if (code === '42501') return { message: 'Permission denied by the server.', rateLimited: false }
  if (error instanceof TypeError || /fetch|network/i.test(message))
    return { message: 'Network error — check your connection and try again.', rateLimited: false }
  return { message: fallback, rateLimited: false }
}
