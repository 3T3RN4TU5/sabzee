/**
 * Academic CV — formal, single-column, serif. Built on a hanging-column grid: a narrow left column
 * carries dates (right-aligned), skill-group labels, publication numbers and an accent bar for each
 * section heading; the wide right column carries the content in the classic CV "entry" style
 * ("Title, Institution, City"). Education is moved to the top (after the profile), publications
 * are numbered citations with the owner's name in bold, and references sit in a two-column grid.
 * Pages 2+ get a small-caps running head with the page number.
 */
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import {
  Bullets,
  ContactList,
  EntryLink,
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
import type { FontId } from '../../lib/types.ts'
import { educationFirst, splitAuthors, terminate } from './cite.ts'
import './academic.css'

export const meta: TemplateMeta = {
  id: 'academic',
  name: 'Academic CV',
  description: 'Formal serif CV with a hanging date column, education first, numbered publications with your name in bold, and a references grid.',
  tags: ['Classic', 'ATS-friendly'],
  order: 130,
  supportsPhoto: true,
  columns: 1,
  defaultFont: 'merriweather',
  defaultAccent: '#1e3a5f',
  headingCase: 'normal',
  gaps: { entry: 9, section: 17 },
}

/** Optical size correction so every font pairing reads at a similar size in this layout. */
const OPTICAL: Partial<Record<FontId, number>> = { merriweather: 0.92, garamond: 1.08, playfair: 1.02, georgia: 0.97, montserrat: 0.95, poppins: 0.95, raleway: 1 }

const NBSP = ' '
const nb = (s: string) => s.replace(/ /g, NBSP)

/** Non-empty parts joined with a separator; the separator sticks to the preceding part. */
function Joined({ parts, sep = ', ' }: { parts: ReactNode[]; sep?: string }) {
  const items = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  return (
    <>
      {items.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < items.length - 1 && <span className="ac-sep">{sep}</span>}
        </Fragment>
      ))}
    </>
  )
}

function Row({ left, kind, children }: { left?: ReactNode; kind: string; children: ReactNode }) {
  return (
    <div className={cx('ac-row', `ac-row--${kind}`)}>
      <div className="ac-left">{left}</div>
      <div className="ac-right">{children}</div>
    </div>
  )
}

function Dates({ e }: { e: EntryView }) {
  if (!e.date) return null
  const range = !!(e.startText && e.endText && e.startText !== e.endText)
  return (
    <span className="ac-date">
      {range ? (
        <>
          {nb(`${e.startText} –`)} <span className={cx(e.current && 'ac-date--now')}>{nb(e.endText)}</span>
        </>
      ) : (
        e.date
      )}
    </span>
  )
}

function Authors({ text, owner }: { text: string; owner: string }) {
  return (
    <span className="ac-authors">
      {splitAuthors(text, owner).map((t, i) =>
        t.self ? (
          <strong key={i} className="ac-self">
            {t.text}
          </strong>
        ) : (
          <Fragment key={i}>{t.text}</Fragment>
        ),
      )}
    </span>
  )
}

/** Numbered citation: Authors. “Title.” Venue, Date. link */
function Publication({ e, n, owner }: { e: EntryView; n: number; owner: string }) {
  const venue = [e.subtitle, e.date].filter(Boolean).join(', ')
  return (
    <Row kind="pub" left={<span className="ac-num">[{n}]</span>}>
      <div className="ac-cite">
        {e.meta && (
          <>
            <Authors text={terminate(e.meta)} owner={owner} />{' '}
          </>
        )}
        {e.title && <span className="ac-cite__title">“{terminate(e.title)}”</span>}
        {venue && (
          <>
            {' '}
            <span className="ac-cite__venue">{e.subtitle && <em>{e.subtitle}</em>}</span>
            {e.subtitle && e.date && ', '}
            {e.date}.
          </>
        )}
        {e.url && (
          <>
            {' '}
            <EntryLink entry={e} className="ac-url" />
          </>
        )}
      </div>
      {e.description && <Rich as="div" className="ac-desc" text={e.description} />}
    </Row>
  )
}

/** Classic CV entry: "Title, Institution, City" run, then detail lines. */
function CvEntry({ e }: { e: EntryView }) {
  const isRef = e.kind === 'references'
  return (
    <Row kind="entry" left={<Dates e={e} />}>
      <div className="ac-line">
        <Joined
          parts={[
            e.title && (
              <span key="t" className="ac-title">
                {e.title}
              </span>
            ),
            e.subtitle && (
              <em key="s" className="ac-sub">
                {e.subtitle}
              </em>
            ),
            e.location && (
              <span key="l" className="ac-loc">
                {e.location}
              </span>
            ),
          ]}
        />
        {e.url && (
          <>
            <span className="ac-sep"> — </span>
            <EntryLink entry={e} className="ac-url" />
          </>
        )}
      </div>
      {e.meta && <div className="ac-meta">{isRef ? <MaybeLink text={e.meta} /> : e.meta}</div>}
      {e.description && <Rich as="div" className="ac-desc" text={e.description} />}
      {e.keywords.length > 0 && (
        <div className="ac-kw">
          <span className="ac-kw__label">{e.kind === 'projects' ? 'Tools' : 'Keywords'}: </span>
          {e.keywords.join(', ')}
        </div>
      )}
      <Bullets items={e.bullets} marker="dash" className="ac-bullets" />
    </Row>
  )
}

