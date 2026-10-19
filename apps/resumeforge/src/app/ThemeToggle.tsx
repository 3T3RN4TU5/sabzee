import { Monitor, Moon, Sun } from 'lucide-react'
import { resumeActions, useTheme } from '../store'
import { IconButton } from '../ui'

const NEXT = { light: 'dark', dark: 'system', system: 'light' } as const
const ICON = { light: Sun, dark: Moon, system: Monitor }
const LABEL = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' }

export function ThemeToggle() {
  const theme = useTheme()
  return <IconButton icon={ICON[theme]} label={`${LABEL[theme]} (click to change)`} onClick={() => resumeActions.setTheme(NEXT[theme])} />
}
