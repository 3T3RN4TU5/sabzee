/**
 * ATS-Plain — built to be read by machines first and people second. One column, no graphics, no
 * icons, no photo, no tables: real text in reading order, plain disc bullets, contact details as one
 * pipe-separated line and standard section headings (see headings.ts), so applicant tracking
 * systems map every section to the right field. The accent only tints the name and headings.
 */
import { Fragment } from 'react'
import {
  Bullets,
  EntryLink,
  MaybeLink,
  PageLayout,
  Rich,
  RichParagraphs,
  contactEntries,
  displayName,
  sectionsToBlocks,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import { atsHeading } from './headings.ts'
import './ats.css'

export const meta: TemplateMeta = {
  id: 'ats',
  name: 'ATS-Plain',
  description: 'Zero graphics, a single column and standard section headings — clean, predictable text that every applicant tracking system parses correctly.',
  tags: ['ATS-friendly', 'Classic', 'One-page'],
  order: 40,
  supportsPhoto: false,
  columns: 1,
  defaultFont: 'system',
  defaultAccent: '#111827',
  headingCase: 'upper',
  gaps: { entry: 9, section: 15 },
}

const heading = (s: SectionView) => <h2 className="at-h">{atsHeading(s.kind, s.title)}</h2>

/** "Title, Issuer ……… Date" — certifications and awards. */
function CompactEntry({ e }: { e: EntryView }) {
  return (
    <div className="at-entry at-entry--compact">
      <div className="at-line">
        <span className="at-lead">
          {e.title && <span className="at-title">{e.title}</span>}
          {e.title && e.subtitle && <span>, </span>}
          {e.subtitle && <span className="at-org">{e.subtitle}</span>}
        </span>
        {e.date && <span className="at-date">{e.date}</span>}
      </div>
      {e.url && (
        <div className="at-small">
          <EntryLink entry={e} />
        </div>
      )}
      {e.description && <Rich as="div" className="at-desc" text={e.description} />}
    </div>
  )
}

function ReferenceEntry({ e }: { e: EntryView }) {
  return (
    <div className="at-entry">
      {e.title && <div className="at-title">{e.title}</div>}
      {e.subtitle && <div>{e.subtitle}</div>}
      {e.meta && (
        <div>
          <MaybeLink text={e.meta} />
        </div>
      )}
      {e.description && <Rich as="div" className="at-desc" text={e.description} />}
    </div>
  )
}

/** Experience, education, projects, publications, volunteering and custom entries. */
function Entry({ e }: { e: EntryView }) {
  const lead = e.title || e.subtitle
  const org = e.title ? e.subtitle : ''
  const pub = e.kind === 'publications'
  return (
    <div className="at-entry">
      {(lead || e.date) && (
        <div className="at-line">
          <span className="at-title">{lead}</span>
          {e.date && <span className="at-date">{e.date}</span>}
        </div>
      )}
      {pub && e.meta && <div className="at-authors">{e.meta}</div>}
      {(org || e.url || e.location) && (
        <div className="at-line at-line--sub">
          <span className="at-lead">
            {org && <span className="at-org">{org}</span>}
            {org && e.url && <span className="at-sep"> | </span>}
            {e.url && <EntryLink entry={e} />}
          </span>
          {e.location && <span className="at-loc">{e.location}</span>}
        </div>
      )}
      {!pub && e.meta && <div className="at-meta">{e.meta}</div>}
      {e.description && <Rich as="div" className="at-desc" text={e.description} />}
      {e.keywords.length > 0 && (
        <div className="at-kw">
          <span className="at-kw__label">Technologies: </span>
          {e.keywords.join(', ')}
        </div>
      )}
      <Bullets items={e.bullets} marker="none" className="at-bullets" />
    </div>
  )
}

function entry(e: EntryView) {
  if (e.kind === 'certifications' || e.kind === 'awards') return <CompactEntry e={e} />
  if (e.kind === 'references') return <ReferenceEntry e={e} />
  return <Entry e={e} />
}

/** Skills, languages and interests read as plain lines of text (one block per section). */
function whole(s: SectionView) {
  if (s.kind === 'skills') {
    return (
      <div className="at-lines">
        {s.entries.map((e) => (
          <div key={e.id} className="at-skill">
            {e.title && (
              <strong className="at-skill__name">
                {e.title}
                {e.levelLabel && ` (${e.levelLabel})`}
                {e.keywords.length > 0 && ':'}
              </strong>
            )}
            {e.title && e.keywords.length > 0 && ' '}
            {e.keywords.join(', ')}
          </div>
        ))}
      </div>
    )
  }
  if (s.kind === 'languages') {
    const items = s.entries.filter((e) => e.title).map((e) => (e.levelLabel ? `${e.title} (${e.levelLabel})` : e.title))
    return <div className="at-inline">{items.join(', ')}</div>
  }
  if (s.kind === 'interests') {
    const items = s.entries.filter((e) => e.title || e.keywords.length).map((e) => (e.title && e.keywords.length ? `${e.title} (${e.keywords.join(', ')})` : e.title || e.keywords.join(', ')))
    return <div className="at-inline">{items.join(', ')}</div>
  }
  return undefined
}

export default function AtsPlain({ data, main }: TemplateProps) {
  const b = data.basics
  const contacts = contactEntries(b)

  const header = (
    <header className="at-header">
      <h1 className="at-name">{displayName(b)}</h1>
      {b.title.trim() && <div className="at-role">{b.title}</div>}
      {contacts.length > 0 && (
        <div className="at-contact">
          {contacts.map((c, i) => (
            <Fragment key={c.key}>
              {i > 0 && <span className="at-sep"> | </span>}
              {c.href ? (
                <a className="rf-link" href={c.href} target="_blank" rel="noopener noreferrer">
                  {c.value}
                </a>
              ) : (
                <span>{c.value}</span>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </header>
  )

  const blocks = sectionsToBlocks(main, {
    heading,
    summary: (s) => <RichParagraphs className="at-summary" text={s.content} />,
    entry,
    whole,
  })

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ header, main }) => (
        <div className="at-page">
          {header}
          {main}
        </div>
      )}
    />
  )
}
