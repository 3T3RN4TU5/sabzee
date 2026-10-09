import { useCallback, useEffect, useRef, useState } from 'react'

export interface Playback {
  position: number
  length: number
  playing: boolean
  finished: boolean
  toggle: () => void
  pause: () => void
  stepBy: (delta: number) => void
  seek: (position: number) => void
  reset: () => void
}

/**
 * Drives a position in [0, length] forward at `rate` units per second using
 * requestAnimationFrame. The loop is suspended (without losing the playing
 * state) while `active` is false, e.g. when the tab is hidden.
 */
export function usePlayback(length: number, rate: number, active: boolean): Playback {
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const positionRef = useRef(0)

  const seek = useCallback(
    (p: number) => {
      const next = Math.max(0, Math.min(length, Math.round(p)))
      positionRef.current = next
      setPosition(next)
    },
    [length],
  )

  useEffect(() => {
    if (!playing || !active) return
    let frame = 0
    let last = performance.now()
    // Start with one unit of budget so pressing play responds immediately.
    let budget = 1
    const tick = (now: number) => {
      // Cap the delta so a backgrounded tab does not jump to the end on return.
      budget += (Math.min(250, now - last) / 1000) * rate
      last = now
      const whole = Math.floor(budget)
      if (whole > 0) {
        budget -= whole
        const next = Math.min(length, positionRef.current + whole)
        positionRef.current = next
        setPosition(next)
        if (next >= length) {
          setPlaying(false)
          return
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, active, rate, length])

  const toggle = useCallback(() => {
    if (playing) {
      setPlaying(false)
      return
    }
    // Replay from the beginning when play is pressed at the end.
    if (positionRef.current >= length) seek(0)
    setPlaying(true)
  }, [playing, length, seek])

  const pause = useCallback(() => setPlaying(false), [])

  const stepBy = useCallback(
    (delta: number) => {
      setPlaying(false)
      seek(positionRef.current + delta)
    },
    [seek],
  )

  const reset = useCallback(() => {
    setPlaying(false)
    seek(0)
  }, [seek])

  return { position, length, playing, finished: position >= length, toggle, pause, stepBy, seek, reset }
}
