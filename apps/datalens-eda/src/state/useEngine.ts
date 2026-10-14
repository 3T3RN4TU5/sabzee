import { useCallback, useEffect, useRef, useState } from 'react'
import type { Engine, InitProgress, TableMeta } from '../db/engine.ts'
import { sampleUrl, type Sample } from '../samples.ts'

export type EngineStatus = 'loading' | 'ready' | 'error'

let enginePromise: Promise<Engine> | null = null

/** Lazily import and boot DuckDB once per page (survives StrictMode double effects). */
function bootEngine(onProgress: (p: InitProgress) => void): Promise<Engine> {
  enginePromise ??= import('../db/engine.ts').then((m) => m.Engine.create(onProgress))
  return enginePromise
}

export function useEngine() {
  const [engine, setEngine] = useState<Engine | null>(null)
  const [status, setStatus] = useState<EngineStatus>('loading')
  const [progress, setProgress] = useState<InitProgress>({ stage: 'download' })
  const [error, setError] = useState<string | null>(null)
  const [tables, setTables] = useState<TableMeta[]>([])
  const [loading, setLoading] = useState<string[]>([])
  const engineRef = useRef<Engine | null>(null)

  useEffect(() => {
    let alive = true
    // Yield to the first paint before pulling in the engine chunk.
    const id = window.setTimeout(() => {
      bootEngine((p) => alive && setProgress(p))
        .then((e) => {
          if (!alive) return
          engineRef.current = e
          // `?debug` exposes the engine for console poking and end-to-end tests.
          if (new URLSearchParams(window.location.search).has('debug')) Object.assign(window, { __datalens: e })
          setEngine(e)
          setStatus('ready')
        })
        .catch((err: unknown) => {
          if (!alive) return
          setError(err instanceof Error ? err.message : String(err))
          setStatus('error')
        })
    }, 0)
    return () => {
      alive = false
      window.clearTimeout(id)
    }
  }, [])

  const refresh = useCallback(async () => {
    const e = engineRef.current
    if (!e) return []
    const list = await e.listTables()
    // estimated_size is approximate for some sources; get exact counts (cheap in DuckDB).
    for (const t of list) t.rows = await e.countRows(t.name).catch(() => t.rows)
    setTables(list)
    return list
  }, [])

  useEffect(() => {
    if (engine) void refresh()
  }, [engine, refresh])

  const track = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    setLoading((l) => [...l, label])
    try {
      return await fn()
    } finally {
      setLoading((l) => l.filter((x) => x !== label))
    }
  }

  const loadSample = useCallback(
    async (s: Sample) => {
      const e = engineRef.current
      if (!e) throw new Error('Engine is still starting')
      await track(s.file, () => e.loadUrl(sampleUrl(s), s.file, s.table))
      await refresh()
      return s.table
    },
    [refresh],
  )

  const loadFiles = useCallback(
    async (files: File[]) => {
      const e = engineRef.current
      if (!e) throw new Error('Engine is still starting')
      const names: string[] = []
      const errors: string[] = []
      for (const f of files) {
        try {
          const taken = [...(await e.listTables()).map((t) => t.name), ...names]
          names.push(await track(f.name, () => e.loadFile(f, taken)))
        } catch (err) {
          errors.push(`${f.name}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      await refresh()
      return { names, errors }
    },
    [refresh],
  )

  const dropTable = useCallback(
    async (t: TableMeta) => {
      await engineRef.current?.dropTable(t.name, t.kind)
      await refresh()
    },
    [refresh],
  )

  return { engine, status, progress, error, tables, loading, refresh, loadSample, loadFiles, dropTable }
}
