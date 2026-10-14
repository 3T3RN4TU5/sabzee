// Fetches the JSON aggregates once and caches the promise per file.
import { useEffect, useState } from 'react'
import type { DataFiles } from './types.ts'

const cache = new Map<keyof DataFiles, Promise<unknown>>()

export function load<K extends keyof DataFiles>(name: K): Promise<DataFiles[K]> {
  let p = cache.get(name)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${name}.json (HTTP ${r.status})`)
      return r.json()
    })
    p.catch(() => cache.delete(name)) // allow a retry after a failed request
    cache.set(name, p)
  }
  return p as Promise<DataFiles[K]>
}

export type LoadState<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: T }

type Picked<K extends keyof DataFiles> = { [P in K]: DataFiles[P] }

/** Load several data files; re-renders once all are ready. */
export function useData<K extends keyof DataFiles>(...names: K[]): LoadState<Picked<K>> & { retry: () => void } {
  const [state, setState] = useState<LoadState<Picked<K>>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const key = names.join(',')
  useEffect(() => {
    let alive = true
    const list = key.split(',') as K[]
    Promise.all(list.map((n) => load(n)))
      .then((values) => {
        if (!alive) return
        const data = Object.fromEntries(list.map((n, i) => [n, values[i]])) as Picked<K>
        setState({ status: 'ready', data })
      })
      .catch((e: unknown) => alive && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [key, attempt])
  return { ...state, retry: () => { setState({ status: 'loading' }); setAttempt((a) => a + 1) } }
}
