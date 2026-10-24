/**
 * Timeline — the career told as a vertical timeline. Every section hangs off one continuous line:
 * dates sit in a right-aligned gutter to the LEFT of the line, each role/degree/award gets an accent
 * node on the line (filled for current roles), and section headings get a larger haloed node. Undated
 * content (summary, skills, languages, interests, references) stays on the same grid, so the line
 * runs unbroken from the first heading to the last entry and continues across pages.
 *
 * Pagination: every block is a self-contained grid row. The line segment of a block's last row is
 * extended downwards by exactly the gap PageLayout leaves after that block (entry or section gap,
 * which are the --rf-entry-gap / --rf-section-gap vars), so the line looks continuous.
 */
import { Fragment, type ReactNode } from 'react'
import {
  Bullets,
  ContactList,
  EntryLink,
  Keywords,
  LevelBar,
  MaybeLink,
  PageLayout,
  Photo,
  Rich,
  RichParagraphs,
  cx,
  displayName,
  hasPhoto,
  sectionsToBlocks,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './timeline.css'

export const meta: TemplateMeta = {
  id: 'timeline',
  name: 'Timeline',
  description: 'Your career as a vertical timeline: dates to the left of a continuous line, accent nodes for every role and clean, airy entries.',
  tags: ['Modern', 'Creative', 'Photo'],
  order: 110,
  supportsPhoto: true,
  columns: 1,
  defaultFont: 'montserrat',
  defaultAccent: '#0e7490',
  headingCase: 'upper',
  gaps: { entry: 9, section: 14 },
}

const NBSP = ' '
const nb = (s: string) => s.replace(/ /g, NBSP)

/** Dates for the gutter. A range breaks only between "start –" and "end" when it doesn't fit. */
function When({ e }: { e: EntryView }) {
  if (!e.date) return null
  const range = !!(e.startText && e.endText && e.startText !== e.endText)
  return (
    <div className="tl-date">
      {range ? (
        <>
          <span className="tl-date__start">{nb(`${e.startText} –`)}</span>{' '}
          <span className={cx('tl-date__end', e.current && 'tl-date__end--now')}>{nb(e.endText)}</span>
        </>
      ) : (
        <span className="tl-date__start">{e.date}</span>
      )}
    </div>
  )
}

/** Join non-empty parts with a separator glued to the following part. */
function Joined({ parts }: { parts: ReactNode[] }) {
  const items = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  return (
    <>
      {items.map((p, i) =>
        i === 0 ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <Fragment key={i}>
            {' '}
            <span className="tl-part">
              <span className="tl-sep">·</span>
              {NBSP}
              {p}
            </span>
          </Fragment>
        ),
      )}
    </>
  )
}

type RowKind = 'head' | 'entry' | 'plain'

function Row({ kind, when, node, current, children }: { kind: RowKind; when?: ReactNode; node?: boolean; current?: boolean; children: ReactNode }) {
  return (
    <div className={cx('tl-row', `tl-row--${kind}`, current && 'tl-row--current')}>
      <div className="tl-when">{when}</div>
      <div className="tl-rail">{node !== false && kind !== 'plain' && <span className={cx('tl-node', kind === 'head' && 'tl-node--head')} />}</div>
      <div className="tl-body">{children}</div>
    </div>
  )
}

/* ---------------- entry bodies ---------------- */

function EntryBody({ e }: { e: EntryView }) {
  const isPub = e.kind === 'publications'
  const isRef = e.kind === 'references'
  const sub = e.subtitle && (
    <span key="s" className="tl-e__sub">
      {e.subtitle}
    </span>
  )
  const loc = e.location && (
    <span key="l" className="tl-e__loc">
      {e.location}
    </span>
  )
  const link = e.url && <EntryLink key="u" entry={e} className="tl-e__url" />
  const authors = isPub && e.meta && (
    <span key="a" className="tl-e__authors">
      {e.meta}
    </span>
  )
  // short single-line kinds keep the issuer on the title line; links sit at the right of the title
  const inlineSub = e.kind === 'certifications' || e.kind === 'awards'
  const line = isPub ? [authors, sub, link] : inlineSub ? [loc] : [sub, loc]
  const topLink = !isPub && link
  return (
    <div className={cx('tl-e', `tl-e--${e.kind}`)}>
      {(e.title || topLink || (inlineSub && sub)) && (
        <div className="tl-e__top">
          <div className="tl-e__title">
            <Joined parts={[e.title, inlineSub && sub]} />
          </div>
          {topLink}
        </div>
      )}
      {line.some(Boolean) && (
        <div className="tl-e__line">
          <Joined parts={line} />
        </div>
      )}
      {!isPub && e.meta && <div className="tl-e__meta">{isRef ? <MaybeLink text={e.meta} /> : e.meta}</div>}
      {e.description && <Rich as="div" className="tl-e__desc" text={e.description} />}
      {e.keywords.length > 0 && <Keywords className="tl-e__tags" items={e.keywords} variant="chips" chipClassName="tl-chip" />}
      <Bullets items={e.bullets} marker="disc" className="tl-bullets" />
    </div>
  )
}

