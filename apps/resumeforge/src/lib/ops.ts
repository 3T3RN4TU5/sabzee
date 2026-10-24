/**
 * Immutable editing helpers for ResumeData. Every function returns a new object when something
 * changed and the *same* object when the call was a no-op (unknown id, identical value…), so the
 * store can skip history entries and re-renders cheaply with a reference check.
 */
import { uid } from './ids.ts'
import { KIND_SPECS, createEntry, createSection } from './sections.ts'
import type { Basics, Entry, ResumeData, Section, SectionKind } from './types.ts'

export type SectionPatch = Partial<Pick<Section, 'title' | 'hidden' | 'column' | 'content'>>
export type EntryPatch = Partial<Omit<Entry, 'id'>>

const same = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
  return false
}

/** True when applying `patch` to `obj` would not change anything. */
export function isNoopPatch<T extends object>(obj: T, patch: Partial<T>): boolean {
  return (Object.keys(patch) as (keyof T)[]).every((k) => patch[k] === undefined || same(obj[k], patch[k]))
}

const clampIndex = (i: number, len: number) => Math.max(0, Math.min(len, Math.trunc(i)))

/** Move one element; returns the same array for out-of-range or identical positions. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list as T[]
  const target = Math.max(0, Math.min(list.length - 1, Math.trunc(to)))
  if (target === from) return list as T[]
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

function mapSection(data: ResumeData, sectionId: string, fn: (s: Section) => Section): ResumeData {
  const idx = data.sections.findIndex((s) => s.id === sectionId)
  if (idx < 0) return data
  const next = fn(data.sections[idx])
  if (next === data.sections[idx]) return data
  const sections = data.sections.slice()
  sections[idx] = next
  return { ...data, sections }
}

function mapEntry(data: ResumeData, sectionId: string, entryId: string, fn: (e: Entry) => Entry): ResumeData {
  return mapSection(data, sectionId, (s) => {
    const idx = s.items.findIndex((e) => e.id === entryId)
    if (idx < 0) return s
    const next = fn(s.items[idx])
    if (next === s.items[idx]) return s
    const items = s.items.slice()
    items[idx] = next
    return { ...s, items }
  })
}

export function findSection(data: ResumeData, sectionId: string): Section | undefined {
  return data.sections.find((s) => s.id === sectionId)
}

export function findEntry(data: ResumeData, sectionId: string, entryId: string): Entry | undefined {
  return findSection(data, sectionId)?.items.find((e) => e.id === entryId)
}

/* ---------------- basics ---------------- */

export function updateBasics(data: ResumeData, patch: Partial<Basics>): ResumeData {
  if (isNoopPatch(data.basics, patch)) return data
  return { ...data, basics: { ...data.basics, ...patch } }
}

/* ---------------- sections ---------------- */

/** Built-in kinds may appear once; `custom` any number of times. */
export function canAddSection(data: ResumeData, kind: SectionKind): boolean {
  return KIND_SPECS[kind].repeatable || !data.sections.some((s) => s.kind === kind)
}

export interface AddSectionOptions {
  title?: string
  /** Insert position (default: end). */
  index?: number
  /** Start with one empty entry so the form has something to fill (default: true except summary). */
  withEntry?: boolean
  /** Use this id (for tests / deterministic callers). */
  id?: string
}

/**
 * Add a section. For a non-repeatable kind that already exists nothing changes and the existing
 * section's id is returned, so "Add Skills" twice simply jumps to the existing section.
 */
export function addSection(data: ResumeData, kind: SectionKind, opts: AddSectionOptions = {}): { data: ResumeData; id: string } {
  if (!canAddSection(data, kind)) return { data, id: data.sections.find((s) => s.kind === kind)!.id }
  const withEntry = opts.withEntry ?? kind !== 'summary'
  const section = createSection(kind, opts.title, { ...(opts.id ? { id: opts.id } : {}), items: withEntry ? [createEntry(kind)] : [] })
  const sections = data.sections.slice()
  sections.splice(opts.index === undefined ? sections.length : clampIndex(opts.index, sections.length), 0, section)
  return { data: { ...data, sections }, id: section.id }
}

export function updateSection(data: ResumeData, sectionId: string, patch: SectionPatch): ResumeData {
  return mapSection(data, sectionId, (s) => (isNoopPatch(s, patch) ? s : { ...s, ...patch }))
}

export function removeSection(data: ResumeData, sectionId: string): ResumeData {
  const sections = data.sections.filter((s) => s.id !== sectionId)
  return sections.length === data.sections.length ? data : { ...data, sections }
}

export function moveSection(data: ResumeData, from: number, to: number): ResumeData {
  const sections = moveItem(data.sections, from, to)
  return sections === data.sections ? data : { ...data, sections }
}

