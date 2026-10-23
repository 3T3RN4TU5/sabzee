/** Theme menu: Light / Dark / System. OWNER: shell agent. */
import { Monitor, Moon, Sun } from 'lucide-react'
import { resumeActions, useTheme } from '../store'
import { IconButton, Menu } from '../ui'
import { useResolvedTheme } from './hooks.ts'

const LABEL = { light: 'Light', dark: 'Dark', system: 'System' }

export function ThemeToggle() {
  const theme = useTheme()
  const resolved = useResolvedTheme()
  const Icon = theme === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun
  return (
    <Menu
      width="w-44"
      label="Theme"
      trigger={(p) => <IconButton icon={Icon} label={`Theme: ${LABEL[theme]}`} {...p} />}
      items={[
        { heading: 'Appearance' },
        { key: 'light', icon: Sun, label: 'Light', checked: theme === 'light', onSelect: () => resumeActions.setTheme('light') },
        { key: 'dark', icon: Moon, label: 'Dark', checked: theme === 'dark', onSelect: () => resumeActions.setTheme('dark') },
        { key: 'system', icon: Monitor, label: 'System', checked: theme === 'system', onSelect: () => resumeActions.setTheme('system') },
      ]}
    />
  )
}
