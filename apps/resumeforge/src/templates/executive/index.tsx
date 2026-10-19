/**
 * Executive — senior-leadership layout. A full-bleed accent band carries the name (large serif),
 * the title (letter-spaced caps) and an optional photo; a pale strip beneath it holds the contact
 * details. Sections open with strong accent rules, competencies sit in a two-column grid and later
 * pages get a slim continuation band with the name.
 */
import { Fragment, type ReactNode } from 'react'
import {
  ContactList,
  DefaultEntry,
  EntryLink,
  LevelSegments,
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
  description: 'Commanding full-width colour band, strong section rules and a refined serif pairing built for senior and leadership roles.',
  tags: ['Classic', 'Photo'],
  order: 50,
  supportsPhoto: true,
  columns: 1,
  defaultFont: 'playfair',
  defaultAccent: '#1e3a5f',
  headingCase: 'upper',
  gaps: { entry: 11, section: 18 },
}

/** Certifications / awards: one line "Title · Issuer ……… Date" + optional link/description. */
function CompactEntry({ e }: { e: EntryView }) {
  return (
    <div className={cx('ex-compact', `ex-compact--${e.kind}`)}>
      <div className="ex-compact__line">
        <div className="ex-compact__what">
          {e.title && <span className="ex-compact__title">{e.title}</span>}
          {e.title && e.subtitle && <span className="ex-compact__sep"> · </span>}
          {e.subtitle && <span className="ex-compact__by">{e.subtitle}</span>}
        </div>
        {e.date && <div className="ex-compact__date">{e.date}</div>}
      </div>
      {e.url && <EntryLink entry={e} className="ex-compact__link" />}
      {e.description && <Rich as="div" className="ex-compact__desc" text={e.description} />}
    </div>
  )
}

function ExecEntry({ e }: { e: EntryView }) {
  if (e.kind === 'certifications' || e.kind === 'awards') return <CompactEntry e={e} />
  return <DefaultEntry entry={e} variant="main" marker="square" keywords="inline" className="ex-entry" />
}

/** Core competencies: two-column grid of skill groups. */
function Competencies({ entries }: { entries: EntryView[] }) {
  return (
    <div className="ex-comp">
      {entries.map((e) => (
        <div key={e.id} className="ex-comp__cell">
          {(e.title || e.level > 0) && (
            <div className="ex-comp__head">
              <span className="ex-comp__name">{e.title}</span>
              {e.level > 0 && <LevelSegments level={e.level} label={e.levelLabel} height="0.28em" gap="0.16em" className="ex-comp__level" />}
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
          {i > 0 && <span className="ex-inline__sep">{' · '}</span>}
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

/** Up to this many skill groups render as one grid block; longer lists paginate in row pairs. */
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

  const header = (
    <header className="ex-head">
      <div className={cx('ex-band', photo && 'ex-band--photo')}>
        {photo && <Photo basics={b} size="27mm" className="ex-photo" />}
        <div className="ex-id">
          <h1 className="ex-name">{name}</h1>
          {title && <div className="ex-role">{title}</div>}
        </div>
      </div>
      {contactEntries(b).length > 0 && (
        <div className="ex-strip">
          <ContactList basics={b} className="ex-contact" separator="|" iconSize="0.95em" />
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
    const out: Block[] = []
    for (let i = 0; i < s.entries.length; i += 4) {
      const cells = s.entries.slice(i, i + 4)
      out.push({ key: `${s.id}:${cells[0].id}`, sectionId: s.id, entryId: cells[0].id, gap: i + 4 >= s.entries.length ? 'section' : 6, node: <>{i === 0 && heading(s)}<Competencies entries={cells} /></> })
    }
    return out
  })

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ index, header, main }) => (
        <div className="ex-page">
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
