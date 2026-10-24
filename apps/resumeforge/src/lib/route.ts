/**
 * Hash routes:
 *   #/            dashboard (also '', '#', unknown routes)
 *   #/edit        editor for the active resume
 *   #/edit/<id>   editor for a specific resume (makes it active)
 *   #/view/<enc>  read-only shared resume (see share.ts)
 *   #/lab?t=modern&s=kitchen&photo=1&letter=0&paper=a4   template QA lab (unlinked; see TemplateLab)
 */

/** Same value as share.ts SHARE_ROUTE (duplicated so routing does not pull lz-string into the main chunk; a test keeps them equal). */
export const VIEW_PREFIX = '#/view/'

export type Route = { name: 'dashboard' } | { name: 'edit'; id?: string } | { name: 'view'; payload: string } | { name: 'lab'; params: Record<string, string> }

export function parseRoute(hash: string): Route {
  const h = hash.startsWith('#') ? hash : `#${hash}`
  if (h.startsWith(VIEW_PREFIX)) {
    const payload = h.slice(VIEW_PREFIX.length)
    return payload ? { name: 'view', payload } : { name: 'dashboard' }
  }
  const lab = /^#\/lab\/?(?:\?(.*))?$/.exec(h)
  if (lab) return { name: 'lab', params: Object.fromEntries(new URLSearchParams(lab[1] ?? '')) }
  const m = /^#\/edit(?:\/([^/?#]+))?\/?$/.exec(h)
  if (m) return m[1] ? { name: 'edit', id: decodeURIComponent(m[1]) } : { name: 'edit' }
  return { name: 'dashboard' }
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'edit':
      return route.id ? `#/edit/${encodeURIComponent(route.id)}` : '#/edit'
    case 'view':
      return `${VIEW_PREFIX}${route.payload}`
    case 'lab': {
      const q = new URLSearchParams(route.params).toString()
      return q ? `#/lab?${q}` : '#/lab'
    }
    default:
      return '#/'
  }
}
