/**
 * A deliberately tiny inline-markdown subset for resume text:
 *   **bold**, *italic* / _italic_, `code`, [label](url) and backslash escapes.
 *
 * The parser produces a token tree; the React renderer turns tokens into elements, so raw user
 * input is never injected as HTML. `inlineToHtml` exists for exports/tests and escapes everything.
 * Link targets are restricted to http(s)/mailto/tel (bare domains get https://).
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }

/** A flat run of text with formatting — handy for DOCX export. */
export interface Run {
  text: string
  bold: boolean
  italic: boolean
  code: boolean
  href: string | null
}

const ESCAPABLE = '\\`*_[]()#+-.!'
const MAX_DEPTH = 4

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c)

/** Normalise a user-supplied URL into a safe href, or null when it is not allowed. */
export function sanitizeUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.length > 2048) return null
  // Whitespace, control characters, quotes and angle brackets are never valid in our links.
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f<>"'`\\]/.test(url)) return null
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    return /^https?:\/\/$/i.test(url) ? null : url
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null // javascript:, data:, vbscript:, file: …
  if (/^[^@/]+@[^@/]+\.[a-z]{2,}$/i.test(url)) return `mailto:${url}`
  if (/^(www\.)?[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.[\p{L}]{2,}(:\d+)?([/?#].*)?$/u.test(url)) return `https://${url}`
  return null
}

/** Find the next unescaped occurrence of `token` at or after `from`. */
function findToken(src: string, token: string, from: number): number {
  let i = from
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2
      continue
    }
    if (src.startsWith(token, i)) return i
    i++
  }
  return -1
}

function findSingleStar(src: string, from: number): number {
  let i = from
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2
      continue
    }
    if (src[i] === '*') {
      if (src[i + 1] === '*') {
        // skip over a nested **strong** run
        const close = findToken(src, '**', i + 2)
        if (close < 0) return -1
        i = close + 2
        continue
      }
      return i
    }
    i++
  }
  return -1
}

function findUnderscore(src: string, from: number): number {
  let i = from
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2
      continue
    }
    if (src[i] === '_' && !isWordChar(src[i + 1]) && src[i - 1] !== ' ') return i
    i++
  }
  return -1
}

/** Matching `]` for a `[` at `open`, honouring nesting and escapes. */
function findBracket(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

export function parseInline(src: string, depth = 0): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', text: buf })
      buf = ''
    }
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '\\' && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      buf += src[i + 1]
      i += 2
      continue
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1)
      if (end > i + 1) {
        flush()
        out.push({ type: 'code', text: src.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }
    if (depth < MAX_DEPTH && c === '*' && src[i + 1] === '*' && src[i + 2] && src[i + 2] !== ' ') {
      const end = findToken(src, '**', i + 2)
      if (end > i + 2 && src[end - 1] !== ' ') {
        flush()
        out.push({ type: 'strong', children: parseInline(src.slice(i + 2, end), depth + 1) })
        i = end + 2
        continue
      }
    }
    if (depth < MAX_DEPTH && c === '*' && src[i + 1] && src[i + 1] !== ' ' && src[i + 1] !== '*') {
      const end = findSingleStar(src, i + 1)
      if (end > i + 1 && src[end - 1] !== ' ') {
        flush()
        out.push({ type: 'em', children: parseInline(src.slice(i + 1, end), depth + 1) })
        i = end + 1
        continue
      }
    }
    if (depth < MAX_DEPTH && c === '_' && !isWordChar(src[i - 1]) && src[i + 1] && src[i + 1] !== ' ' && src[i + 1] !== '_') {
      const end = findUnderscore(src, i + 1)
      if (end > i + 1) {
        flush()
        out.push({ type: 'em', children: parseInline(src.slice(i + 1, end), depth + 1) })
        i = end + 1
        continue
      }
    }
    if (c === '[') {
      const close = findBracket(src, i)
      if (close > i && src[close + 1] === '(') {
        const end = src.indexOf(')', close + 2)
        if (end > close + 1) {
          const label = src.slice(i + 1, close)
          const href = sanitizeUrl(src.slice(close + 2, end))
          flush()
          const children = depth < MAX_DEPTH ? parseInline(label, depth + 1) : [{ type: 'text' as const, text: label }]
          if (href) out.push({ type: 'link', href, children })
          else out.push(...children) // unsafe/invalid target: keep the label, drop the link
          i = end + 1
          continue
        }
      }
    }
    buf += c
    i++
  }
  flush()
  return out
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function nodesToHtml(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case 'text':
          return escapeHtml(n.text)
        case 'code':
          return `<code>${escapeHtml(n.text)}</code>`
        case 'strong':
          return `<strong>${nodesToHtml(n.children)}</strong>`
        case 'em':
          return `<em>${nodesToHtml(n.children)}</em>`
        case 'link':
          return `<a href="${escapeHtml(n.href)}" rel="noopener noreferrer">${nodesToHtml(n.children)}</a>`
      }
    })
    .join('')
}

/** Render the markdown subset to an HTML string. Every user character is escaped. */
export function inlineToHtml(src: string): string {
  return nodesToHtml(parseInline(src))
}

function nodesToPlain(nodes: Inline[], withUrls: boolean): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case 'text':
        case 'code':
          return n.text
        case 'strong':
        case 'em':
          return nodesToPlain(n.children, withUrls)
        case 'link': {
          const label = nodesToPlain(n.children, withUrls)
          const bare = n.href.replace(/^(https?:\/\/|mailto:|tel:)/i, '')
          return withUrls && label !== bare && label !== n.href ? `${label} (${bare})` : label
        }
      }
    })
    .join('')
}

/** Strip formatting. With `withUrls`, links become "label (url)". */
export function inlineToPlain(src: string, withUrls = false): string {
  return nodesToPlain(parseInline(src), withUrls)
}

export function toRuns(src: string): Run[] {
  const runs: Run[] = []
  const walk = (nodes: Inline[], f: Omit<Run, 'text'>) => {
    for (const n of nodes) {
      if (n.type === 'text') runs.push({ ...f, text: n.text })
      else if (n.type === 'code') runs.push({ ...f, code: true, text: n.text })
      else if (n.type === 'strong') walk(n.children, { ...f, bold: true })
      else if (n.type === 'em') walk(n.children, { ...f, italic: true })
      else walk(n.children, { ...f, href: n.href })
    }
  }
  walk(parseInline(src), { bold: false, italic: false, code: false, href: null })
  return runs
}
