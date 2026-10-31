import type { Difficulty } from '../problems/types.ts'

export const SOURCE_URL = 'https://github.com/3T3RN4TU5/sabzee/tree/main/apps/codearena'

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  Easy: 'text-easy',
  Medium: 'text-medium',
  Hard: 'text-hard',
}

export const DIFFICULTY_MARK: Record<Difficulty, string> = {
  Easy: 'var(--color-easy-mark)',
  Medium: 'var(--color-medium-mark)',
  Hard: 'var(--color-hard-mark)',
}

/** Shared focus ring for custom interactive elements. */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const ICON_BUTTON = `inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`
