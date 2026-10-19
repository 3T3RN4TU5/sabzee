/**
 * Entry-level building blocks. `DefaultEntry` renders any of the 13 section kinds with a stable BEM
 * structure (classes below) and sensible base styles from base.css (all wrapped in :where(), so a
 * template's `.rf-t-<id> .rf-entry__title { … }` always wins). Use it as-is, restyle it with CSS, or
 * write per-kind renderers and fall back to it for the kinds you do not customise.
 *
 *   .rf-entry .rf-entry--<kind> .rf-entry--main|--side
 *     .rf-entry__head
 *       .rf-entry__heading  > .rf-entry__title, .rf-entry__sub (> .rf-entry__subtitle, .rf-entry__location)
 *       .rf-entry__aside    > .rf-entry__date, .rf-entry__link
 *     .rf-entry__meta  (.rf-entry__meta-label)
 *     .rf-entry__desc  (rich text)
 *     .rf-entry__keywords (Keywords)
 *     .rf-bullets > li (rich text)
 *   skills:    .rf-skill  > .rf-skill__name, .rf-skill__level, .rf-skill__keywords
 *   languages: .rf-lang   > .rf-lang__name, .rf-lang__level
 *   interests: .rf-interest > .rf-interest__name, .rf-interest__details
 */
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { sanitizeUrl } from '../../lib/markdown.ts'
import type { EntryView } from '../../lib/templateData.ts'
import { LevelBar, LevelDots } from './Level.tsx'
import { Rich } from './Rich.tsx'
import { cx } from './utils.ts'

/* ---------------- Bullets ---------------- */

export interface BulletsProps {
  items: string[]
  /** 'disc' (default, accent dot), 'dash', 'square', 'arrow', 'none'. Markers are drawn with CSS (::before). */
  marker?: 'disc' | 'dash' | 'square' | 'arrow' | 'none'
  className?: string
  style?: CSSProperties
}

/** Achievement bullets with inline markdown. Classes: .rf-bullets .rf-bullets--<marker> > li. */
export function Bullets({ items, marker = 'disc', className, style }: BulletsProps) {
  if (!items.length) return null
  return (
    <ul className={cx('rf-bullets', `rf-bullets--${marker}`, className)} style={style}>
      {items.map((b, i) => (
        <li key={i}>
          <Rich text={b} />
        </li>
      ))}
    </ul>
  )
}

/* ---------------- Keywords ---------------- */

export interface KeywordsProps {
  items: string[]
  /** 'chips' = pills, 'inline' = joined with `separator`, 'comma' = "a, b, c". */
  variant?: 'chips' | 'inline' | 'comma'
  separator?: string
  /** Optional label before the list ("Tech:"). */
  label?: ReactNode
  className?: string
  chipClassName?: string
  style?: CSSProperties
}

/** Classes: .rf-keywords .rf-keywords--<variant>, .rf-chip, .rf-keywords__label, .rf-keywords__sep. */
export function Keywords({ items, variant = 'inline', separator = ' · ', label, className, chipClassName, style }: KeywordsProps) {
  if (!items.length) return null
  return (
    <div className={cx('rf-keywords', `rf-keywords--${variant}`, className)} style={style}>
      {label && <span className="rf-keywords__label">{label} </span>}
      {variant === 'chips'
        ? items.map((k) => (
            <span key={k} className={cx('rf-chip', chipClassName)}>
              {k}
            </span>
          ))
        : items.map((k, i) => (
            <Fragment key={k}>
              {i > 0 && <span className="rf-keywords__sep">{variant === 'comma' ? ', ' : separator}</span>}
              <span>{k}</span>
            </Fragment>
          ))}
    </div>
  )
}

/* ---------------- Links ---------------- */

/** Pretty link for an entry (`entry.url` text, `entry.href` target). Class: .rf-entry__link .rf-link. */
export function EntryLink({ entry, className, children }: { entry: Pick<EntryView, 'url' | 'href'>; className?: string; children?: ReactNode }) {
  if (!entry.url) return null
  if (!entry.href) return <span className={cx('rf-entry__link', className)}>{children ?? entry.url}</span>
  return (
    <a className={cx('rf-entry__link rf-link', className)} href={entry.href} target="_blank" rel="noopener noreferrer">
      {children ?? entry.url}
    </a>
  )
}

/** Text that becomes a link when it is a URL or an email (reference contacts). */
export function MaybeLink({ text, className }: { text: string; className?: string }) {
  const href = /^[^\s]+$/.test(text) ? sanitizeUrl(text) : null
  return href ? (
    <a className={cx('rf-link', className)} href={href} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  ) : (
    <span className={className}>{text}</span>
  )
}

/* ---------------- DefaultEntry ---------------- */

