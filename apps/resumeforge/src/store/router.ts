/** Tiny hash router: `useRoute()` + `navigate()`. Route parsing lives in lib/route.ts. */
import { useMemo, useSyncExternalStore } from 'react'
import { parseRoute, routeHash, type Route } from '../lib/route.ts'

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const getHash = () => window.location.hash
const getServerHash = () => ''

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash)
  return useMemo(() => parseRoute(hash), [hash])
}

export function currentRoute(): Route {
  return parseRoute(typeof window === 'undefined' ? '' : window.location.hash)
}

/** Navigate to a route (or raw hash). `replace` swaps the history entry instead of pushing. */
export function navigate(to: Route | string, opts: { replace?: boolean } = {}): void {
  const hash = typeof to === 'string' ? (to.startsWith('#') ? to : `#${to}`) : routeHash(to)
  if (window.location.hash === hash) return
  if (opts.replace) {
    history.replaceState(history.state, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else window.location.hash = hash
}

export type { Route }
