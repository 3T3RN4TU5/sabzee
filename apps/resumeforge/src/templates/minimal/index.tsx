/**
 * Minimal — an airy, single-column layout on a two-track grid: tiny letter-spaced section labels
 * hang in a narrow left gutter and everything else — name, contact grid and content — starts on
 * one vertical line in the wide right track (the optional photo sits in the gutter). Light display
 * type for the name, quiet greys, the accent only on labels and links, and plenty of whitespace.
 */
import { Fragment, type ReactNode } from 'react'
import {
  ContactList,
  DefaultEntry,
  EntryLink,
  LevelDots,
  MaybeLink,
  PageLayout,
  Photo,
  Rich,
  RichParagraphs,
  cx,
  displayName,
  hasPhoto,
  mmToPx,
  sectionsToBlocks,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './minimal.css'

export const meta: TemplateMeta = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Airy single column with light type, generous whitespace and tiny section labels hung in a left gutter.',
  tags: ['Modern', 'ATS-friendly', 'Photo'],
  order: 30,
  supportsPhoto: true,
  columns: 1,
  defaultFont: 'raleway',
  defaultAccent: '#0f766e',
  headingCase: 'upper',
  gaps: { entry: 10, section: 17 },
}

/** Page padding = design margin × this (minimal breathes a little more than the others). */
const ROOM = 1.12

/** Certifications / awards: "Title — Issuer ……… Date", optional link and note below. */
function CompactEntry({ e }: { e: EntryView }) {
  return (
    <div className={cx('mi-compact', `mi-compact--${e.kind}`)}>
      <div className="mi-line">
        <div className="mi-line__l">
          {e.title && <span className="mi-title">{e.title}</span>}
          {e.title && e.subtitle && <span className="mi-dash">{' — '}</span>}
          {e.subtitle && <span className="mi-by">{e.subtitle}</span>}
        </div>
        {e.date && <div className="mi-line__r mi-date">{e.date}</div>}
      </div>
      {e.url && <EntryLink entry={e} className="mi-link" />}
      {e.description && <Rich as="div" className="mi-note" text={e.description} />}
    </div>
  )
}

/** Publications: "Title ……… Date" / "Authors · Venue" / link. */
function Publication({ e }: { e: EntryView }) {
  return (
    <div className="mi-pub">
      <div className="mi-line">
        <div className="mi-line__l">{e.title && <span className="mi-title">{e.title}</span>}</div>
        {e.date && <div className="mi-line__r mi-date">{e.date}</div>}
      </div>
      {(e.meta || e.subtitle) && (
        <div className="mi-pub__by">
          {e.meta && <span>{e.meta}</span>}
          {e.meta && e.subtitle && <span className="mi-dot">{' · '}</span>}
          {e.subtitle && <span className="mi-pub__venue">{e.subtitle}</span>}
        </div>
      )}
      {e.url && <EntryLink entry={e} className="mi-link" />}
      {e.description && <Rich as="div" className="mi-note" text={e.description} />}
    </div>
  )
}

function entry(e: EntryView): ReactNode {
  switch (e.kind) {
    case 'certifications':
    case 'awards':
      return <CompactEntry e={e} />
    case 'publications':
      return <Publication e={e} />
    default:
      return <DefaultEntry entry={e} variant="main" marker="dash" keywords="inline" className="mi-entry" />
  }
}

function SkillList({ entries }: { entries: EntryView[] }) {
  return (
    <div className="mi-skills">
      {entries.map((e) => (
        <div key={e.id} className={cx('mi-skill', !e.title && 'mi-skill--untitled')}>
          {e.title && <div className="mi-skill__name">{e.title}</div>}
          <div className="mi-skill__list">{e.keywords.join(', ')}</div>
          {e.level > 0 && <LevelDots level={e.level} label={e.levelLabel} size="0.4em" gap="0.24em" className="mi-skill__dots" />}
        </div>
      ))}
    </div>
  )
}

