import { useSyncExternalStore } from 'react'
import { dayKey } from '../lib/format'

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000)
  return () => window.clearInterval(timer)
}

/** Local calendar day ("2026-10-09"), re-evaluated every minute so "Today" labels roll over at midnight. */
export const useToday = () => useSyncExternalStore(subscribe, () => dayKey(new Date().toISOString()))
