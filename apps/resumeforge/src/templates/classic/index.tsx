/**
 * Classic — a timeless single-column serif résumé: centred name with a letter-spaced role line,
 * contact details separated by fine bars and letter-spaced section headings over hairline rules. Entries use the traditional two-line layout
 *   Title ………………………………… Date
 *   Organisation (italic) ……… Location
 * Skills read as a typeset table, languages/interests as one flowing line.
 */
import { Fragment, type ReactNode } from 'react'
import type { FontId } from '../../lib/types.ts'
import {
  Bullets,
  ContactList,
  EntryLink,
  Keywords,
  MaybeLink,
  PageLayout,
  Rich,
  RichParagraphs,
  cx,
  displayName,
  sectionsToBlocks,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './classic.css'

export const meta: TemplateMeta = {
  id: 'classic',
  name: 'Classic',
  description: 'Timeless serif typography with a centred header, fine rules and the traditional two-line entry layout recruiters know by heart.',
  tags: ['Classic', 'ATS-friendly'],
  order: 20,
  supportsPhoto: false,
  columns: 1,
  defaultFont: 'garamond',
  defaultAccent: '#1e293b',
  headingCase: 'upper',
  gaps: { entry: 8, section: 14 },
}

/** Garamond has a small x-height; nudge it so 13 px reads like 13 px in the other pairings. */
const OPTICAL: Partial<Record<FontId, number>> = { garamond: 1.06 }

/** Left / right aligned line that wraps the left side and keeps the right side on one line. */
function Line({ left, right, className }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  if (!left && !right) return null
  return (
    <div className={cx('cl-line', className)}>
      <div className="cl-line__l">{left}</div>
      {right ? <div className="cl-line__r">{right}</div> : null}
    </div>
  )
}

/** Join non-empty nodes with a separator. */
function joined(parts: ReactNode[], sep: ReactNode = ', '): ReactNode {
  const items = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  if (!items.length) return null
  return items.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="cl-sep">{sep}</span>}
      {p}
    </Fragment>
  ))
}

function ClassicEntry({ e }: { e: EntryView }) {
  const link = e.url ? <EntryLink key="link" entry={e} className="cl-link" /> : null
  const date = e.date ? <span className="cl-date">{e.date}</span> : null
  const title = e.title ? <span key="title" className="cl-etitle">{e.title}</span> : null
  // The link sits top-right when there is no date, otherwise on the second line.
  const topRight = date ?? link
  const lowLink = date ? link : null

  if (e.kind === 'certifications' || e.kind === 'awards') {
    return (
      <div className={cx('cl-entry', 'cl-entry--compact', `cl-entry--${e.kind}`)}>
        <Line left={joined([title, e.subtitle ? <span key="sub" className="cl-sub">{e.subtitle}</span> : null])} right={topRight} />
        {lowLink && <div className="cl-note">{lowLink}</div>}
        {e.description && <Rich as="div" className="cl-desc" text={e.description} />}
      </div>
    )
  }

  if (e.kind === 'publications') {
    return (
      <div className={cx('cl-entry', 'cl-entry--publications')}>
        <Line left={title} right={topRight} />
        <Line left={joined([e.meta ? <span key="authors" className="cl-authors">{e.meta}</span> : null, e.subtitle ? <span key="venue" className="cl-sub">{e.subtitle}</span> : null], '. ')} right={lowLink} className="cl-line--2" />
        {e.description && <Rich as="div" className="cl-desc" text={e.description} />}
      </div>
    )
  }

  const second = joined([e.location ? <span key="loc" className="cl-loc">{e.location}</span> : null, lowLink], ' · ')
  // Education reads "School · Grade" on one line; other kinds have no meta here.
  const org = joined([e.subtitle ? <span key="sub" className="cl-sub">{e.subtitle}</span> : null, e.meta ? <span key="grade" className="cl-grade">{e.meta}</span> : null], ' · ')
  return (
    <div className={cx('cl-entry', `cl-entry--${e.kind}`)}>
      <Line left={title} right={topRight} />
      <Line left={org} right={second} className="cl-line--2" />
      {e.description && <Rich as="div" className="cl-desc" text={e.description} />}
      {e.keywords.length > 0 && <Keywords className="cl-tech" items={e.keywords} separator=" · " />}
      <Bullets items={e.bullets} className="cl-bullets" />
    </div>
  )
}