function Languages({ entries }: { entries: EntryView[] }) {
  return (
    <div className="mi-langs">
      {entries.map((e) => (
        <div key={e.id} className="mi-lang">
          <div className="mi-lang__name">{e.title}</div>
          {e.levelLabel && <div className="mi-lang__level">{e.levelLabel}</div>}
        </div>
      ))}
    </div>
  )
}

function Interests({ entries }: { entries: EntryView[] }) {
  const items = entries.filter((e) => e.title || e.keywords.length)
  return (
    <div className="mi-inline">
      {items.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 && <span className="mi-inline__sep">{' · '}</span>}
          <span className="mi-inline__item">
            {e.title || e.keywords.join(', ')}
            {e.title && e.keywords.length > 0 && <span className="mi-inline__detail">{` (${e.keywords.join(', ')})`}</span>}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

function References({ entries }: { entries: EntryView[] }) {
  return (
    <div className="mi-refs">
      {entries.map((e) => (
        <div key={e.id} className="mi-ref">
          {e.title && <div className="mi-ref__name">{e.title}</div>}
          {e.subtitle && <div className="mi-ref__role">{e.subtitle}</div>}
          {e.meta && <MaybeLink className="mi-ref__contact" text={e.meta} />}
          {e.description && <Rich as="div" className="mi-ref__note" text={e.description} />}
        </div>
      ))}
    </div>
  )
}

const SKILL_CHUNK = 8

function whole(s: SectionView): ReactNode | undefined {
  switch (s.kind) {
    case 'skills':
      return s.entries.length <= SKILL_CHUNK ? <SkillList entries={s.entries} /> : undefined
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

export default function Minimal({ data, design, main, headingCase, isLetter }: TemplateProps) {
  const b = data.basics
  const photo = hasPhoto(b, design)

  const header = (
    <header className="mi-header">
      <div className="mi-gutter mi-header__gutter">{photo && <Photo basics={b} size="22mm" className="mi-photo" />}</div>
      <div className="mi-body">
        <h1 className="mi-name">{displayName(b)}</h1>
        {b.title.trim() && <div className="mi-role">{b.title}</div>}
        <ContactList basics={b} layout="grid" className="mi-contact" iconSize="0.92em" />
      </div>
    </header>
  )

  const labelCls = cx('mi-label', headingCase === 'normal' && 'mi-label--normal')
  const row = (section: SectionView, first: boolean, node: ReactNode) => (
    <div className={cx('mi-row', `mi-row--${section.kind}`)}>
      <div className="mi-gutter">{first && <h2 className={labelCls}>{section.title}</h2>}</div>
      <div className="mi-body">{node}</div>
    </div>
  )

  const renderers = {
    heading: () => null,
    summary: (s: SectionView) => <RichParagraphs className="mi-summary" text={s.content} />,
    entry,
    whole,
    wrap: (node: ReactNode, { section, first }: { section: SectionView; first: boolean }) => row(section, first, node),
  }

  const blocks: Block[] = main.flatMap((s) => {
    if (s.kind !== 'skills' || s.entries.length <= SKILL_CHUNK) return sectionsToBlocks([s], renderers)
    // long skill lists: chunks of rows with a tight gap so they still paginate
    const out: Block[] = []
    for (let i = 0; i < s.entries.length; i += 6) {
      const rows = s.entries.slice(i, i + 6)
      out.push({ key: `${s.id}:${rows[0].id}`, sectionId: s.id, entryId: rows[0].id, gap: i + 6 >= s.entries.length ? 'section' : 4, node: row(s, i === 0, <SkillList entries={rows} />) })
    }
    return out
  })

  return (
    <PageLayout
      header={header}
      main={blocks}
      bottom={mmToPx(design.margin * ROOM)}
      page={({ index, count, header, main }) => (
        <div className="mi-page">
          {header}
          {isLetter ? <div className="mi-letter">{main}</div> : main}
          {count > 1 && (
            <div className="mi-folio" aria-hidden="true">
              {index + 1} / {count}
            </div>
          )}
        </div>
      )}
    />
  )
}
