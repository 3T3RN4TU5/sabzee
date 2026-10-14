// Chart tokens shared by every page (mirrors the CSS custom properties in index.css).
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'] as const

export const C = {
  grid: '#1e293b',
  axis: '#334155',
  ink: '#94a3b8',
  muted: '#64748b',
  surface: '#0f172a',
  text: '#e2e8f0',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
} as const

/** Sequential blue ramp (light -> dark on a light surface; on our dark surface
 * the *brighter* end means more, so callers index from dark to bright). */
export const BLUE_RAMP = ['#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4', '#b7d3f6'] as const

/** Map t in [0, 1] onto the ramp (0 -> darkest, 1 -> brightest). */
export function rampColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  return BLUE_RAMP[Math.round(clamped * (BLUE_RAMP.length - 1))]
}

/** Fixed colour per named segment so a filter never repaints survivors. */
export const SEGMENT_COLOR: Record<string, string> = {
  Champions: SERIES[0],
  Loyal: SERIES[2],
  'New & Promising': SERIES[3],
  'At Risk': SERIES[1],
  Occasional: SERIES[6],
  Dormant: '#64748b',
}

export const axisProps = {
  stroke: C.axis,
  tick: { fill: C.ink, fontSize: 11 },
  tickLine: false,
} as const
