/**
 * Startup — friendly, confident and product-minded. A rounded header card (soft accent tint with a
 * couple of playful circles) holds the optional photo, a geometric-sans name, the role as an accent
 * pill and an icon contact row of white chips. Below it, a wide main column (dates as pills, tech
 * stacks as outline tags) sits next to a softly tinted side panel with skill pills, languages,
 * certifications, awards, interests and references.
 */
import type { ReactNode } from 'react'
import {
  Bullets,
  ContactIcon,
  ContactList,
  EntryLink,
  LevelDots,
  MaybeLink,
  PageLayout,
  Photo,
  Rich,
  RichParagraphs,
  contactEntries,
  cx,
  shortUrl,
  displayName,
  hasPhoto,
  sectionsToBlocks,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './startup.css'

export const meta: TemplateMeta = {
  id: 'startup',
  name: 'Startup',
  description: 'Playful but polished: a rounded header card, icon contact chips, accent pills for dates and skills, and a soft side panel — made for product and tech teams.',
  tags: ['Modern', 'Two-column', 'Photo', 'Creative'],
  order: 100,
  supportsPhoto: true,
  columns: 2,
  defaultFont: 'montserrat',
  defaultAccent: '#7c3aed',
  sideKinds: ['skills', 'education', 'languages', 'certifications', 'awards', 'interests', 'references'],
  headingCase: 'normal',
  gaps: { entry: 12, section: 19 },
}

const mainHeading = (s: SectionView) => (
  <h2 className="su-h">
    <span className="su-h__mark" aria-hidden="true" />
    <span className="su-h__text">{s.title}</span>
  </h2>
)

const sideHeading = (s: SectionView) => (
  <h3 className="su-sh">
    <span className="su-h__mark" aria-hidden="true" />
    <span className="su-h__text">{s.title}</span>
  </h3>
)

function Link({ e, icons }: { e: EntryView; icons: boolean }) {
  if (!e.url) return null
  return (
    <EntryLink entry={e} className="su-link">
      {icons && <ContactIcon kind="website" size="0.95em" className="su-link__icon" />}
      <span>{shortUrl(e.url)}</span>
    </EntryLink>
  )
}

function Tags({ items, variant }: { items: string[]; variant: 'solid' | 'outline' }) {
  if (!items.length) return null
  return (
    <div className={cx('su-tags', `su-tags--${variant}`)}>
      {items.map((k) => (
        <span key={k} className="su-tag">
          {k}
        </span>
      ))}
    </div>
  )
}

/** Main-column entry for every dated kind (and references when they land in the main column). */
function MainEntry({ e, icons }: { e: EntryView; icons: boolean }) {
  const lead = e.title || e.subtitle
  const org = e.title ? e.subtitle : ''
  const pub = e.kind === 'publications'
  return (
    <div className={cx('su-entry', `su-entry--${e.kind}`)}>
      <div className="su-entry__top">
        <div className="su-entry__heading">
          {lead && <div className="su-entry__title">{lead}</div>}
          {pub && e.meta && <div className="su-entry__authors">{e.meta}</div>}
          {(org || e.location) && (
            <div className="su-entry__org">
              {org && <span className="su-org">{org}</span>}
              {org && e.location && (
                <span className="su-dot" aria-hidden="true">
                  {' '}
                  •{' '}
                </span>
              )}
              {e.location && <span className="su-loc">{e.location}</span>}
            </div>
          )}
        </div>
        {e.date && <span className="su-date">{e.date}</span>}
      </div>
      {e.url && <Link e={e} icons={icons} />}
      {!pub && e.meta && <div className="su-meta">{e.kind === 'references' ? <MaybeLink text={e.meta} /> : e.meta}</div>}
      {e.description && <Rich as="div" className="su-desc" text={e.description} />}
      <Tags items={e.keywords} variant="outline" />
      <Bullets items={e.bullets} className="su-bullets" />
    </div>
  )
}

/** Compact stacked entry for the side panel (certifications, awards, references, or anything forced there). */
function SideEntry({ e, icons }: { e: EntryView; icons: boolean }) {
  const lead = e.title || e.subtitle
  const org = e.title ? e.subtitle : ''
  const pub = e.kind === 'publications'
  return (
    <div className={cx('su-sentry', `su-sentry--${e.kind}`)}>
      {lead && <div className="su-sentry__title">{lead}</div>}
      {pub && e.meta && <div className="su-sentry__muted su-sentry__authors">{e.meta}</div>}
      {org && <div className="su-sentry__org">{org}</div>}
      {(e.date || e.location) && (
        <div className="su-sentry__when">
          {e.date && <span className="su-sentry__date">{e.date}</span>}
          {e.date && e.location && <span aria-hidden="true"> • </span>}
          {e.location && <span>{e.location}</span>}
        </div>
      )}
      {e.url && <Link e={e} icons={icons} />}
      {!pub && e.meta && <div className="su-sentry__muted">{e.kind === 'references' ? <MaybeLink text={e.meta} /> : e.meta}</div>}
      {e.description && <Rich as="div" className="su-sentry__desc" text={e.description} />}
      <Tags items={e.keywords} variant="outline" />
      <Bullets items={e.bullets} className="su-bullets" />
    </div>
  )
}

/** Skill group: name + level dots, then the skills as pills. */
function Skill({ e }: { e: EntryView }) {
  return (
    <div className="su-skill">
      {(e.title || e.level > 0) && (
        <div className="su-skill__top">
          <span className="su-skill__name">{e.title}</span>
          <LevelDots level={e.level} label={e.levelLabel} size="0.46em" gap="0.2em" className="su-skill__dots" />
        </div>
      )}
      <Tags items={e.keywords} variant="solid" />
    </div>
  )
}

function Languages({ s }: { s: SectionView }) {
  return (
    <div className="su-langs">
      {s.entries.map((e) => (
        <div key={e.id} className="su-lang">
          <div className="su-lang__text">
            <span className="su-lang__name">{e.title}</span>
            {e.levelLabel && <span className="su-lang__level">{e.levelLabel}</span>}
          </div>
          <LevelDots level={e.level} label={e.levelLabel} size="0.5em" gap="0.22em" className="su-lang__dots" />
        </div>
      ))}
    </div>
  )
}

function Interests({ s }: { s: SectionView }) {
  const items = s.entries.map((e) => (e.title && e.keywords.length ? `${e.title} · ${e.keywords.join(', ')}` : e.title || e.keywords.join(', '))).filter(Boolean)
  return <Tags items={items} variant="outline" />
}

function wholeSection(s: SectionView): ReactNode | undefined {
  if (s.kind === 'languages') return <Languages s={s} />
  if (s.kind === 'interests') return <Interests s={s} />
  return undefined
}

export default function Startup({ data, design, main, side, isLetter }: TemplateProps) {
  const b = data.basics
  const icons = design.showIcons
  const photo = hasPhoto(b, design)

  const header = (
    <header className={cx('su-header', photo && 'su-header--photo')}>
      <span className="su-blob su-blob--a" aria-hidden="true" />
      <span className="su-blob su-blob--b" aria-hidden="true" />
      {photo && <Photo basics={b} size="26mm" className="su-photo" />}
      <div className="su-ident">
        <h1 className="su-name">{displayName(b)}</h1>
        {b.title.trim() && <div className="su-role">{b.title}</div>}
        {contactEntries(b).length > 0 && <ContactList basics={b} layout="inline" separator={null} className="su-contact" itemClassName="su-chip" iconSize="0.95em" />}
      </div>
    </header>
  )

  const mainBlocks = sectionsToBlocks(main, {
    heading: mainHeading,
    summary: (s) => <RichParagraphs className="su-summary" text={s.content} />,
    entry: (e) => (e.kind === 'skills' ? <Skill e={e} /> : <MainEntry e={e} icons={icons} />),
    whole: wholeSection,
  })

  // In cover-letter mode no side block survives, so the letter gets the full width.
  const sideBlocks = isLetter
    ? []
    : sectionsToBlocks(side, {
        heading: sideHeading,
        summary: (s) => <RichParagraphs className="su-side-summary" text={s.content} />,
        entry: (e) => (e.kind === 'skills' ? <Skill e={e} /> : <SideEntry e={e} icons={icons} />),
        whole: wholeSection,
      })
  const twoCol = sideBlocks.length > 0

  return (
    <PageLayout
      header={header}
      main={mainBlocks}
      side={sideBlocks}
      page={({ index, header, main, side }) => (
        <div className="su-page">
          {index > 0 && (
            <div className="su-cont">
              <span className="su-cont__name">{displayName(b)}</span>
              <span className="su-cont__page">{index + 1}</span>
            </div>
          )}
          {header}
          <div className={cx('su-cols', !twoCol && 'su-cols--single')}>
            <div className="su-main">{main}</div>
            {twoCol && <aside className="su-side">{side}</aside>}
          </div>
        </div>
      )}
    />
  )
}
