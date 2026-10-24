/**
 * Job-description keyword extraction and resume matching — fully client-side.
 *
 * 1. tokenize → keep tech punctuation (c++, c#, node.js, ci/cd, .net)
 * 2. dictionary pass: 1–3-gram lookups against ~180 canonical terms with aliases
 * 3. phrase pass: frequent non-stopword bigrams/unigrams and capitalised product names
 * 4. weight = frequency × source weight (+ bonus for terms on "required/must" lines)
 */
import { monthsBetween } from './dates.ts'
import { AMBIGUOUS_ALIASES, COMMON_VERBS, LOCATIONS, NAME_NOISE, STOPWORDS, TERMS, VERB_FORMS, type TermCategory } from './dictionaries.ts'
import { extractJobInfo, isCompanyKeyword } from './jobMatch.ts'
import { inlineToPlain } from './markdown.ts'
import type { ResumeData, SectionKind } from './types.ts'

export interface Token {
  /** Lowercased token used for matching. */
  norm: string
  /** Original spelling. */
  raw: string
  /** Index of the line in the source text. */
  line: number
  /** True when this token starts a sentence, line or list item. */
  sentenceStart: boolean
  /** True when punctuation (comma, bracket, dash …) separates this token from the previous one. */
  breakBefore: boolean
}

const ALIAS_INDEX: Map<string, { name: string; category: TermCategory }> = (() => {
  const m = new Map<string, { name: string; category: TermCategory }>()
  for (const term of TERMS) {
    m.set(term.name.toLowerCase(), { name: term.name, category: term.category })
    for (const a of term.aliases) m.set(a, { name: term.name, category: term.category })
  }
  return m
})()

/** term id → id of the broader term it also satisfies (jest → unit testing). */
const IMPLIES: Map<string, string> = new Map(TERMS.filter((t) => t.implies).map((t) => [t.name.toLowerCase(), t.implies!.toLowerCase()]))

const KEEP_WHOLE = new Set(['.net', 'c++', 'c#', 'ci/cd', 'ui/ux', 'a/b', 'node.js', 'next.js', 'vue.js', 'react.js', 'express.js', 'nest.js', 'asp.net', 'socket.io', 'r&d', 'e-commerce'])

