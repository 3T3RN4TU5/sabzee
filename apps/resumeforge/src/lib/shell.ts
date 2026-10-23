/**
 * Pure helpers for the app shell, dashboard, editor and design panel (React-free, DOM-free).
 * OWNER: shell agent. Tested in tests/shell.test.ts.
 */
import { MONTHS_SHORT } from './dates.ts'
import { defaultDesign } from './design.ts'
import type { Design, ResumeDoc } from './types.ts'

/* ---------------- relative time ---------------- */

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then "12 Mar 2026". */
export function relativeTime(t: number, now: number = Date.now()): string {
  const s = Math.round((now - t) / 1000)
  if (!Number.isFinite(s)) return ''
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  const days = Math.floor(s / 86400)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const d = new Date(t)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`
}

/* ---------------- dashboard ---------------- */

export type ResumeSort = 'updated' | 'created' | 'name'

/** Filter by name / person / job title (case-insensitive) and sort. Never mutates the input. */
export function sortResumes(list: readonly ResumeDoc[], by: ResumeSort = 'updated', query = ''): ResumeDoc[] {
  const q = query.trim().toLowerCase()
  const hit = (r: ResumeDoc) => !q || [r.name, r.data.basics.name, r.data.basics.title].some((x) => x.toLowerCase().includes(q))
  const out = list.filter(hit)
  if (by === 'name') return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || b.updatedAt - a.updatedAt)
  if (by === 'created') return out.sort((a, b) => b.createdAt - a.createdAt)
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

/* ---------------- templates ---------------- */

export const TEMPLATE_FILTERS = ['All', 'ATS-friendly', 'Two-column', 'Photo', 'Creative', 'One-page'] as const
export type TemplateFilter = (typeof TEMPLATE_FILTERS)[number]

/** Keep templates carrying `tag` ('All' keeps everything). */
export function filterByTag<T extends { tags: readonly string[] }>(list: readonly T[], tag: TemplateFilter | string): T[] {
  return tag === 'All' ? [...list] : list.filter((t) => t.tags.includes(tag))
}

/**
 * "Reset to template defaults": restore the style settings (accent, font, sizes, spacing, margins,
 * heading case, photo shape, icons) and keep the template, paper, date format and photo visibility.
 */
export function resetDesignToTemplate(design: Design, templateDefaults: { defaultAccent: string }): Design {
  return {
    ...design,
    accent: templateDefaults.defaultAccent || defaultDesign.accent,
    font: 'auto',
    fontSize: defaultDesign.fontSize,
    lineHeight: defaultDesign.lineHeight,
    spacing: defaultDesign.spacing,
    margin: defaultDesign.margin,
    headingCase: 'auto',
    photoShape: defaultDesign.photoShape,
    showIcons: defaultDesign.showIcons,
  }
}

/* ---------------- zoom ---------------- */

export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5] as const

/** Next zoom when pressing +/−: snaps to the 10 % grid, clamped to [min, max]. */
export function stepZoom(scale: number, dir: 1 | -1, limits: { min: number; max: number; step: number }): number {
  const grid = Math.round(1 / limits.step)
  const cur = scale * grid
  const snapped = dir > 0 ? Math.floor(cur + 1e-6) + 1 : Math.ceil(cur - 1e-6) - 1
  return Math.min(limits.max, Math.max(limits.min, Math.round(snapped) / grid))
}

/** Scale at which a page of `paperWidthPx` fits `containerWidth` (minus `pad`), clamped. */
export function fitScale(containerWidth: number, paperWidthPx: number, pad: number, limits: { min: number; max: number }, cap = 1.4): number {
  if (!containerWidth || !paperWidthPx) return 0.6
  return Math.max(limits.min, Math.min(cap, limits.max, (containerWidth - pad) / paperWidthPx))
}

/* ---------------- tags input ---------------- */

/** Split pasted/typed text into tags on commas, semicolons, bullets and new lines. */
export function splitTags(text: string): string[] {
  return text
    .split(/[,;\n•·|]+/)
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** Append tags from `text`, skipping case-insensitive duplicates. Returns the same array when nothing changes. */
export function addTags(existing: readonly string[], text: string): string[] {
  const seen = new Set(existing.map((x) => x.toLowerCase()))
  const add: string[] = []
  for (const t of splitTags(text)) {
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    add.push(t.slice(0, 80))
  }
  return add.length ? [...existing, ...add] : (existing as string[])
}

/* ---------------- inline markdown toolbar ---------------- */

export type MarkKind = 'bold' | 'italic' | 'link'

export interface TextEdit {
  text: string
  /** New selection. */
  start: number
  end: number
}

const MARKS: Record<Exclude<MarkKind, 'link'>, string> = { bold: '**', italic: '*' }

/**
 * Apply a toolbar action to `text` with the selection [start, end):
 * bold/italic wrap (or unwrap when already wrapped); link turns the selection into `[sel](https://)`
 * and selects the URL so it can be typed over.
 */
export function applyMark(text: string, start: number, end: number, kind: MarkKind): TextEdit {
  const a = Math.max(0, Math.min(start, end, text.length))
  const b = Math.max(a, Math.min(Math.max(start, end), text.length))
  const sel = text.slice(a, b)
  if (kind === 'link') {
    const core = sel.trim()
    if (/^(https?:\/\/|www\.)\S+$/i.test(core)) {
      // A URL was selected: wrap it and select the label placeholder.
      const url = core.toLowerCase().startsWith('www.') ? `https://${core}` : core
      const insert = `[link text](${url})`
      return { text: text.slice(0, a) + insert + text.slice(b), start: a + 1, end: a + 1 + 'link text'.length }
    }
    const label = core || 'link text'
    const insert = `[${label}](https://)`
    const urlStart = a + label.length + 3
    return { text: text.slice(0, a) + insert + text.slice(b), start: urlStart, end: urlStart + 'https://'.length }
  }
  const m = MARKS[kind]
  const before = text.slice(Math.max(0, a - m.length), a)
  const after = text.slice(b, b + m.length)
  // Unwrap "**sel**" (selection inside the marks). For italic, don't treat bold's "**" as italic.
  const isWrapped = before === m && after === m && (kind !== 'italic' || (text[a - 2] !== '*' && text[b + 1] !== '*'))
  if (isWrapped) {
    return { text: text.slice(0, a - m.length) + sel + text.slice(b + m.length), start: a - m.length, end: b - m.length }
  }
  // Selection includes the marks: "**sel**" selected → unwrap.
  if (sel.length >= m.length * 2 + 1 && sel.startsWith(m) && sel.endsWith(m) && (kind !== 'italic' || !sel.startsWith('**'))) {
    const inner = sel.slice(m.length, sel.length - m.length)
    return { text: text.slice(0, a) + inner + text.slice(b), start: a, end: a + inner.length }
  }
  // Keep surrounding spaces outside the marks ("**word** " not "**word **").
  const lead = sel.length - sel.trimStart().length
  const trail = sel.length - sel.trimEnd().length
  const core = sel.trim()
  if (!core) {
    const placeholder = kind === 'bold' ? 'bold text' : 'italic text'
    const next = text.slice(0, a) + m + placeholder + m + text.slice(b)
    return { text: next, start: a + m.length, end: a + m.length + placeholder.length }
  }
  const next = text.slice(0, a + lead) + m + core + m + text.slice(b - trail)
  return { text: next, start: a + lead + m.length, end: a + lead + m.length + core.length }
}

/* ---------------- dates (month picker) ---------------- */

/** Years offered by the month picker: `ahead` future years down to `back` years ago (newest first). */
export function yearOptions(now: Date = new Date(), back = 60, ahead = 6): number[] {
  const y = now.getFullYear()
  return Array.from({ length: back + ahead + 1 }, (_, i) => y + ahead - i)
}

/* ---------------- photo crop ---------------- */

export interface CropState {
  /** 1 = the image just covers the square viewport. */
  zoom: number
  /** Offset of the image centre from the viewport centre, in viewport px. */
  x: number
  y: number
}

export const CROP_ZOOM = { min: 1, max: 4 }

/** Image scale (viewport px per source px) at zoom 1: the shorter side fills the viewport. */
export function coverScale(imgW: number, imgH: number, view: number): number {
  return view / Math.max(1, Math.min(imgW, imgH))
}

/** Clamp zoom and offsets so the image always covers the viewport (no empty edges). */
export function clampCrop(c: CropState, imgW: number, imgH: number, view: number): CropState {
  const zoom = Math.min(CROP_ZOOM.max, Math.max(CROP_ZOOM.min, Number.isFinite(c.zoom) ? c.zoom : 1))
  const s = coverScale(imgW, imgH, view) * zoom
  const mx = Math.max(0, (imgW * s - view) / 2)
  const my = Math.max(0, (imgH * s - view) / 2)
  const clamp = (v: number, m: number) => Math.min(m, Math.max(-m, Number.isFinite(v) ? v : 0))
  return { zoom, x: clamp(c.x, mx), y: clamp(c.y, my) }
}

/** The square region of the source image (in source px) visible in the viewport. */
export function cropRect(c: CropState, imgW: number, imgH: number, view: number): { sx: number; sy: number; size: number } {
  const k = clampCrop(c, imgW, imgH, view)
  const s = coverScale(imgW, imgH, view) * k.zoom
  const size = view / s
  const sx = imgW / 2 - (view / 2 + k.x) / s
  const sy = imgH / 2 - (view / 2 + k.y) / s
  return { sx: Math.max(0, Math.min(imgW - size, sx)), sy: Math.max(0, Math.min(imgH - size, sy)), size: Math.min(size, imgW, imgH) }
}

/** Approximate decoded byte size of a base64 data URL. */
export function dataUrlBytes(url: string): number {
  const i = url.indexOf(',')
  if (i < 0) return 0
  const b64 = url.length - i - 1
  const pad = url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((b64 * 3) / 4) - pad)
}

/* ---------------- misc ---------------- */

/** A name for a new resume that doesn't collide with existing names: "Untitled resume", "Untitled resume 2" … */
export function uniqueName(base: string, existing: readonly string[]): string {
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()))
  const b = base.trim() || 'Untitled resume'
  if (!taken.has(b.toLowerCase())) return b
  for (let i = 2; i < 1000; i++) if (!taken.has(`${b} ${i}`.toLowerCase())) return `${b} ${i}`
  return `${b} ${Date.now()}`
}