function SkillRow({ e }: { e: EntryView }) {
  return (
    <Row kind="item" left={e.title && <span className="ac-label">{e.title}</span>}>
      <span className="ac-skill">
        {e.keywords.join(', ')}
        {e.levelLabel && (
          <span className="ac-level">
            {e.keywords.length ? ' ' : ''}({e.levelLabel.toLowerCase()})
          </span>
        )}
      </span>
    </Row>
  )
}

function LanguagesLine({ s }: { s: SectionView }) {
  return (
    <Row kind="item">
      <div className="ac-inline">
        <Joined
          sep="; "
          parts={s.entries.map((e) => (
            <span key={e.id}>
              <span className="ac-inline__name">{e.title}</span>
              {e.levelLabel && <span className="ac-level"> ({e.levelLabel.toLowerCase()})</span>}
            </span>
          ))}
        />
      </div>
    </Row>
  )
}

function InterestsLine({ s }: { s: SectionView }) {
  return (
    <Row kind="item">
      <div className="ac-inline">
        <Joined
          sep="; "
          parts={s.entries.map((e) => (
            <span key={e.id}>
              {e.title}
              {e.keywords.length > 0 && <span className="ac-level">{e.title ? ` (${e.keywords.join(', ')})` : e.keywords.join(', ')}</span>}
            </span>
          ))}
        />
      </div>
    </Row>
  )
}

function ReferencesGrid({ s }: { s: SectionView }) {
  return (
    <Row kind="refs">
      <div className="ac-refs">
        {s.entries.map((e) => (
          <div key={e.id} className="ac-ref">
            {e.title && <div className="ac-ref__name">{e.title}</div>}
            {e.subtitle && <div className="ac-ref__role">{e.subtitle}</div>}
            {e.meta && (
              <div className="ac-ref__contact">
                <MaybeLink text={e.meta} />
              </div>
            )}
            {e.description && <Rich as="div" className="ac-ref__note" text={e.description} />}
          </div>
        ))}
      </div>
    </Row>
  )
}

export default function Academic({ data, design, sections, font }: TemplateProps) {
  const b = data.basics
  const name = displayName(b)
  const owner = b.name
  const photo = hasPhoto(b, design)
  const pageStyle: CSSProperties = { fontSize: `${OPTICAL[font.id] ?? 1}em` }

  const header = (
    <header className={cx('ac-header', photo && 'ac-header--photo')}>
      {photo && (
        <div className="ac-header__photo">
          <Photo basics={b} size="23mm" className="ac-photo" />
        </div>
      )}
      <div className="ac-header__id">
        <h1 className="ac-name">{name}</h1>
        {b.title.trim() && <div className="ac-role">{b.title}</div>}
        <ContactList basics={b} layout="inline" separator="·" className="ac-contact" iconSize="0.9em" />
      </div>
    </header>
  )

  const ordered = educationFirst(sections)
  const blocks = sectionsToBlocks(ordered, {
    heading: (s) => (
      <div className="ac-hrow">
        <div className="ac-hbar" />
        <h2 className="ac-h">{s.title}</h2>
      </div>
    ),
    summary: (s) => (
      <Row kind="summary">
        <RichParagraphs className="ac-summary" text={s.content} />
      </Row>
    ),
    entry: (e, _s, i) => {
      if (e.kind === 'publications') return <Publication e={e} n={i + 1} owner={owner} />
      if (e.kind === 'skills') return <SkillRow e={e} />
      return <CvEntry e={e} />
    },
    whole: (s) => {
      if (s.kind === 'languages') return <LanguagesLine s={s} />
      if (s.kind === 'interests') return <InterestsLine s={s} />
      if (s.kind === 'references') return <ReferencesGrid s={s} />
      return undefined
    },
  })

  return (
    <PageLayout
      header={header}
      main={blocks}
      page={({ index, count, header, main }) => (
        <div className="ac-page" style={pageStyle}>
          {header}
          {index > 0 && (
            <div className="ac-run">
              <span className="ac-run__name">{name}</span>
              <span className="ac-run__page">
                Curriculum Vitae · page {index + 1} of {Math.max(count, index + 1)}
              </span>
            </div>
          )}
          {main}
        </div>
      )}
    />
  )
}
