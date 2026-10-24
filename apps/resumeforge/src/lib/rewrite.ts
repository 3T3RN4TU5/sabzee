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
    // "planning and executing launches" → "Planned and executed launches" (every gerund in the chain)
    const chain = gerundChainToPast(rest)
    if (chain !== null) return cap(chain)
    // an unknown verb later in the chain: swap just the hidden verb (issueFixes won't offer this)
    rest = rest.replace(/^[A-Za-z]+\s*/, '')
  }
  return rest ? `${cap(verb.trim())} ${rest}` : cap(verb.trim())
}

const CHAIN_SEP = /^(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or|&)\s+)/i

/**
 * Turn a leading run of gerunds joined by commas / "and" / "or" into the past tense:
 * "designing, building and testing the API" → "designed, built and tested the API".
 * Null when one of the gerunds is not a known verb (the result would mix tenses).
 */
export function gerundChainToPast(text: string): string | null {
  let out = ''
  let rest = text
  // the chain is all gerunds ("planning and executing") or all bare verbs ("Helped migrate and test")
  const firstWord = text.match(/^[A-Za-z]+/)?.[0] ?? ''
  const gerunds = /(?<![a-z])[a-z]{2,}ing$/i.test(firstWord)
  const sameForm = (w: string) => (gerunds ? /(?<![a-z])[a-z]{2,}ing$/i.test(w) && !/thing$/i.test(w) : VERB_FORMS.get(w.toLowerCase())?.base === w.toLowerCase())
  for (;;) {
    const w = rest.match(/^[A-Za-z]+/)?.[0]
    const base = w ? verbBase(w) : null
    if (!w || !base) return null
    out += pastTense(base)
    rest = rest.slice(w.length)
    const sep = rest.match(CHAIN_SEP)?.[0]
    const nextWord = sep ? rest.slice(sep.length).match(/^[A-Za-z]+/)?.[0] : undefined
    if (!sep || !nextWord || !sameForm(nextWord)) break
    out += sep
    rest = rest.slice(sep.length)
  }
  return out + rest
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
  let out = text
  for (const pair of detectSpelling(text)) {
    if (pair.right !== right) continue
    const re = new RegExp(`(^|[^A-Za-z0-9.+#/-])${escapeRe(pair.wrong)}(?![A-Za-z0-9+#])`, 'g')
    out = out.replace(re, (_m, pre: string) => `${pre}${right}`)
  }
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
  let suggestions = [...(issue.suggestions ?? [])]
  if (issue.rule === 'weak-verb' && text) {
    const d = derivedVerb(text)
    const copyOnly = suggestions.map((label) => ({ label, value: null }))
    // "Responsible for building X" → only "Built X"; "Led building X" would be ungrammatical
    if (d) {
      const value = gerundChainToPast(afterOpener(text) ?? '') === null ? null : rewriteWeakOpener(text, d)
      // "planning and reconciling" — an unknown verb later in the chain: no safe rewrite
      return value ? [{ label: d, value }] : copyOnly
    }
    if (detectWeakOpener(text.trim())?.copyOnly) return copyOnly
    else if (/^[a-z]{3,}ing\b/i.test(afterOpener(text) ?? '')) {
      // an unknown gerund ("Responsible for reconciling") — no safe automatic rewrite
      return suggestions.map((label) => ({ label, value: null }))
    } else if (hidesBareVerb(text)) {
      // "Helped the team ship faster" → "Enabled the team to ship faster" (the only safe shape)
      const value = enableRewrite(text)
      return value ? [{ label: 'Enabled', value }] : suggestions.map((label) => ({ label, value: null }))
    }
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

/** Text after the weak opener, or null. */
function afterOpener(text: string): string | null {
  const t = text.trim()
  const hit = detectWeakOpener(t)
  const m = hit && t.match(hit.pattern)
  return m ? t.slice(m[0].length).trimStart() : null
}

/** "Helped <object> <bare verb> …": a verb in base form within the next few words. */
function hidesBareVerb(text: string): boolean {
  const t = text.trim()
  if (!/^helped\b/i.test(t)) return false
  const rest = afterOpener(t)
  if (!rest) return false
  const words = rest.split(/\s+/).slice(1, 5)
  return words.some((w) => VERB_FORMS.get(w.toLowerCase())?.tense === 'present' && VERB_FORMS.get(w.toLowerCase())?.base === w.toLowerCase())
}

function enableRewrite(text: string): string | null {
  const rest = afterOpener(text)
  if (!rest || startsWithMarkup(text)) return null
  const words = rest.split(/\s+/)
  const i = words.findIndex((w, k) => k > 0 && k < 5 && VERB_FORMS.get(w.toLowerCase())?.base === w.toLowerCase())
  if (i < 1) return null
  return `Enabled ${[...words.slice(0, i), 'to', ...words.slice(i)].join(' ')}`
}
