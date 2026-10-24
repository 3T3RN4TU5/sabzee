import type { CSSProperties } from 'react'
import { initials } from '../../lib/templateData.ts'
import type { Basics, Design, PhotoShape } from '../../lib/types.ts'
import { useOptionalDocContext } from './context.ts'
import { cx, PHOTO_RADIUS } from './utils.ts'

export interface PhotoProps {
  basics: Basics
  /** Defaults to the document design. */
  design?: Pick<Design, 'showPhoto' | 'photoShape'>
  /** CSS size (e.g. '30mm', 96, '7em'). */
  size: number | string
  /** Override design.photoShape. */
  shape?: PhotoShape
  /** Render an initials disc when there is no photo (default false → render nothing). */
  placeholder?: boolean
  className?: string
  style?: CSSProperties
}

/** Profile photo honouring design.showPhoto / photoShape. Returns null when hidden or missing. */
export function Photo({ basics, design, size, shape, placeholder = false, className, style }: PhotoProps) {
  const ctx = useOptionalDocContext()
  const d = design ?? ctx?.design
  if (!d?.showPhoto) return null
  const radius = PHOTO_RADIUS[shape ?? d.photoShape] ?? '50%'
  const box: CSSProperties = { width: size, height: size, borderRadius: radius, flex: 'none', display: 'block', ...style }
  if (!basics.photo) {
    if (!placeholder) return null
    return (
      <div className={cx('rf-photo rf-photo--placeholder', className)} style={{ ...box, display: 'grid', placeItems: 'center', background: 'var(--rf-accent-soft)', color: 'var(--rf-accent-ink)', fontWeight: 700 }} aria-hidden="true">
        <span style={{ fontSize: `calc(${typeof size === 'number' ? `${size}px` : size} * 0.36)` }}>{initials(basics.name)}</span>
      </div>
    )
  }
  return <img className={cx('rf-photo', className)} src={basics.photo} alt={basics.name ? `Photo of ${basics.name}` : 'Profile photo'} style={{ ...box, objectFit: 'cover' }} />
}
