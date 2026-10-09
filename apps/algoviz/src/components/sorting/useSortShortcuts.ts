import { useEffect, useEffectEvent } from 'react'
import { shouldIgnoreShortcut } from '../../lib/utils.ts'
import type { Playback } from './usePlayback.ts'

/** Space play/pause · ←/→ step (Shift ×10) · Home/End · R reset · N new array. */
export function useSortShortcuts(active: boolean, player: Playback, onNewArray: () => void): void {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (shouldIgnoreShortcut(e)) return
    switch (e.key) {
      case ' ':
        player.toggle()
        break
      case 'ArrowRight':
        player.stepBy(e.shiftKey ? 10 : 1)
        break
      case 'ArrowLeft':
        player.stepBy(e.shiftKey ? -10 : -1)
        break
      case 'Home':
        player.reset()
        break
      case 'End':
        player.pause()
        player.seek(player.length)
        break
      case 'r':
      case 'R':
        player.reset()
        break
      case 'n':
      case 'N':
        onNewArray()
        break
      default:
        return
    }
    e.preventDefault()
  })

  useEffect(() => {
    if (!active) return
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [active])
}
