/** Platform-dependent labels (⌘ on Apple devices, Ctrl elsewhere). */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)

export const MOD = IS_MAC ? '⌘' : 'Ctrl'
export const ALT = IS_MAC ? '⌥' : 'Alt'
export const SHIFT = IS_MAC ? '⇧' : 'Shift'

/** "Ctrl+Z" / "⌘Z" style label. */
export function shortcut(...keys: string[]): string {
  return IS_MAC ? keys.join('') : keys.join('+')
}
