/** Helpers for the bullet helper UI: pick example bullets by role, fill STAR/XYZ templates. */
import { EXAMPLE_BULLETS } from './bulletLibrary.ts'

const ROLE_HINTS: { role: string; re: RegExp }[] = [
  { role: 'Data & analytics', re: /\b(data|analysts?|analytics|scientist|machine learning|ml|ai|bi|statistic\w*|research\w*)\b/i },
  { role: 'Product & design', re: /\b(product|design|designer|ux|ui|user experience|researcher|pm)\b/i },
  { role: 'Marketing & sales', re: /\b(marketing|marketer|sales|growth|seo|content|brand|account (?:executive|manager)|business development|bdr|sdr|social media)/i },
  { role: 'Operations & support', re: /\b(operations|ops|support|customer|success|admin\w*|coordinator|hr|recruit\w*|finance|accountant|logistics|supply)\b/i },
  { role: 'Software engineering', re: /\b(engineer|developer|programmer|software|frontend|front-end|backend|back-end|full[- ]?stack|devops|sre|architect|mobile|web|qa|tester|sde)/i },
  { role: 'Students & freshers', re: /\b(intern|internship|student|fresher|graduate|trainee|apprentice|teaching assistant|ta)\b/i },
]

/** Index into EXAMPLE_BULLETS best matching a job title (defaults to software engineering). */
export function exampleGroupIndex(role: string | undefined): number {
  const r = (role ?? '').trim()
  if (r) {
    for (const h of ROLE_HINTS) {
      if (h.re.test(r)) {
        const i = EXAMPLE_BULLETS.findIndex((g) => g.role === h.role)
        if (i >= 0) return i
      }
    }
  }
  return Math.max(0, EXAMPLE_BULLETS.findIndex((g) => g.role === 'Software engineering'))
}

const PLACEHOLDER_RE = /\[([^\]\n]{1,40})\](?!\()/g

/** Distinct placeholder names in a template pattern, in order: "[X] by [Y]" → ['X', 'Y']. */
export function templatePlaceholders(pattern: string): string[] {
  const out: string[] = []
  for (const m of pattern.matchAll(PLACEHOLDER_RE)) if (!out.includes(m[1])) out.push(m[1])
  return out
}

/** Replace placeholders with the given values; unfilled ones stay bracketed (the ATS check flags them). */
export function fillTemplate(pattern: string, values: Record<string, string>): string {
  const out = pattern
    .replace(PLACEHOLDER_RE, (whole, name: string, offset: number) => {
      let v = values[name]?.trim().replace(/[.;,]+$/, '')
      if (!v) return whole
      // "… by [what you did]" filled with "by rebuilding X" → don't repeat the joining word
      const before = pattern.slice(0, offset).match(/\b(by|to|for|with|in|across|serving|of)\s*$/i)?.[1]
      if (before && v.toLowerCase().startsWith(`${before.toLowerCase()} `)) v = v.slice(before.length + 1).trimStart()
      // mid-sentence: "… by Rebuilding the form" → "… by rebuilding the form" (acronyms / CamelCase untouched)
      return offset > 0 && /^[A-Z][a-z]+(?:\s|$)/.test(v) ? v.charAt(0).toLowerCase() + v.slice(1) : v
    })
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .trim()
  return out.charAt(0).toUpperCase() + out.slice(1)
}

/** Split a pattern into literal text and placeholder parts (for highlighting in the UI). */
export function templateParts(pattern: string): { text: string; placeholder: boolean }[] {
  const parts: { text: string; placeholder: boolean }[] = []
  let last = 0
  for (const m of pattern.matchAll(PLACEHOLDER_RE)) {
    if (m.index! > last) parts.push({ text: pattern.slice(last, m.index), placeholder: false })
    parts.push({ text: m[0], placeholder: true })
    last = m.index! + m[0].length
  }
  if (last < pattern.length) parts.push({ text: pattern.slice(last), placeholder: false })
  return parts
}