/** Deep copy of a section with fresh ids (custom sections only make sense to duplicate, but any kind works). */
export function duplicateSection(data: ResumeData, sectionId: string): { data: ResumeData; id: string } {
  const idx = data.sections.findIndex((s) => s.id === sectionId)
  if (idx < 0) return { data, id: sectionId }
  const src = data.sections[idx]
  const copy: Section = { ...src, id: uid(), kind: src.kind, title: src.title, items: src.items.map((e) => ({ ...e, id: uid(), bullets: [...e.bullets], keywords: [...e.keywords] })) }
  // a duplicated built-in section becomes a custom one so the "one per kind" rule still holds
  if (!KIND_SPECS[src.kind].repeatable) copy.kind = 'custom'
  const sections = data.sections.slice()
  sections.splice(idx + 1, 0, copy)
  return { data: { ...data, sections }, id: copy.id }
}

/* ---------------- entries ---------------- */

export function addEntry(data: ResumeData, sectionId: string, patch: EntryPatch = {}, index?: number): { data: ResumeData; id: string } {
  const section = findSection(data, sectionId)
  if (!section) return { data, id: '' }
  const entry = createEntry(section.kind, patch)
  const next = mapSection(data, sectionId, (s) => {
    const items = s.items.slice()
    items.splice(index === undefined ? items.length : clampIndex(index, items.length), 0, entry)
    return { ...s, items }
  })
  return { data: next, id: entry.id }
}

export function updateEntry(data: ResumeData, sectionId: string, entryId: string, patch: EntryPatch): ResumeData {
  const { id: _ignored, ...clean } = patch as EntryPatch & { id?: string }
  return mapEntry(data, sectionId, entryId, (e) => (isNoopPatch(e, clean) ? e : { ...e, ...clean, id: e.id }))
}

export function removeEntry(data: ResumeData, sectionId: string, entryId: string): ResumeData {
  return mapSection(data, sectionId, (s) => {
    const items = s.items.filter((e) => e.id !== entryId)
    return items.length === s.items.length ? s : { ...s, items }
  })
}

/** Copy an entry (fresh id) and insert it right after the original. */
export function duplicateEntry(data: ResumeData, sectionId: string, entryId: string): { data: ResumeData; id: string } {
  const src = findEntry(data, sectionId, entryId)
  if (!src) return { data, id: '' }
  const copy: Entry = { ...src, id: uid(), bullets: [...src.bullets], keywords: [...src.keywords] }
  const next = mapSection(data, sectionId, (s) => {
    const items = s.items.slice()
    items.splice(s.items.findIndex((e) => e.id === entryId) + 1, 0, copy)
    return { ...s, items }
  })
  return { data: next, id: copy.id }
}

export function moveEntry(data: ResumeData, sectionId: string, from: number, to: number): ResumeData {
  return mapSection(data, sectionId, (s) => {
    const items = moveItem(s.items, from, to)
    return items === s.items ? s : { ...s, items }
  })
}

/** Move an entry to another section (e.g. drag between custom sections). */
export function transferEntry(data: ResumeData, fromSectionId: string, entryId: string, toSectionId: string, index?: number): ResumeData {
  if (fromSectionId === toSectionId) return data
  const entry = findEntry(data, fromSectionId, entryId)
  if (!entry || !findSection(data, toSectionId)) return data
  const removed = removeEntry(data, fromSectionId, entryId)
  return mapSection(removed, toSectionId, (s) => {
    const items = s.items.slice()
    items.splice(index === undefined ? items.length : clampIndex(index, items.length), 0, entry)
    return { ...s, items }
  })
}

/* ---------------- bullets ---------------- */

export function addBullet(data: ResumeData, sectionId: string, entryId: string, text = '', index?: number): ResumeData {
  return mapEntry(data, sectionId, entryId, (e) => {
    const bullets = e.bullets.slice()
    bullets.splice(index === undefined ? bullets.length : clampIndex(index, bullets.length), 0, text)
    return { ...e, bullets }
  })
}

export function updateBullet(data: ResumeData, sectionId: string, entryId: string, index: number, text: string): ResumeData {
  return mapEntry(data, sectionId, entryId, (e) => {
    if (index < 0 || index >= e.bullets.length || e.bullets[index] === text) return e
    const bullets = e.bullets.slice()
    bullets[index] = text
    return { ...e, bullets }
  })
}

export function removeBullet(data: ResumeData, sectionId: string, entryId: string, index: number): ResumeData {
  return mapEntry(data, sectionId, entryId, (e) => {
    if (index < 0 || index >= e.bullets.length) return e
    return { ...e, bullets: e.bullets.filter((_, i) => i !== index) }
  })
}

export function moveBullet(data: ResumeData, sectionId: string, entryId: string, from: number, to: number): ResumeData {
  return mapEntry(data, sectionId, entryId, (e) => {
    const bullets = moveItem(e.bullets, from, to)
    return bullets === e.bullets ? e : { ...e, bullets }
  })
}

/** Deep clone with fresh section and entry ids (used when duplicating a whole resume). */
export function cloneData(data: ResumeData, freshIds = false): ResumeData {
  return {
    basics: { ...data.basics },
    sections: data.sections.map((s) => ({
      ...s,
      id: freshIds ? uid() : s.id,
      items: s.items.map((e) => ({ ...e, id: freshIds ? uid() : e.id, bullets: [...e.bullets], keywords: [...e.keywords] })),
    })),
  }
}
