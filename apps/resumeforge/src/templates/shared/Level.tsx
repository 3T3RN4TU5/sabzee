import type { CSSProperties } from 'react'
import { cx } from './utils.ts'

export interface LevelProps {
  /** 0–max; 0 renders nothing. */
  level: number
  max?: number
  /** Filled colour (default var(--rf-level-on, var(--rf-accent)) — set --rf-level-on on a container to recolour). */
  color?: string
  /** Empty colour (default var(--rf-level-off, translucent accent)). */
  trackColor?: string
  className?: string
  style?: CSSProperties
  /** Accessible label, e.g. "Advanced". */
  label?: string
}

/** ●●●●○ proficiency dots. Classes: .rf-level-dots, .rf-level-dot (.is-on). */
export function LevelDots({ level, max = 5, color = 'var(--rf-level-on, var(--rf-accent))', trackColor = 'var(--rf-level-off, rgb(var(--rf-accent-rgb) / 0.2))', size = '0.6em', gap = '0.3em', className, style, label }: LevelProps & { size?: string; gap?: string }) {
  if (!level) return null
  return (
    <span className={cx('rf-level-dots', className)} style={{ display: 'inline-flex', gap, alignItems: 'center', ...style }} role="img" aria-label={label ?? `${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cx('rf-level-dot', i < level && 'is-on')} style={{ width: size, height: size, borderRadius: '50%', background: i < level ? color : trackColor, display: 'block' }} />
      ))}
    </span>
  )
}

/** Horizontal bar. Classes: .rf-level-bar, .rf-level-bar__fill. */
export function LevelBar({ level, max = 5, color = 'var(--rf-level-on, var(--rf-accent))', trackColor = 'var(--rf-level-off, rgb(var(--rf-accent-rgb) / 0.18))', height = '0.32em', radius = '999px', className, style, label }: LevelProps & { height?: string; radius?: string }) {
  if (!level) return null
  return (
    <span className={cx('rf-level-bar', className)} style={{ display: 'block', height, borderRadius: radius, background: trackColor, overflow: 'hidden', ...style }} role="img" aria-label={label ?? `${level} of ${max}`}>
      <span className="rf-level-bar__fill" style={{ display: 'block', height: '100%', width: `${(Math.min(level, max) / max) * 100}%`, background: color, borderRadius: radius }} />
    </span>
  )
}

/** Segmented bar (5 blocks). Classes: .rf-level-segments, .rf-level-segment (.is-on). */
export function LevelSegments({ level, max = 5, color = 'var(--rf-level-on, var(--rf-accent))', trackColor = 'var(--rf-level-off, rgb(var(--rf-accent-rgb) / 0.18))', height = '0.32em', gap = '0.2em', className, style, label }: LevelProps & { height?: string; gap?: string }) {
  if (!level) return null
  return (
    <span className={cx('rf-level-segments', className)} style={{ display: 'flex', gap, ...style }} role="img" aria-label={label ?? `${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cx('rf-level-segment', i < level && 'is-on')} style={{ flex: 1, height, borderRadius: '1px', background: i < level ? color : trackColor }} />
      ))}
    </span>
  )
}
