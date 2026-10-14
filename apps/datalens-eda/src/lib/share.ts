/**
 * Shareable links: the SQL (and which bundled samples it needs) is encoded into the URL hash,
 * so a link reproduces the query without any server. Uses base64url of UTF-8.
 */

export interface SharedState {
  sql: string
  samples: string[]
}

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function fromBase64Url(encoded: string): string {
  const b64 = encoded.replaceAll('-', '+').replaceAll('_', '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeShare(state: SharedState): string {
  const params = new URLSearchParams()
  params.set('sql', toBase64Url(state.sql))
  if (state.samples.length) params.set('samples', state.samples.join(','))
  return `#${params.toString()}`
}

export function decodeShare(hash: string): SharedState | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (!h) return null
  const params = new URLSearchParams(h)
  const sql = params.get('sql')
  if (!sql) return null
  try {
    const samples = (params.get('samples') ?? '').split(',').filter((s) => /^[a-z0-9_]+$/.test(s))
    return { sql: fromBase64Url(sql), samples }
  } catch {
    return null
  }
}

/** Which known tables does a query mention? (word-boundary, case-insensitive) */
export function referencedTables(sql: string, known: readonly string[]): string[] {
  const lower = sql.toLowerCase()
  return known.filter((t) => new RegExp(`(^|[^a-z0-9_])"?${t.toLowerCase()}"?([^a-z0-9_]|$)`).test(lower))
}
