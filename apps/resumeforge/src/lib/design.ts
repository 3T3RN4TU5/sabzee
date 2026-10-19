import type { DateFormat, Design, TemplateId } from './types.ts'

export const ACCENT_PRESETS = [
  '#4f46e5', // indigo
  '#2563eb', // blue
  '#0f766e', // teal
  '#15803d', // green
  '#b45309', // amber
  '#c2410c', // orange
  '#be123c', // rose
  '#7c3aed', // violet
  '#1e3a5f', // navy
  '#334155', // slate
  '#111827', // ink
]

export const DATE_FORMATS: { id: DateFormat; label: string }[] = [
  { id: 'MMM YYYY', label: 'Jul 2024' },
  { id: 'MMMM YYYY', label: 'July 2024' },
  { id: 'MM/YYYY', label: '07/2024' },
  { id: 'YYYY', label: '2024' },
]

export const DESIGN_LIMITS = {
  fontSize: { min: 11, max: 15, step: 0.5 },
  lineHeight: { min: 1.2, max: 1.8, step: 0.05 },
  spacing: { min: 0.6, max: 1.6, step: 0.05 },
  margin: { min: 8, max: 25, step: 1 },
}

export const defaultDesign: Design = {
  template: 'modern',
  accent: '#4f46e5',
  font: 'auto',
  fontSize: 13,
  lineHeight: 1.45,
  spacing: 1,
  margin: 14,
  headingCase: 'auto',
  dateFormat: 'MMM YYYY',
  paper: 'a4',
  showPhoto: true,
  photoShape: 'circle',
  showIcons: true,
}

export const PAPER = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297, css: 'A4' },
  letter: { label: 'US Letter', widthMm: 215.9, heightMm: 279.4, css: 'letter' },
} as const

export const MM_TO_PX = 96 / 25.4

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(s: string): boolean {
  return HEX.test(s.trim())
}

export function normalizeHex(s: string): string {
  const v = s.trim().toLowerCase()
  if (!HEX.test(v)) return '#4f46e5'
  return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v
}

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback
  return Math.min(max, Math.max(min, v))
}

const TEMPLATE_IDS: TemplateId[] = ['modern', 'classic', 'minimal', 'executive', 'creative', 'tech', 'elegant', 'compact', 'timeline', 'academic', 'corporate', 'startup', 'ats']

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === 'string' && (TEMPLATE_IDS as string[]).includes(v)
}

/** Coerce anything (old exports, share links, JSON imports) into a valid Design. */
export function normalizeDesign(input: unknown): Design {
  const d = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof Design, unknown>>
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback)
  return {
    template: isTemplateId(d.template) ? d.template : defaultDesign.template,
    accent: typeof d.accent === 'string' && isHexColor(d.accent) ? normalizeHex(d.accent) : defaultDesign.accent,
    font: pick(d.font, ['auto', 'inter', 'merriweather', 'playfair', 'garamond', 'poppins', 'plex', 'montserrat', 'raleway', 'system', 'georgia'] as const, 'auto'),
    fontSize: clamp(d.fontSize, DESIGN_LIMITS.fontSize.min, DESIGN_LIMITS.fontSize.max, defaultDesign.fontSize),
    lineHeight: clamp(d.lineHeight, DESIGN_LIMITS.lineHeight.min, DESIGN_LIMITS.lineHeight.max, defaultDesign.lineHeight),
    spacing: clamp(d.spacing, DESIGN_LIMITS.spacing.min, DESIGN_LIMITS.spacing.max, defaultDesign.spacing),
    margin: clamp(d.margin, DESIGN_LIMITS.margin.min, DESIGN_LIMITS.margin.max, defaultDesign.margin),
    headingCase: pick(d.headingCase, ['auto', 'upper', 'normal'] as const, 'auto'),
    dateFormat: pick(d.dateFormat, ['MMM YYYY', 'MMMM YYYY', 'MM/YYYY', 'YYYY'] as const, 'MMM YYYY'),
    paper: pick(d.paper, ['a4', 'letter'] as const, 'a4'),
    showPhoto: typeof d.showPhoto === 'boolean' ? d.showPhoto : defaultDesign.showPhoto,
    photoShape: pick(d.photoShape, ['circle', 'rounded', 'square'] as const, 'circle'),
    showIcons: typeof d.showIcons === 'boolean' ? d.showIcons : defaultDesign.showIcons,
  }
}
