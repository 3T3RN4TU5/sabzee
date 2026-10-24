import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { Basics } from '../../lib/types.ts'
import { useOptionalDocContext } from './context.ts'
import { ContactIcon } from './icons.tsx'
import { breakChunks, contactEntries, cx, type ContactEntry, type ContactKey } from './utils.ts'

export interface ContactListProps {
  basics: Basics
  /** Show icons (default: design.showIcons). */
  showIcons?: boolean
  /** 'inline' = one wrapping row with separators; 'stack' = one item per line; 'grid' = two columns. */
  layout?: 'inline' | 'stack' | 'grid'
  /** Separator for inline layout without icons (default '·'). Pass null for none. */
  separator?: ReactNode
  /** Which fields, in which order (default email, phone, location, website, linkedin, github). */
  include?: ContactKey[]
  /** Render anchors (default true). */
  links?: boolean
  /** Print long URLs in full instead of shortening them (default false). */
  full?: boolean
  iconSize?: number | string
  /** Icon colour (default currentColor). */
  iconColor?: string
  className?: string
  itemClassName?: string
  style?: CSSProperties
}

/**
 * A contact value for display: long URLs shortened (unless `full`), and emails/URLs given line-break
 * opportunities only after "/", ".", "@", "-" … (see `breakChunks`) so narrow columns never split a word.
 */
export function ContactText({ entry, full = false }: { entry: Pick<ContactEntry, 'key' | 'value' | 'short'>; full?: boolean }) {
  const text = full ? entry.value : entry.short
  if (entry.key === 'phone' || entry.key === 'location') return <>{text}</>
  const chunks = breakChunks(text)
  return (
    <>
      {chunks.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {c}
        </Fragment>
      ))}
    </>
  )
}

/**
 * Contact details with optional lucide icons. Classes: .rf-contact (+ --inline/--stack/--grid),
 * .rf-contact__item, .rf-contact__icon, .rf-contact__sep, .rf-contact__text.
 */
export function ContactList({ basics, showIcons, layout = 'inline', separator = '·', include, links = true, full = false, iconSize = '1em', iconColor, className, itemClassName, style }: ContactListProps) {
  const ctx = useOptionalDocContext()
  const icons = showIcons ?? ctx?.design.showIcons ?? true
  const items = contactEntries(basics, include)
  if (!items.length) return null
  return (
    <div className={cx('rf-contact', `rf-contact--${layout}`, className)} style={style}>
      {items.map((c, i) => {
        const text = links && c.href ? (
          <a className="rf-contact__text rf-link" href={c.href} target="_blank" rel="noopener noreferrer">
            <ContactText entry={c} full={full} />
          </a>
        ) : (
          <span className="rf-contact__text">
            <ContactText entry={c} full={full} />
          </span>
        )
        return (
          <Fragment key={c.key}>
            {layout === 'inline' && i > 0 && !icons && separator !== null && (
              <span className="rf-contact__sep" aria-hidden="true">
                {separator}
              </span>
            )}
            <span className={cx('rf-contact__item', `rf-contact__item--${c.key}`, itemClassName)}>
              {icons && <ContactIcon kind={c.key} size={iconSize} className="rf-contact__icon" style={iconColor ? { color: iconColor } : undefined} />}
              {text}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}
