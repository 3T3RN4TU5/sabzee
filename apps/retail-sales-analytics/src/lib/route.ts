// Hash routing: #/<page>?from=2011-01&to=2011-11&country=France&category=Home%20D%C3%A9cor
import { useCallback, useSyncExternalStore } from 'react'

export const PAGES = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers' },
  { id: 'products', label: 'Products' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'quality', label: 'Data quality' },
  { id: 'methodology', label: 'Methodology' },
] as const

export type PageId = (typeof PAGES)[number]['id']

export interface Route {
  page: PageId
  params: URLSearchParams
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  const page = (PAGES.find((p) => p.id === path)?.id ?? 'overview') as PageId
  return { page, params: new URLSearchParams(query) }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const getHash = () => window.location.hash

export function useRoute(): [Route, (page: PageId, params?: URLSearchParams, replace?: boolean) => void] {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  const navigate = useCallback((page: PageId, params?: URLSearchParams, replace = false) => {
    const q = params?.toString()
    const next = `#/${page}${q ? `?${q}` : ''}`
    if (next === window.location.hash) return
    if (replace) {
      history.replaceState(null, '', next)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    } else {
      window.location.hash = next
    }
  }, [])
  return [parse(hash), navigate]
}