function SkillsGrid({ s }: { s: SectionView }) {
  return (
    <div className="tl-skills">
      {s.entries.map((e) => (
        <div key={e.id} className="tl-skill">
          {(e.title || e.level > 0) && (
            <div className="tl-skill__head">
              <span className="tl-skill__name">{e.title}</span>
              {e.levelLabel && <span className="tl-skill__label">{e.levelLabel}</span>}
            </div>
          )}
          <LevelBar level={e.level} label={e.levelLabel} className="tl-skill__bar" height="0.28em" />
          {e.keywords.length > 0 && <div className="tl-skill__kw">{e.keywords.join(', ')}</div>}
        </div>
      ))}
    </div>
  )
}

function LanguagesList({ s }: { s: SectionView }) {
  return (
    <div className="tl-langs">
      {s.entries.map((e) => (
        <div key={e.id} className="tl-lang">
          <span className="tl-lang__name">{e.title}</span>
          {e.levelLabel && <span className="tl-lang__level">{e.levelLabel}</span>}
        </div>
      ))}
    </div>
  )
}

function InterestChips({ s }: { s: SectionView }) {
  return (
    <div className="tl-interests">
      {s.entries.map((e) => (
        <span key={e.id} className="tl-interest">
          {e.title}
          {e.keywords.length > 0 && <span className="tl-interest__details">{e.title ? ` · ${e.keywords.join(', ')}` : e.keywords.join(', ')}</span>}
        </span>
      ))}
    </div>
  )
}

function ReferencesGrid({ s }: { s: SectionView }) {
  return (
    <div className="tl-refs">
      {s.entries.map((e) => (
        <div key={e.id} className="tl-ref">
          {e.title && <div className="tl-ref__name">{e.title}</div>}
          {e.subtitle && <div className="tl-ref__role">{e.subtitle}</div>}
          {e.meta && (
            <div className="tl-ref__contact">
              <MaybeLink text={e.meta} />
            </div>
          )}
          {e.description && <Rich as="div" className="tl-ref__note" text={e.description} />}
        </div>
      ))}
    </div>
  )
}

/** Sections rendered as one plain block on the line (no per-entry nodes). */
function wholeSection(s: SectionView): ReactNode | undefined {
  switch (s.kind) {
    case 'skills':
      return <Row kind="plain"><SkillsGrid s={s} /></Row>
    case 'languages':
      return <Row kind="plain"><LanguagesList s={s} /></Row>
    case 'interests':
      return <Row kind="plain"><InterestChips s={s} /></Row>
    case 'references':
      return <Row kind="plain"><ReferencesGrid s={s} /></Row>
    default:
      return undefined
  }
}

export default function Timeline({ data, design, sections, headingCase }: TemplateProps) {
  const b = data.basics
  const name = displayName(b)
  const photo = hasPhoto(b, design)

  const header = (
    <header className={cx('tl-header', photo && 'tl-header--photo')}>
      {photo && <Photo basics={b} size="26mm" className="tl-photo" />}
      <div className="tl-id">
        <h1 className="tl-name">{name}</h1>
        {b.title.trim() && <div className="tl-title">{b.title}</div>}
        <ContactList basics={b} layout="inline" className="tl-contact" iconSize="1em" />
      </div>
    </header>
  )

  const firstId = sections[0]?.id
  const lastSection = sections[sections.length - 1]
  const lastId = lastSection ? (lastSection.kind === 'summary' || wholeSection(lastSection) !== undefined ? `${lastSection.id}:all` : `${lastSection.id}:${lastSection.entries[lastSection.entries.length - 1]?.id}`) : ''

  const blocks = sectionsToBlocks(sections, {
    heading: (s) => (
      <Row kind="head">
        <h2 className={cx('tl-h', headingCase === 'normal' && 'tl-h--normal')}>{s.title}</h2>
      </Row>
    ),
    summary: (s) => (
      <Row kind="plain">
        <RichParagraphs className="tl-summary" text={s.content} />
      </Row>
    ),
    entry: (e) => (
      <Row kind="entry" when={<When e={e} />} current={e.current}>
        <EntryBody e={e} />
      </Row>
    ),
    whole: wholeSection,
    wrap: (node, { section, entry, first, last }) => {
      const key = `${section.id}:${entry?.id ?? 'all'}`
      const ext = key === lastId ? 'none' : last ? 'section' : 'entry'
      return <div className={cx('tl-blk', `tl-blk--ext-${ext}`, first && section.id === firstId && 'tl-blk--start')}>{node}</div>
    },
  })

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ index, header, main }) => (
        <div className="tl-page">
          {header}
          {index > 0 && (
            <div className="tl-run">
              <span className="tl-run__name">{name}</span>
              {b.title.trim() && <span className="tl-run__title">{b.title}</span>}
            </div>
          )}
          {main}
        </div>
      )}
    />
  )
}
