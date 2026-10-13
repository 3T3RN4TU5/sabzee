/**
 * Tiny, safe message formatter. Produces tokens that React renders as text nodes — no HTML parsing,
 * no dangerouslySetInnerHTML. Supports ```fenced blocks```, `inline code` and http(s) links.
 */
export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'codeblock'; value: string; lang: string }
  | { kind: 'link'; value: string; href: string }

const FENCE_RE = /```([\w+#.-]*)\n?([\s\S]*?)```/g
const INLINE_CODE_RE = /`([^`\n]+)`/g
// Stop before trailing punctuation so "see https://x.dev." links to https://x.dev
const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+[^\s<>"'`.,:;!?)\]}]/gi

function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function splitBy(input: string, re: RegExp, onMatch: (m: RegExpMatchArray) => Token, onText: (text: string) => Token[]): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of input.matchAll(re)) {
    const start = m.index ?? 0
    if (start > last) out.push(...onText(input.slice(last, start)))
    out.push(onMatch(m))
    last = start + m[0].length
  }
  if (last < input.length) out.push(...onText(input.slice(last)))
  return out
}

function linkify(text: string): Token[] {
  return splitBy(
    text,
    URL_RE,
    (m) => {
      const href = safeHref(m[0])
      return href ? { kind: 'link', value: m[0], href } : { kind: 'text', value: m[0] }
    },
    (value) => [{ kind: 'text', value }],
  )
}

function inline(text: string): Token[] {
  return splitBy(text, INLINE_CODE_RE, (m) => ({ kind: 'code', value: m[1] }), linkify)
}

export function tokenize(content: string): Token[] {
  return splitBy(
    content,
    FENCE_RE,
    (m) => ({ kind: 'codeblock', lang: m[1], value: m[2].replace(/\n$/, '') }),
    inline,
  )
}
