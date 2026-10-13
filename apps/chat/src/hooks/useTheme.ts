import { useCallback, useEffect, useState } from 'react'
import { readStored, writeStored } from '../lib/storage'

export type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  const saved = readStored<Theme>('theme', (v) => (v === 'light' || v === 'dark' ? v : null))
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      writeStored('theme', next)
      return next
    })
  }, [])

  return { theme, toggle }
}
