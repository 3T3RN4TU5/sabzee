/**
 * One-click bullet rewrites used by the ATS checker's suggestion chips and the bullet helper's verb
 * picker. Pure string functions — they work on the raw (inline-markdown) bullet text and return
 * `null` when a rewrite would be unsafe (e.g. the bullet starts with markdown markup).
 */
import type { Issue } from './analysis.ts'
import { detectSpelling, detectWeakOpener } from './analysis.ts'
import { pastTense, TERMS, VERB_FORMS } from './dictionaries.ts'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const TERM_WORDS: Set<string> = (() => {
  const s = new Set<string>()
  for (const t of TERMS) {
    s.add(t.name.toLowerCase())
    for (const a of t.aliases) s.add(a)
  }
  return s
})()

/** A suggestion that is an instruction ("Rewrite as an achievement: Built…") cannot be applied. */
export function isApplicableVerb(suggestion: string): boolean {
  return /^[A-Za-z][A-Za-z-]*(?: [a-z]+)?$/.test(suggestion.trim()) && !/[…:]/.test(suggestion)
}

/** Base form of a known verb in any form, including gerunds ("building" → "build"). */
export function verbBase(word: string): string | null {
  const w = word.toLowerCase()
  const known = VERB_FORMS.get(w)
  if (known) return known.base
  if (w.length > 4 && w.endsWith('ing')) {
    const stem = w.slice(0, -3)
    const candidates = [stem, `${stem}e`, stem.replace(/(.)\1$/, '$1'), stem.replace(/y$/, 'ie')]
    for (const c of candidates) {
      const f = VERB_FORMS.get(c)
      if (f && f.base === c) return c
    }
  }
  return null
}

function startsWithMarkup(text: string): boolean {
  return /^\s*[*_`[]/.test(text)
}

/**
 * The verb hidden behind a weak opener, if any: "Responsible for building the API" → "Built",
 * "Helped migrate 3 services" → "Migrated". Returned capitalised in the past tense.
 */
export function derivedVerb(text: string): string | null {
  const t = text.trim()
  const hit = detectWeakOpener(t)
  if (!hit) return null
  const m = t.match(hit.pattern)
  if (!m) return null
  const next = t.slice(m[0].length).trimStart().match(/^[A-Za-z]+/)?.[0]
  const base = next ? verbBase(next) : null
  if (!base || ['help', 'assist', 'work', 'use', 'make', 'do', 'get', 'try', 'handle', 'participate', 'involve', 'utilize'].includes(base)) return null
  return cap(pastTense(base))
}

/**
 * Replace a weak opener ("Responsible for", "Worked on", "Helped") with `verb`.
 * When the opener hides another verb ("Responsible for building …") and `verb` is that verb's past
 * tense, the hidden verb is consumed: "Built …".
 */
export function rewriteWeakOpener(text: string, verb: string): string | null {
  if (startsWithMarkup(text) || !isApplicableVerb(verb)) return null
  const t = text.trim()
  const hit = detectWeakOpener(t)
  if (!hit) return null
  const m = t.match(hit.pattern)
  if (!m) return null
  let rest = t.slice(m[0].length).trimStart()
  const derived = derivedVerb(t)
  if (derived && derived.toLowerCase() === verb.trim().toLowerCase()) {
    rest = rest.replace(/^[A-Za-z]+\s*/, '')
  }
  return rest ? `${cap(verb.trim())} ${rest}` : cap(verb.trim())
}

/** Lower-case a sentence-initial common word so it can follow a verb ("Payment API" → "payment API"). */
function lowerFirstWord(text: string): string {
  const w = text.match(/^[A-Za-z]+/)?.[0]
  if (!w || !/^[A-Z][a-z]+$/.test(w) || TERM_WORDS.has(w.toLowerCase())) return text
  return w.toLowerCase() + text.slice(w.length)
}

/** Put an action verb in front of a bullet that doesn't start with one. */
export function prefixVerb(text: string, verb: string): string | null {
  if (startsWithMarkup(text) || !isApplicableVerb(verb)) return null
  const t = text.trim()
  return t ? `${cap(verb.trim())} ${lowerFirstWord(t)}` : `${cap(verb.trim())} `
}

/** Swap the bullet's first word (a verb) for `verb`: "Build dashboards" → "Built dashboards". */
export function replaceFirstVerb(text: string, verb: string): string | null {
  if (startsWithMarkup(text) || !isApplicableVerb(verb)) return null
  const t = text.trim()
  const w = t.match(/^[A-Za-z][A-Za-z-]*/)?.[0]
  if (!w) return null
  return cap(verb.trim()) + t.slice(w.length)
}

const escapeRe = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

/** Replace every occurrence of the misspelling that maps to `right` (whole tokens only). */
export function fixSpelling(text: string, right: string): string | null {
  const pair = detectSpelling(text).find((p) => p.right === right)
  if (!pair) return null
  const re = new RegExp(`(^|[^A-Za-z0-9.+#/-])${escapeRe(pair.wrong)}(?![A-Za-z0-9+#])`, 'g')
  const out = text.replace(re, (_m, pre: string) => `${pre}${right}`)
  return out === text ? null : out
}

/**
 * Best-effort verb insertion for the bullet helper: replaces a weak opener or an opening verb,
 * otherwise prefixes the verb. An empty bullet becomes "Verb " (ready to keep typing).
 */
export function applyVerb(text: string, verb: string): string {
  const t = text.trim()
  if (!t) return `${cap(verb.trim())} `
  if (startsWithMarkup(t)) return `${cap(verb.trim())} ${t}`
  if (detectWeakOpener(t)) return rewriteWeakOpener(t, verb) ?? `${cap(verb.trim())} ${t}`
  const w = t.match(/^[A-Za-z][A-Za-z-]*/)?.[0] ?? ''
  if (w && (VERB_FORMS.has(w.toLowerCase()) || /^[A-Za-z]{3,}ed$/.test(w))) return replaceFirstVerb(t, verb) ?? t
  return prefixVerb(t, verb) ?? t
}

export interface IssueFix {
  /** Chip label (the suggested word). */
  label: string
  /** The rewritten text, or null when the suggestion can only be copied. */
  value: string | null
}

/**
 * Concrete rewrites for an issue's suggestions, applied to the current text of the issue's target.
 * Weak openers also get the "hidden verb" suggestion first ("Responsible for building" → "Built").
 */
export function issueFixes(issue: Pick<Issue, 'rule' | 'suggestions'>, text: string | null): IssueFix[] {
  const suggestions = [...(issue.suggestions ?? [])]
  if (issue.rule === 'weak-verb' && text) {
    const d = derivedVerb(text)
    if (d && !suggestions.some((s) => s.toLowerCase() === d.toLowerCase())) suggestions.unshift(d)
  }
  return suggestions.map((label) => {
    if (text === null) return { label, value: null }
    let value: string | null = null
    switch (issue.rule) {
      case 'weak-verb':
        value = rewriteWeakOpener(text, label)
        break
      case 'no-action-verb':
        value = prefixVerb(text, label)
        break
      case 'tense-past':
      case 'repeated-verb':
        value = replaceFirstVerb(text, label)
        break
      case 'spelling':
        value = fixSpelling(text, label)
        break
    }
    return { label, value: value !== null && value !== text ? value : null }
  })
}
