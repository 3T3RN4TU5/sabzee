/**
 * Corporate — a conservative, boardroom-ready single column built on a fixed left gutter.
 * Dates (and locations) sit right-aligned in the gutter so the eye can run down a career at a
 * glance; titles, employers and achievements share one strong left edge in the body column.
 * Section headings carry an accent bar in the gutter, skills read as a labelled table, and the
 * page has a slim letterhead stripe, a running header on continuation pages and page numbers.
 */
import type { ReactNode } from 'react'
import {
  Bullets,
  ContactList,
  EntryLink,
  MaybeLink,
  PageLayout,
  Photo,
  Rich,
  RichParagraphs,
  contactEntries,
  cx,
  displayName,
  hasPhoto,
  sectionsToBlocks,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './corporate.css'

export const meta: TemplateMeta = {
  id: 'corporate',
  name: 'Corporate',
  description: 'Conservative navy styling with a right-aligned date gutter, crisp sans-serif type and a labelled skills table — at home in finance, consulting and enterprise roles.',
  tags: ['Classic', 'ATS-friendly', 'Photo'],
  order: 60,
  supportsPhoto: true,
  columns: 1,
  defaultFont: 'plex',
  defaultAccent: '#1e3a5f',
  headingCase: 'upper',
  gaps: { entry: 10, section: 15 },
}

/** Gutter + body grid row (the backbone of the layout). */
function Row({ gutter, children, className }: { gutter?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('co-row', className)}>
      <div className="co-gutter">{gutter}</div>
      <div className="co-body">{children}</div>
    </div>
  )
}

const heading = (s: SectionView) => (
  <h2 className="co-h">
    <span className="co-h__bar" aria-hidden="true" />
    <span className="co-h__text">{s.title}</span>
  </h2>
)

/** Date for the gutter; ranges break after the dash ("Jul 2024 –" / "Present") when they must wrap. */
function DateText({ e }: { e: EntryView }) {
  if (!e.date) return null
  if (e.startText && e.endText && e.date === `${e.startText} – ${e.endText}`) {
    return (
      <div className="co-date">
        <span className="co-nw">{e.startText} –</span> <span className="co-nw">{e.endText}</span>
      </div>
    )
  }
  return <div className="co-date">{e.date}</div>
}

function When({ e }: { e: EntryView }) {
  if (!e.date && !e.location) return null
  return (
    <>
      <DateText e={e} />
      {e.location && <div className="co-loc">{e.location}</div>}
    </>
  )
}

/** Experience, education, projects, publications, volunteering, custom. */
function FullEntry({ e }: { e: EntryView }) {
  const lead = e.title || e.subtitle
  const org = e.title ? e.subtitle : ''
  const pub = e.kind === 'publications'
  return (
    <Row gutter={<When e={e} />} className={`co-entry co-entry--${e.kind}`}>
      {(lead || e.url) && (
        <div className="co-head">
          {lead && <div className="co-title">{lead}</div>}
          {e.url && <EntryLink entry={e} className="co-link" />}
        </div>
      )}
      {pub && e.meta && <div className="co-authors">{e.meta}</div>}
      {org && <div className="co-org">{org}</div>}
      {!pub && e.meta && <div className="co-meta">{e.meta}</div>}
      {e.description && <Rich as="div" className="co-desc" text={e.description} />}
      {e.keywords.length > 0 && (
        <div className="co-kw">
          <span className="co-kw__label">Tools</span>
          {e.keywords.join(' · ')}
        </div>
      )}
      <Bullets items={e.bullets} marker="square" className="co-bullets" />
    </Row>
  )
}

/** Certifications and awards: one line "Title — Issuer" with the date in the gutter. */
function CompactEntry({ e }: { e: EntryView }) {
  return (
    <Row gutter={<DateText e={e} />} className={`co-entry co-entry--compact co-entry--${e.kind}`}>
      <div className="co-head">
        <div className="co-compact">
          {e.title && <span className="co-title">{e.title}</span>}
          {e.title && e.subtitle && <span className="co-dash"> — </span>}
          {e.subtitle && <span className="co-issuer">{e.subtitle}</span>}
        </div>
        {e.url && <EntryLink entry={e} className="co-link" />}
      </div>
      {e.description && <Rich as="div" className="co-desc" text={e.description} />}
    </Row>
  )
}