/** List markers at the start of a line: "* ", "- ", "• ", "1. ", "2) ", "(a) ", "a. ". */
const LIST_MARKER = /^\s*(?:[*•·▪◦‣➢➤►✓✔>+\-–—]+|\(?\d{1,2}[.)]|\(?[a-zA-Z][.)])\s+/
const SEPARATOR = /^[\s,;:!?()[\]{}"“”‘’|•·–—]+$/

export function tokenize(text: string): Token[] {
  const out: Token[] = []
  text.split(/\r?\n/).forEach((rawLine, line) => {
    const lineText = rawLine.replace(LIST_MARKER, '')
    let sentenceStart = true
    let breakBefore = true
    const parts = lineText.split(/(\s+|[,;:!?()[\]{}"“”‘’|•·–—]+)/)
    for (const part of parts) {
      if (!part) continue
      if (SEPARATOR.test(part)) {
        if (/[!?:;•|–—]/.test(part)) sentenceStart = true
        if (/\S/.test(part)) breakBefore = true
        continue
      }
      let raw = part
      const endsSentence = /[.!?]$/.test(raw) && !/^(e\.g|i\.e|etc)\.?$/i.test(raw)
      raw = raw.replace(/^['".]+(?!net\b)|['".\-/&]+$/gi, '')
      if (!raw || !/[\p{L}\p{N}]/u.test(raw)) {
        // stray punctuation ("*", "/", "&") — skip without consuming the sentence start
        if (endsSentence) sentenceStart = true
        if (raw || endsSentence) breakBefore = true
        continue
      }
      const lower = raw.toLowerCase()
      const pieces = KEEP_WHOLE.has(lower) || ALIAS_INDEX.has(lower) || !/[/&]/.test(raw) ? [raw] : raw.split(/[/&]/).filter(Boolean)
      pieces.forEach((p, k) => {
        out.push({ norm: p.toLowerCase(), raw: p, line, sentenceStart, breakBefore: breakBefore || k > 0 })
        sentenceStart = false
        breakBefore = false
      })
      if (endsSentence) {
        sentenceStart = true
        breakBefore = true
      }
    }
  })
  return out
}

/** Very small stemmer so "systems" ≈ "system", "testing" ≈ "test". */
export function stem(word: string): string {
  let w = word.toLowerCase()
  if (w.length > 5 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`
  else if (w.length > 5 && /(ing|ers)$/.test(w)) w = w.slice(0, -3)
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2)
  else if (w.length > 4 && w.endsWith('es') && /(ss|sh|ch|x)es$/.test(w)) w = w.slice(0, -2)
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)
  return w
}

const isStop = (w: string) => STOPWORDS.has(w) || /^\d+([.,]\d+)?[%k+x]?$/.test(w) || w.length < 2

export interface TermHit {
  name: string
  category: TermCategory
  count: number
  lines: Set<number>
}

/** Dictionary pass: longest-match 3/2/1-gram lookups. */
export function findTerms(tokens: Token[], consumed?: Set<number>): Map<string, TermHit> {
  const hits = new Map<string, TermHit>()
  let i = 0
  while (i < tokens.length) {
    let matched = 0
    for (const n of [3, 2, 1]) {
      if (i + n > tokens.length) continue
      const slice = tokens.slice(i, i + n)
      if (slice.some((t) => t.line !== slice[0].line)) continue
      const key = slice.map((t) => t.norm).join(' ')
      const term = ALIAS_INDEX.get(key)
      if (!term) continue
      if (n === 1 && AMBIGUOUS_ALIASES.has(key) && slice[0].raw === slice[0].norm) continue
      if (n === 1 && (key === 'c' || key === 'r') && slice[0].raw !== key.toUpperCase()) continue
      const id = term.name.toLowerCase()
      const hit = hits.get(id) ?? { name: term.name, category: term.category, count: 0, lines: new Set<number>() }
      hit.count++
      hit.lines.add(slice[0].line)
      hits.set(id, hit)
      if (consumed) for (let k = i; k < i + n; k++) consumed.add(k)
      matched = n
      break
    }
    i += matched || 1
  }
  return hits
}

export type KeywordSource = 'dictionary' | 'phrase' | 'name'

export interface Keyword {
  /** Stable id (lowercase canonical form). */
  key: string
  label: string
  category: TermCategory | 'phrase'
  source: KeywordSource
  count: number
  weight: number
  required: boolean
}

const REQUIRED_LINE = /\b(required|must|minimum|need to have|you have|you bring|requirements|qualifications|essential)\b/i

export function extractKeywords(jd: string, limit = 30): Keyword[] {
  const tokens = tokenize(jd)
  const lines = jd.split(/\r?\n/)
  const requiredLines = new Set<number>()
  let inRequiredBlock = false
  lines.forEach((l, i) => {
    if (/^\s*(nice to have|bonus|preferred|good to have|benefits|perks|about us)/i.test(l)) inRequiredBlock = false
    else if (/^\s*(requirements|qualifications|what you('| wi)ll need|must have|you have|what we're looking for)/i.test(l)) inRequiredBlock = true
    if (inRequiredBlock || REQUIRED_LINE.test(l)) requiredLines.add(i)
  })

  const out = new Map<string, Keyword>()
  const consumed = new Set<number>()
  const terms = findTerms(tokens, consumed)
  for (const [key, hit] of terms) {
    const required = [...hit.lines].some((l) => requiredLines.has(l))
    const base = hit.category === 'soft' || hit.category === 'business' ? 1.5 : 3
    out.set(key, { key, label: hit.name, category: hit.category, source: 'dictionary', count: hit.count, weight: base * Math.min(hit.count, 4) * (required ? 1.5 : 1), required })
  }

  // phrase pass — frequent bigrams of content words
  const bigrams = new Map<string, { label: string; count: number; lines: Set<number> }>()
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i]
    const b = tokens[i + 1]
    if (a.line !== b.line || isStop(a.norm) || isStop(b.norm) || consumed.has(i) || consumed.has(i + 1)) continue
    if (/^\d/.test(a.norm) || /^\d/.test(b.norm)) continue
    const key = `${stem(a.norm)} ${stem(b.norm)}`
    const entry = bigrams.get(key) ?? { label: `${a.norm} ${b.norm}`, count: 0, lines: new Set<number>() }
    entry.count++
    entry.lines.add(a.line)
    bigrams.set(key, entry)
  }
  const usedInPhrases = new Set<string>()
  for (const [key, bg] of bigrams) {
    if (bg.count < 2) continue
    const required = [...bg.lines].some((l) => requiredLines.has(l))
    out.set(key, { key, label: bg.label, category: 'phrase', source: 'phrase', count: bg.count, weight: 1.5 * Math.min(bg.count, 4) * (required ? 1.3 : 1), required })
    key.split(' ').forEach((w) => usedInPhrases.add(w))
  }

  // capitalised product / tool names that are not in the dictionary (Snowflake, Computer Science)
  const lowerSeen = new Set(tokens.filter((tk) => tk.raw === tk.norm).map((tk) => tk.norm))
  const names = new Map<string, { label: string; count: number; lines: Set<number> }>()
  const unigrams = new Map<string, { label: string; count: number; lines: Set<number> }>()
  const nameIdx = new Set<number>()
  const isCap = (tk: Token) => /^[A-Z][a-z]+[A-Z]|^[A-Z]{2,6}$|^[A-Z][a-z0-9]+$/.test(tk.raw)
  const isNameCandidate = (i: number) => {
    const tk = tokens[i]
    return isCap(tk) && !isStop(tk.norm) && !consumed.has(i) && !ALIAS_INDEX.has(tk.norm)
  }
  for (let i = 0; i < tokens.length; ) {
    if (!isNameCandidate(i)) {
      i++
      continue
    }
    // a run of capitalised words on one line with no punctuation between them
    let j = i + 1
    while (j < tokens.length && tokens[j].line === tokens[i].line && !tokens[j].breakBefore && isNameCandidate(j)) j++
    let run = tokens.slice(i, j)
    for (let k = i; k < j; k++) nameIdx.add(k)
    i = j
    // the first word of a sentence / bullet is capitalised anyway — only trust it inside a longer run
    if (run[0].sentenceStart && (run.length === 1 || isCommonWord(run[0].norm))) run = run.slice(1)
    if (!run.length) continue
    const words = run.map((tk) => tk.norm)
    const phrase = words.join(' ')
    if (words.every((w) => NAME_NOISE.has(w) || LOCATIONS.has(w)) || LOCATIONS.has(phrase)) continue
    if (run.length === 1) {
      const tk = run[0]
      const acronym = /^[A-Z]{2,6}$/.test(tk.raw)
      // "Checkout" when "checkout" also appears lowercase is an ordinary word, not a product
      if (!acronym && (isCommonWord(tk.norm) || lowerSeen.has(tk.norm))) continue
    }
    const n = names.get(phrase) ?? { label: run.map((tk) => tk.raw).join(' '), count: 0, lines: new Set<number>() }
    n.count++
    n.lines.add(run[0].line)
    names.set(phrase, n)
  }
  tokens.forEach((tk, i) => {
    if (isStop(tk.norm) || consumed.has(i) || nameIdx.has(i) || ALIAS_INDEX.has(tk.norm) || LOCATIONS.has(tk.norm)) return
    const st = stem(tk.norm)
    if (tk.norm.length > 3 && !usedInPhrases.has(st)) {
      const u = unigrams.get(st) ?? { label: tk.norm, count: 0, lines: new Set<number>() }
      u.count++
      u.lines.add(tk.line)
      unigrams.set(st, u)
    }
  })
  for (const [key, n] of names) {
    if (out.has(key)) continue
    const required = [...n.lines].some((l) => requiredLines.has(l))
    out.set(key, { key, label: n.label, category: 'phrase', source: 'name', count: n.count, weight: 2 * Math.min(n.count, 3) * (required ? 1.3 : 1), required })
  }
  for (const [key, u] of unigrams) {
    if (u.count < 3 || out.has(key)) continue
    out.set(key, { key, label: u.label, category: 'phrase', source: 'phrase', count: u.count, weight: Math.min(u.count, 4) * 0.8, required: false })
  }

  const company = extractJobInfo(jd).company
  return [...out.values()]
    .filter((k) => !isCompanyKeyword(k, company))
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

/** Base form test for words that are never product names (verbs, job-title words, headings). */
function isCommonWord(w: string): boolean {
  return COMMON_VERBS.has(w) || VERB_FORMS.has(w) || NAME_NOISE.has(w)
}

/** Resume-side term hits plus the broader terms they imply (Jest ⇒ Unit testing). */
function withImplied(hits: Map<string, TermHit>): Map<string, TermHit> {
  for (const [id, hit] of [...hits]) {
    const broader = IMPLIES.get(id)
    if (broader && !hits.has(broader)) hits.set(broader, { ...hit, name: broader, lines: new Set(hit.lines) })
  }
  return hits
}

/* --------------------------- resume side --------------------------- */

export interface ResumeCorpus {
  /** Whole resume as text. */
  text: string
  /** Text per section id. */
  sections: { id: string; kind: SectionKind | 'basics'; title: string; text: string }[]
}

export function resumeCorpus(data: ResumeData): ResumeCorpus {
  const b = data.basics
  const sections: ResumeCorpus['sections'] = [{ id: 'basics', kind: 'basics', title: 'Header', text: [b.name, b.title, b.location].join('\n') }]
  for (const s of data.sections) {
    if (s.hidden) continue
    const parts: string[] = [s.title, inlineToPlain(s.content)]
    for (const e of s.items) {
      parts.push(e.title, e.subtitle, e.location, e.meta, inlineToPlain(e.description), ...e.bullets.map((x) => inlineToPlain(x)), e.keywords.join(', '))
    }
    sections.push({ id: s.id, kind: s.kind, title: s.title, text: parts.filter(Boolean).join('\n') })
  }
  return { text: sections.map((s) => s.text).join('\n'), sections }
}

function phraseSet(text: string): Set<string> {
  const toks = tokenize(text)
  const set = new Set<string>()
  for (let i = 0; i < toks.length; i++) {
    set.add(stem(toks[i].norm))
    if (i + 1 < toks.length && toks[i].line === toks[i + 1].line) set.add(`${stem(toks[i].norm)} ${stem(toks[i + 1].norm)}`)
  }
  return set
}

function containsKeyword(k: Keyword, terms: Map<string, TermHit>, phrases: Set<string>): boolean {
  if (k.source === 'dictionary') return terms.has(k.key)
  return phrases.has(k.key) || phrases.has(stem(k.key))
}

export interface MatchResult {
  score: number
  keywords: (Keyword & { matched: boolean; foundIn: string[]; suggestion: string })[]
  matched: number
  missing: number
  yearsRequired: number | null
  yearsOnResume: number
}

export function suggestPlacement(k: Keyword): string {
  switch (k.category) {
    case 'soft':
      return 'Show it in an Experience bullet (e.g. “Led…”, “Partnered with…”) or your Summary'
    case 'business':
      return 'Mention the domain in your Summary or the relevant Experience entry'
    case 'methodology':
      return 'Describe how you applied it in an Experience bullet'
    case 'certification':
      return 'Add it to Certifications if you hold it'
    case 'phrase':
      return 'Work the phrase into a Summary sentence or Experience bullet'
    default:
      return 'Add it to Skills and back it up in an Experience or Project bullet'
  }
}

export function yearsRequired(jd: string): number | null {
  const m = /(\d{1,2})\s*\+?\s*(?:-|–|to)?\s*(?:\d{1,2})?\s*\+?\s*years?/i.exec(jd)
  return m ? Number(m[1]) : null
}

export function yearsOfExperience(data: ResumeData, now = new Date()): number {
  const exp = data.sections.filter((s) => s.kind === 'experience' && !s.hidden).flatMap((s) => s.items)
  const months = exp.reduce((sum, e) => sum + monthsBetween(e.start, e.end, e.current, now), 0)
  return Math.round((months / 12) * 10) / 10
}

export function matchResume(data: ResumeData, jd: string, now = new Date()): MatchResult {
  const keywords = extractKeywords(jd)
  const corpus = resumeCorpus(data)
  const allTerms = withImplied(findTerms(tokenize(corpus.text)))
  const allPhrases = phraseSet(corpus.text)
  const perSection = corpus.sections.map((s) => ({ ...s, terms: withImplied(findTerms(tokenize(s.text))), phrases: phraseSet(s.text) }))

  let got = 0
  let total = 0
  const rows = keywords.map((k) => {
    const matched = containsKeyword(k, allTerms, allPhrases)
    total += k.weight
    if (matched) got += k.weight
    const foundIn = matched ? perSection.filter((s) => containsKeyword(k, s.terms, s.phrases)).map((s) => s.title) : []
    return { ...k, matched, foundIn, suggestion: matched ? '' : suggestPlacement(k) }
  })
  return {
    score: total ? Math.round((got / total) * 100) : 0,
    keywords: rows,
    matched: rows.filter((r) => r.matched).length,
    missing: rows.filter((r) => !r.matched).length,
    yearsRequired: yearsRequired(jd),
    yearsOnResume: yearsOfExperience(data, now),
  }
}
