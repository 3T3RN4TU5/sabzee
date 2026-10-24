/**
 * Executive — senior-leadership layout. A full-bleed accent band carries the name (large serif),
 * the title (letter-spaced caps), an optional photo and — divided by a fine vertical rule — the
 * contact details. Sections open with strong accent rules; experience entries are set with a firm
 * title line and the organisation in the accent; competencies sit in a two-column grid; later pages
 * get a slim continuation band with the name.
 */
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { ensureContrast } from '../../lib/color.ts'
import {
  Bullets,
  ContactList,
  DefaultEntry,
  EntryLink,
  Keywords,
  MaybeLink,
  PageLayout,
  Photo,
  Rich,
  RichParagraphs,
  contactEntries,
  contactGridFits,
  cx,
  displayName,
  hasPhoto,
  sectionsToBlocks,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './executive.css'

export const meta: TemplateMeta = {
  id: 'executive',
  name: 'Executive',
  description: 'Commanding full-width colour band with name, title and contacts, strong section rules and a refined serif pairing for senior and leadership roles.',
  tags: ['Classic', 'Photo'],
  order: 50,
  supportsPhoto: true,
  columns: 1,
  defaultFont: 'playfair',
  defaultAccent: '#1e3a5f',
  headingCase: 'upper',
  gaps: { entry: 10, section: 14 },
}

/** Certifications / awards: one line "Title · Issuer ……… Date" + optional link/description. */
function CompactEntry({ e }: { e: EntryView }) {
  return (
    <div className={cx('ex-compact', `ex-compact--${e.kind}`)}>
      <div className="ex-line">
        <div className="ex-line__l">
          {e.title && <span className="ex-compact__title">{e.title}</span>}
          {e.title && e.subtitle && <span className="ex-sep"> · </span>}
          {e.subtitle && <span className="ex-compact__by">{e.subtitle}</span>}
        </div>
        {e.date && <div className="ex-line__r ex-date">{e.date}</div>}
      </div>
      {e.url && <EntryLink entry={e} className="ex-compact__link" />}
      {e.description && <Rich as="div" className="ex-desc" text={e.description} />}
    </div>
  )
}

/** Publications: "Title ……… Date" / "Authors · Venue" (venue italic) / link. */
function Publication({ e }: { e: EntryView }) {
  return (
    <div className="ex-pub">
      <div className="ex-line">
        <div className="ex-line__l">{e.title && <span className="ex-pub__title">{e.title}</span>}</div>
        {e.date && <div className="ex-line__r ex-date">{e.date}</div>}
      </div>
      {(e.meta || e.subtitle || e.url) && (
        <div className="ex-pub__by">
          {e.meta && <span className="ex-pub__authors">{e.meta}</span>}
          {e.meta && e.subtitle && <span className="ex-sep"> · </span>}
          {e.subtitle && <span className="ex-pub__venue">{e.subtitle}</span>}
          {(e.meta || e.subtitle) && e.url && <span className="ex-sep"> · </span>}
          {e.url && <EntryLink entry={e} />}
        </div>
      )}
      {e.description && <Rich as="div" className="ex-desc" text={e.description} />}
    </div>
  )
}

/**
 * Experience, education, projects, volunteering, custom:
 *   Title ……………………………………… Date (or link)
 *   Organisation · Location · Grade …… link (when there is a date)
 */
function MainEntry({ e }: { e: EntryView }) {
  const link = e.url ? <EntryLink entry={e} className="ex-link" /> : null
  const right = e.date ? <span className="ex-date">{e.date}</span> : link
  const lowLink = e.date ? link : null
  // no title (e.g. "Company Only"): the organisation moves up to the title line, beside the date
  const title = e.title || e.subtitle
  const promoted = !e.title && !!e.subtitle
  const org = [
    !promoted && e.subtitle && <span key="sub" className="ex-org">{e.subtitle}</span>,
    e.location && <span key="loc" className="ex-loc">{e.location}</span>,
    e.meta && <span key="meta" className="ex-meta">{e.meta}</span>,
  ].filter(Boolean)
  return (
    <div className={cx('ex-entry', `ex-entry--${e.kind}`)}>
      {(title || right) && (
        <div className="ex-line">
          <div className="ex-line__l">{title && <span className="ex-title">{title}</span>}</div>
          {right && <div className="ex-line__r">{right}</div>}
        </div>
      )}
      {(org.length > 0 || lowLink) && (
        <div className="ex-line ex-line--2">
          <div className="ex-line__l">
            {org.map((node, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="ex-sep"> · </span>}
                {node}
              </Fragment>
            ))}
          </div>
          {lowLink && <div className="ex-line__r ex-line__r--link">{lowLink}</div>}
        </div>
      )}
      {e.description && <Rich as="div" className="ex-desc" text={e.description} />}
      {e.keywords.length > 0 && <Keywords className="ex-keywords" items={e.keywords} />}
      <Bullets items={e.bullets} marker="square" className="ex-bullets" />
    </div>
  )
}

function ExecEntry({ e }: { e: EntryView }) {
  switch (e.kind) {
    case 'certifications':
    case 'awards':
      return <CompactEntry e={e} />
    case 'publications':
      return <Publication e={e} />
    case 'skills':
    case 'languages':
    case 'interests':
      // only reached when a section is chunked or forced here; the generic renderer handles them
      return <DefaultEntry entry={e} variant="main" className="ex-generic" />
    default:
      return <MainEntry e={e} />
  }
}

