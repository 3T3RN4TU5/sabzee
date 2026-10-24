/**
 * Contact icons. Lucide v1 dropped brand marks, so LinkedIn/GitHub are inlined (Simple Icons, CC0).
 * All icons size to `1em` by default and use currentColor.
 */
import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ContactKey } from './utils.ts'

interface IconProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  /** Stroke width for outline icons (brand icons are filled). */
  strokeWidth?: number
}

export function LinkedinIcon({ size = '1em', className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

export function GithubIcon({ size = '1em', className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  )
}

/** The icon for a contact field. */
export function ContactIcon({ kind, size = '1em', className, style, strokeWidth = 2 }: IconProps & { kind: ContactKey }) {
  switch (kind) {
    case 'email':
      return <Mail size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />
    case 'phone':
      return <Phone size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />
    case 'location':
      return <MapPin size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />
    case 'website':
      return <Globe size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />
    case 'linkedin':
      return <LinkedinIcon size={size} className={className} style={style} />
    case 'github':
      return <GithubIcon size={size} className={className} style={style} />
  }
}
