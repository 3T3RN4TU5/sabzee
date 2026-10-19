/**
 * CSS custom properties set on every `.rf-doc` root. Templates style with these so the design panel
 * (accent, font, size, line height, spacing, margin, heading case) works everywhere.
 */
import type { CSSProperties } from 'react'
import { ensureContrast, readableOn, rgbTriplet, shade, tint } from '../../lib/color.ts'
import type { FontPairing } from '../../lib/fonts.ts'
import type { PaperSize } from '../../lib/templateData.ts'
import type { Design } from '../../lib/types.ts'

export const DEFAULT_GAPS = { entry: 10, section: 18 }

export interface CssVarInput {
  design: Design
  font: FontPairing
  paper: PaperSize
  headingCase: 'upper' | 'normal'
  gaps?: { entry?: number; section?: number }
}

export function docCssVars({ design, font, paper, headingCase, gaps }: CssVarInput): CSSProperties {
  const accent = design.accent
  const onAccent = readableOn(accent)
  const entryGap = (gaps?.entry ?? DEFAULT_GAPS.entry) * design.spacing
  const sectionGap = (gaps?.section ?? DEFAULT_GAPS.section) * design.spacing
  const vars: Record<string, string> = {
    '--rf-accent': accent,
    '--rf-accent-rgb': rgbTriplet(accent),
    '--rf-accent-ink': ensureContrast(accent, '#ffffff', 4.5),
    '--rf-accent-deep': shade(accent, 0.28),
    '--rf-accent-soft': tint(accent, 0.9),
    '--rf-accent-muted': tint(accent, 0.55),
    '--rf-on-accent': onAccent,
    '--rf-on-accent-rgb': rgbTriplet(onAccent),
    '--rf-text': '#1f2937',
    '--rf-heading': '#111827',
    '--rf-muted': '#6b7280',
    '--rf-rule': '#e5e7eb',
    '--rf-font-heading': font.heading,
    '--rf-font-body': font.body,
    '--rf-font-mono': font.mono,
    '--rf-font-size': `${design.fontSize}px`,
    '--rf-line-height': String(design.lineHeight),
    '--rf-spacing': String(design.spacing),
    '--rf-margin': `${design.margin}mm`,
    '--rf-entry-gap': `${entryGap}px`,
    '--rf-section-gap': `${sectionGap}px`,
    '--rf-page-width': `${paper.widthMm}mm`,
    '--rf-page-height': `${paper.heightMm}mm`,
    '--rf-heading-transform': headingCase === 'upper' ? 'uppercase' : 'none',
    '--rf-heading-tracking': headingCase === 'upper' ? '0.09em' : '0',
  }
  return vars as CSSProperties
}
