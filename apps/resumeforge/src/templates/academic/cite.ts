/**
 * Pure helpers for the Academic CV template (no React, no DOM — tested in tests/tpl-academic.test.ts).
 *   - splitAuthors: tokenises an author list and flags the CV owner's own name so it can be bolded,
 *     the convention in academic publication lists.
 *   - educationFirst: academic CVs lead with education — moves it right after any opening summary.
 *   - terminate: appends a full stop unless the text already ends with terminal punctuation.
 */
import type { SectionKind } from '../../lib/types.ts'

export interface AuthorToken {
  text: string
  /** True when this token is the CV owner's name. */
  self: boolean
}

const TITLES = /^(dr|prof|professor|mr|mrs|ms|mx|sir|dame)\.?$/i
const SUFFIXES = /^(phd|ph\.d\.?|md|jr\.?|sr\.?|ii|iii|iv)$/i
const SEPARATOR = /(\s*;\s*|\s*,\s*(?:and\s+|&\s*)?|\s+and\s+|\s*&\s*)/i

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Given name initial + surname of the CV owner ("Dr. Meera Iyer" → { initial: 'm', surname: 'iyer' }). */
export function ownerKey(name: string): { initial: string; surname: string } | null {
  const words = name
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w && !TITLES.test(w) && !SUFFIXES.test(w))
  if (!words.length) return null
  const surname = fold(words[words.length - 1].replace(/[^\p{L}'-]/gu, ''))
  if (!surname) return null
  const initial = words.length > 1 ? fold(words[0]).charAt(0) : ''
  return { initial, surname }
}

function isOwner(author: string, key: { initial: string; surname: string }): boolean {
  const words = fold(author)
    .split(/[\s.,]+/)
    .filter(Boolean)
  const at = words.indexOf(key.surname)
  if (at < 0) return false
  const others = words.filter((_, i) => i !== at)
  if (!others.length || !key.initial) return true
  // "M. Iyer", "Meera Iyer", "Iyer M", "M.R. Iyer" → the first given name/initial must match
  return others[0].charAt(0) === key.initial
}

/** Split "M. Iyer, R. Varma and S. Khan" into author/separator tokens, flagging the owner's name. */
export function splitAuthors(list: string, ownerName: string): AuthorToken[] {
  // Collapse whitespace runs first: the separator alternatives all start with \s*, which made
  // splitting a long whitespace run quadratic (~2 s on 20k spaces).
  const text = list.replace(/\s+/g, ' ').trim()
  if (!text) return []
  const key = ownerKey(ownerName)
  const pieces = text.split(SEPARATOR)
  const out: AuthorToken[] = []
  pieces.forEach((piece, i) => {
    if (!piece) return
    const isSep = i % 2 === 1
    out.push({ text: piece, self: !isSep && !!key && isOwner(piece, key) })
  })
  return out
}

/** Move the education section(s) right after any summary sections at the top. Order is otherwise kept. */
export function educationFirst<T extends { kind: SectionKind }>(sections: readonly T[]): T[] {
  let lead = 0
  while (lead < sections.length && sections[lead].kind === 'summary') lead++
  const firstEdu = sections.findIndex((s) => s.kind === 'education')
  // no education, or it already comes before any non-summary section → keep the user's order
  if (firstEdu < 0 || firstEdu <= lead) return [...sections]
  const edu = sections.filter((s) => s.kind === 'education')
  const rest = sections.filter((s) => s.kind !== 'education')
  return [...rest.slice(0, lead), ...edu, ...rest.slice(lead)]
}

/** "Interspeech" → "Interspeech." ; "Iyer, M." and "Why?" stay as they are. */
export function terminate(text: string): string {
  const t = text.trim()
  if (!t) return ''
  return /[.!?…]["'”’)]*$/.test(t) ? t : `${t}.`
}