/** Skills as a typeset table: group · skills · level. */
function SkillTable({ entries }: { entries: EntryView[] }) {
  return (
    <div className="cl-skills">
      {entries.map((e) => (
        <div key={e.id} className={cx('cl-skill', !e.title && 'cl-skill--untitled')}>
          {e.title && <div className="cl-skill__name">{e.title}</div>}
          {e.keywords.length > 0 && <div className="cl-skill__list">{e.keywords.join(', ')}</div>}
          {e.levelLabel && <div className="cl-skill__level">{e.levelLabel}</div>}
        </div>
      ))}
    </div>
  )
}

/** One flowing line: "English (Native / bilingual) · Hindi (Native / bilingual) · …". */
function InlineList({ items }: { items: { key: string; name: string; detail: string }[] }) {
  return (
    <div className="cl-inline">
      {items.map((it, i) => (
        <Fragment key={it.key}>
          {i > 0 && <span className="cl-inline__sep">{' · '}</span>}
          <span className="cl-inline__item">
            <span className="cl-inline__name">{it.name}</span>
            {it.detail && <span className="cl-inline__detail">{` (${it.detail})`}</span>}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

function References({ entries }: { entries: EntryView[] }) {
  return (
    <div className="cl-refs">
      {entries.map((e) => (
        <div key={e.id} className="cl-ref">
          {e.title && <div className="cl-etitle">{e.title}</div>}
          {e.subtitle && <div className="cl-sub">{e.subtitle}</div>}
          {e.meta && <MaybeLink className="cl-ref__contact" text={e.meta} />}
          {e.description && <Rich as="div" className="cl-desc" text={e.description} />}
        </div>
      ))}
    </div>
  )
}

const SKILL_CHUNK = 8

/** Long skill tables paginate in chunks of rows (tight row gap instead of the entry gap). */
function skillBlocks(s: SectionView, heading: (s: SectionView) => ReactNode): Block[] {
  const out: Block[] = []
  for (let i = 0; i < s.entries.length; i += 6) {
    const rows = s.entries.slice(i, i + 6)
    const last = i + 6 >= s.entries.length
    out.push({ key: `${s.id}:${rows[0].id}`, sectionId: s.id, entryId: rows[0].id, gap: last ? 'section' : 3, node: <>{i === 0 && heading(s)}<SkillTable entries={rows} /></> })
  }
  return out
}

function whole(s: SectionView): ReactNode | undefined {
  switch (s.kind) {
    case 'skills':
      // short tables are one block; long ones are chunked in skillBlocks()
      return s.entries.length <= SKILL_CHUNK ? <SkillTable entries={s.entries} /> : undefined
    case 'languages':
      return <InlineList items={s.entries.map((e) => ({ key: e.id, name: e.title, detail: e.levelLabel }))} />
    case 'interests':
      return <InlineList items={s.entries.filter((e) => e.title || e.keywords.length).map((e) => ({ key: e.id, name: e.title || e.keywords.join(', '), detail: e.title ? e.keywords.join(', ') : '' }))} />
    case 'references':
      return <References entries={s.entries} />
    default:
      return undefined
  }
}

export default function Classic({ data, main, font, headingCase }: TemplateProps) {
  const b = data.basics
  const name = displayName(b)
  const optical = OPTICAL[font.id] ?? 1

  const header = (
    <header className="cl-header">
      <h1 className="cl-name">{name}</h1>
      {b.title.trim() && <div className="cl-role">{b.title}</div>}
      <ContactList basics={b} className="cl-contact" separator="|" iconSize="0.95em" />
    </header>
  )

  const heading = (s: SectionView) => (
    <h2 className={cx('cl-h', headingCase === 'normal' && 'cl-h--normal')}>
      <span>{s.title}</span>
    </h2>
  )

  const blocks = main.flatMap((s) =>
    s.kind === 'skills' && s.entries.length > SKILL_CHUNK
      ? skillBlocks(s, heading)
      : sectionsToBlocks([s], {
          heading,
          summary: (sec) => <RichParagraphs className="cl-summary" text={sec.content} />,
          entry: (e) => <ClassicEntry e={e} />,
          whole,
        }),
  )

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ index, count, header, main }) => (
        <div className="cl-page" style={optical !== 1 ? { fontSize: `${optical}em` } : undefined}>
          {index > 0 && (
            <div className="cl-running" aria-hidden="true">
              <span className="cl-running__name">{name}</span>
              <span className="cl-running__page">
                Page {index + 1}
                {count > index ? ` of ${count}` : ''}
              </span>
            </div>
          )}
          {header}
          {main}
        </div>
      )}
    />
  )
}
