/** Joins truthy class names. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * True when a global keyboard shortcut should yield to the focused element:
 * text fields, selects and sliders own every key; buttons and links own
 * Space / Enter; radio groups and tabs own the arrow keys (tabs also Home / End).
 */
export function shouldIgnoreShortcut(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return true
  const t = e.target
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable || t.closest('input, textarea, select, dialog, [role="application"]')) return true
  if (e.key === ' ' || e.key === 'Enter') return t.closest('button, a, [role="radio"], [role="tab"]') !== null
  if (e.key.startsWith('Arrow')) return t.closest('[role="radio"], [role="tab"]') !== null
  if (e.key === 'Home' || e.key === 'End') return t.closest('[role="tab"]') !== null
  return false
}

export const formatNumber = (n: number) => n.toLocaleString('en-US')