/** Core competencies: two-column grid of skill groups with a quiet level label. */
function Competencies({ entries }: { entries: EntryView[] }) {
  return (
    <div className="ex-comp">
      {entries.map((e) => (
        <div key={e.id} className="ex-comp__cell">
          {(e.title || e.levelLabel) && (
            <div className="ex-comp__head">
              {e.title && <span className="ex-comp__name">{e.title}</span>}
              {e.levelLabel && <span className="ex-comp__level">{e.levelLabel}</span>}
            </div>
          )}
          {e.keywords.length > 0 && <div className="ex-comp__list">{e.keywords.join(' · ')}</div>}
        </div>
      ))}
    </div>
  )
}

function Languages({ entries }: { entries: EntryView[] }) {
  return (
    <div className="ex-langs">
      {entries.map((e) => (
        <div key={e.id} className="ex-lang">
          <div className="ex-lang__name">{e.title}</div>
          {e.levelLabel && <div className="ex-lang__level">{e.levelLabel}</div>}
        </div>
      ))}
    </div>
  )
}

function Interests({ entries }: { entries: EntryView[] }) {
  const items = entries.filter((e) => e.title || e.keywords.length)
  return (
    <div className="ex-inline">
      {items.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 && <span className="ex-inline__sep">{' · '}</span>}
          <span>
            {e.title || e.keywords.join(', ')}
            {e.title && e.keywords.length > 0 && <span className="ex-inline__detail">{` (${e.keywords.join(', ')})`}</span>}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

function References({ entries }: { entries: EntryView[] }) {
  return (
    <div className="ex-refs">
      {entries.map((e) => (
        <div key={e.id} className="ex-ref">
          {e.title && <div className="ex-ref__name">{e.title}</div>}
          {e.subtitle && <div className="ex-ref__role">{e.subtitle}</div>}
          {e.meta && <MaybeLink className="ex-ref__contact" text={e.meta} />}
          {e.description && <Rich as="div" className="ex-ref__note" text={e.description} />}
        </div>
      ))}
    </div>
  )
}

/** Up to this many skill groups render as one grid block; longer lists paginate in rows of two. */
const COMP_CHUNK = 8

function whole(s: SectionView): ReactNode | undefined {
  switch (s.kind) {
    case 'skills':
      return s.entries.length <= COMP_CHUNK ? <Competencies entries={s.entries} /> : undefined
    case 'languages':
      return <Languages entries={s.entries} />
    case 'interests':
      return <Interests entries={s.entries} />
    case 'references':
      return <References entries={s.entries} />
    default:
      return undefined
  }
}

export default function Executive({ data, design, main, headingCase }: TemplateProps) {
  const b = data.basics
  const name = displayName(b)
  const title = b.title.trim()
  const photo = hasPhoto(b, design)
  const contacts = contactEntries(b)
  // long emails/URLs don't fit the two-column block at the right: put them in a row under the title instead
  const contactsBelow = contacts.length > 0 && !contactGridFits(contacts)
  const hasContact = contacts.length > 0 && !contactsBelow
  // rules, bullets and bars: the accent, deepened just enough to stay visible (3:1) on white
  const frame = { '--ex-mark': ensureContrast(design.accent, '#ffffff', 3) } as CSSProperties

  const header = (
    <header className={cx('ex-band', photo && 'ex-band--photo', hasContact && 'ex-band--contact')}>
      {photo && <Photo basics={b} size="19mm" className="ex-photo" />}
      <div className="ex-id">
        <h1 className="ex-name">{name}</h1>
        {title && <div className="ex-role">{title}</div>}
        {contactsBelow && <ContactList basics={b} layout="inline" className="ex-contact ex-contact--below" iconSize="0.95em" />}
      </div>
      {hasContact && (
        <div className="ex-reach">
          <ContactList basics={b} layout="grid" className="ex-contact" iconSize="0.95em" />
        </div>
      )}
    </header>
  )

  const heading = (s: SectionView) => (
    <h2 className={cx('ex-h', headingCase === 'normal' && 'ex-h--normal')}>
      <span className="ex-h__text">{s.title}</span>
    </h2>
  )

  const renderers = {
    heading,
    summary: (s: SectionView) => <RichParagraphs className="ex-summary" text={s.content} />,
    entry: (e: EntryView) => <ExecEntry e={e} />,
    whole,
  }

  const blocks: Block[] = main.flatMap((s) => {
    if (s.kind !== 'skills' || s.entries.length <= COMP_CHUNK) return sectionsToBlocks([s], renderers)
    // long competency lists paginate in rows of two cells
    const out: Block[] = []
    for (let i = 0; i < s.entries.length; i += 2) {
      const cells = s.entries.slice(i, i + 2)
      out.push({ key: `${s.id}:${cells[0].id}`, sectionId: s.id, entryId: cells[0].id, gap: i + 2 >= s.entries.length ? 'section' : 5, node: <>{i === 0 && heading(s)}<Competencies entries={cells} /></> })
    }
    return out
  })

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ index, header, main }) => (
        <div className="ex-page" style={frame}>
          {index === 0 ? (
            header
          ) : (
            <div className="ex-cont" aria-hidden="true">
              <span className="ex-cont__name">{name}</span>
              {title && <span className="ex-cont__role">{title}</span>}
            </div>
          )}
          <div className="ex-body">{main}</div>
        </div>
      )}
    />
  )
}