function ReferenceEntry({ e }: { e: EntryView }) {
  return (
    <div className="co-ref">
      {e.title && <div className="co-title">{e.title}</div>}
      {e.subtitle && <div className="co-ref__role">{e.subtitle}</div>}
      {e.meta && <MaybeLink text={e.meta} className="co-ref__contact" />}
      {e.description && <Rich as="div" className="co-ref__note" text={e.description} />}
    </div>
  )
}

function entry(e: EntryView): ReactNode {
  switch (e.kind) {
    case 'certifications':
    case 'awards':
      return <CompactEntry e={e} />
    case 'references':
      return (
        <Row>
          <ReferenceEntry e={e} />
        </Row>
      )
    default:
      return <FullEntry e={e} />
  }
}

/** Skill group as a table row: label in the gutter, skills in the body, level on the right. */
function SkillRow({ e }: { e: EntryView }) {
  return (
    <Row gutter={e.title ? <div className="co-skill__name">{e.title}</div> : null} className="co-skill">
      <div className="co-skill__line">
        <span className="co-skill__list">{e.keywords.join(', ')}</span>
        {e.levelLabel && <span className="co-skill__level">{e.levelLabel}</span>}
      </div>
    </Row>
  )
}

/** Small sections rendered as one block. */
function whole(s: SectionView): ReactNode | undefined {
  if (s.kind === 'skills') {
    return (
      <div className="co-table">
        {s.entries.map((e) => (
          <SkillRow key={e.id} e={e} />
        ))}
      </div>
    )
  }
  if (s.kind === 'languages') {
    return (
      <Row>
        <div className="co-flow">
          {s.entries.map((e) => (
            <span key={e.id} className="co-flow__item">
              <span className="co-flow__name">{e.title}</span>
              {e.levelLabel && <span className="co-flow__detail">{e.levelLabel}</span>}
            </span>
          ))}
        </div>
      </Row>
    )
  }
  if (s.kind === 'interests') {
    return (
      <Row>
        <div className="co-interests">
          {s.entries.map((e, i) => (
            <span key={e.id}>
              {i > 0 && <span className="co-sep"> · </span>}
              <span className="co-interest">{e.title}</span>
              {e.keywords.length > 0 && <span className="co-muted"> ({e.keywords.join(', ')})</span>}
            </span>
          ))}
        </div>
      </Row>
    )
  }
  if (s.kind === 'references' && s.entries.length > 1) {
    return (
      <Row>
        <div className="co-refs">
          {s.entries.map((e) => (
            <ReferenceEntry key={e.id} e={e} />
          ))}
        </div>
      </Row>
    )
  }
  return undefined
}

export default function Corporate({ data, design, main }: TemplateProps) {
  const b = data.basics
  const name = displayName(b)
  const photo = hasPhoto(b, design)

  const header = (
    <header className="co-header">
      <div className="co-header__row">
        <div className="co-ident">
          {photo && <Photo basics={b} size="16mm" className="co-photo" />}
          <div className="co-ident__text">
            <h1 className="co-name">{name}</h1>
            {b.title.trim() && <div className="co-role">{b.title}</div>}
          </div>
        </div>
        {contactEntries(b).length > 0 && <ContactList basics={b} layout="grid" className="co-contact" iconSize="0.95em" />}
      </div>
      <div className="co-rule" aria-hidden="true" />
    </header>
  )

  // one-line certifications/awards sit closer together than full entries
  const compact = new Set(main.filter((s) => s.kind === 'certifications' || s.kind === 'awards').map((s) => s.id))
  const blocks = sectionsToBlocks(main, {
    heading,
    summary: (s) => (
      <Row>
        <RichParagraphs className="co-summary" text={s.content} />
      </Row>
    ),
    entry,
    whole,
  }).map((bl) => (bl.gap === 'entry' && bl.sectionId && compact.has(bl.sectionId) ? { ...bl, gap: 4 } : bl))

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ index, count, header, main }) => (
        <div className="co-page">
          {index > 0 && (
            <div className="co-running">
              <span className="co-running__name">{name}</span>
              {b.title.trim() && <span className="co-running__role">{b.title}</span>}
            </div>
          )}
          {header}
          {main}
          {count > 1 && (
            <div className="co-footer" aria-hidden="true">
              Page {index + 1} of {count}
            </div>
          )}
        </div>
      )}
    />
  )
}
