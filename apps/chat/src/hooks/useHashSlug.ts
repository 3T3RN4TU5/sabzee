import { useCallback, useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function readSlug(): string {
  try {
    return decodeURIComponent(window.location.hash.replace(/^#\/?/, '')).toLowerCase()
  } catch {
    return ''
  }
}

/** The current room slug from the URL hash (#general). Deep-linkable without a router. */
export function useHashSlug() {
  const slug = useSyncExternalStore(subscribe, readSlug)
  const navigate = useCallback((next: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', `#${next}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    } else {
      window.location.hash = next
    }
  }, [])
  return { slug, navigate }
}