export interface DefaultEntryProps {
  entry: EntryView
  /** 'main' puts dates on the right; 'side' stacks everything for narrow columns. */
  variant?: 'main' | 'side'
  /** Level visual for skills/languages: 'bar' | 'dots' | 'text' | 'none' (default: side → bar/dots, main → text). */
  level?: 'bar' | 'dots' | 'text' | 'none'
  /** Keywords style for projects/custom (default 'inline'). */
  keywords?: KeywordsProps['variant']
  marker?: BulletsProps['marker']
  className?: string
  style?: CSSProperties
}

export function DefaultEntry({ entry: e, variant = 'main', level, keywords = 'inline', marker = 'disc', className, style }: DefaultEntryProps) {
  const root = cx('rf-entry', `rf-entry--${e.kind}`, `rf-entry--${variant}`, className)

  if (e.kind === 'skills') {
    const lv = level ?? (variant === 'side' ? 'bar' : 'text')
    if (variant === 'main') {
      return (
        <div className={cx(root, 'rf-skill')} style={style}>
          {e.title && (
            <span className="rf-skill__name">
              {e.title}
              {lv === 'text' && e.levelLabel && <span className="rf-skill__level"> ({e.levelLabel})</span>}
              {e.keywords.length > 0 && ': '}
            </span>
          )}
          {e.keywords.length > 0 && <span className="rf-skill__keywords">{e.keywords.join(', ')}</span>}
          {lv === 'bar' && <LevelBar level={e.level} label={e.levelLabel} className="rf-skill__bar" />}
          {lv === 'dots' && <LevelDots level={e.level} label={e.levelLabel} className="rf-skill__dots" />}
        </div>
      )
    }
    return (
      <div className={cx(root, 'rf-skill')} style={style}>
        {e.title && (
          <div className="rf-skill__name">
            {e.title}
            {lv === 'text' && e.levelLabel && <span className="rf-skill__level"> · {e.levelLabel}</span>}
          </div>
        )}
        {lv === 'bar' && <LevelBar level={e.level} label={e.levelLabel} className="rf-skill__bar" />}
        {lv === 'dots' && <LevelDots level={e.level} label={e.levelLabel} className="rf-skill__dots" />}
        {e.keywords.length > 0 && <div className="rf-skill__keywords">{e.keywords.join(', ')}</div>}
      </div>
    )
  }

  if (e.kind === 'languages') {
    const lv = level ?? (variant === 'side' ? 'dots' : 'text')
    return (
      <div className={cx(root, 'rf-lang')} style={style}>
        <span className="rf-lang__name">{e.title}</span>
        {lv === 'text' && e.levelLabel && <span className="rf-lang__level">{e.levelLabel}</span>}
        {lv === 'dots' && <LevelDots level={e.level} label={e.levelLabel} className="rf-lang__level" />}
        {lv === 'bar' && <LevelBar level={e.level} label={e.levelLabel} className="rf-lang__level" />}
      </div>
    )
  }

  if (e.kind === 'interests') {
    return (
      <div className={cx(root, 'rf-interest')} style={style}>
        <span className="rf-interest__name">{e.title}</span>
        {e.keywords.length > 0 && <span className="rf-interest__details">{e.keywords.join(', ')}</span>}
      </div>
    )
  }

  const side = variant === 'side'
  const subtitle = e.subtitle && <span className="rf-entry__subtitle">{e.subtitle}</span>
  const location = e.location && <span className="rf-entry__location">{e.location}</span>
  const metaIsContact = e.kind === 'references'
  // publications read "Title / Authors / Venue"; everything else shows meta (grade, contact) after the head
  const metaFirst = e.kind === 'publications'
  const meta = e.meta && <div className="rf-entry__meta">{metaIsContact ? <MaybeLink text={e.meta} /> : e.meta}</div>
  return (
    <div className={root} style={style}>
      <div className="rf-entry__head">
        <div className="rf-entry__heading">
          {e.title && <div className="rf-entry__title">{e.title}</div>}
          {metaFirst && meta}
          {(e.subtitle || (!side && e.location)) && (
            <div className="rf-entry__sub">
              {subtitle}
              {!side && e.subtitle && e.location && <span className="rf-entry__dot"> · </span>}
              {!side && location}
            </div>
          )}
        </div>
        {!side && (e.date || e.url) && (
          <div className="rf-entry__aside">
            {e.date && <div className="rf-entry__date">{e.date}</div>}
            {e.url && <EntryLink entry={e} />}
          </div>
        )}
      </div>
      {side && (e.date || e.location || e.url) && (
        <div className="rf-entry__when">
          {e.date && <span className="rf-entry__date">{e.date}</span>}
          {e.date && e.location && <span className="rf-entry__dot"> · </span>}
          {location}
          {e.url && (
            <div>
              <EntryLink entry={e} />
            </div>
          )}
        </div>
      )}
      {!metaFirst && meta}
      {e.description && <Rich as="div" className="rf-entry__desc" text={e.description} />}
      {e.keywords.length > 0 && <Keywords className="rf-entry__keywords" items={e.keywords} variant={keywords} />}
      <Bullets items={e.bullets} marker={marker} />
    </div>
  )
}
