/** Small colour toolkit for templates (accent tints, readable text on accent backgrounds). */
import { normalizeHex } from './design.ts'

export interface Rgb {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): Rgb {
  const v = normalizeHex(hex)
  return { r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16) }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Linear mix: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  const k = Math.max(0, Math.min(1, t))
  return rgbToHex({ r: x.r + (y.r - x.r) * k, g: x.g + (y.g - x.g) * k, b: x.b + (y.b - x.b) * k })
}

export const tint = (hex: string, t: number) => mix(hex, '#ffffff', t)
export const shade = (hex: string, t: number) => mix(hex, '#000000', t)

/** WCAG relative luminance (0–1). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** White or near-black, whichever reads better on `bg`. */
export function readableOn(bg: string, light = '#ffffff', dark = '#111827'): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark
}

/** Darken a colour until it reaches `min` contrast against white (for accent-coloured text). */
export function ensureContrast(hex: string, against = '#ffffff', min = 4.5): string {
  let c = normalizeHex(hex)
  for (let i = 0; i < 20 && contrastRatio(c, against) < min; i++) c = shade(c, 0.08)
  return c
}

/** "79 70 229" — for `rgb(var(--rf-accent-rgb) / 0.2)`. */
export function rgbTriplet(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return `${r} ${g} ${b}`
}
