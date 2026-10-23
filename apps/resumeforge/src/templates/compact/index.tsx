/**
 * Compact — a dense, one-page-first layout. Small, crisp type; a slim header with a two-column
 * contact grid; a wide main column (summary, experience, projects …) and a narrower side column
 * (skills, education, certifications, languages …) separated by a hairline. Dates sit inline on the
 * entry's title line, bullets are tight and section headings are small tinted tabs — so a full
 * career fits on one page while staying legible.
 */
import { Fragment, type ReactNode } from 'react'
import {
  Bullets,
  ContactList,
  EntryLink,
  Keywords,
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
  mmToPx,
  sectionsToBlocks,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './compact.css'

export const meta: TemplateMeta = {
  id: 'compact',
  name: 'Compact',
  description: 'Dense two-column layout with small, crisp type and inline dates that fits a whole career on one page without feeling cramped.',
  tags: ['Two-column', 'One-page', 'Modern'],
  order: 120,
  supportsPhoto: true,
  columns: 2,
  defaultFont: 'inter',
  defaultAccent: '#1d4ed8',
  sideKinds: ['skills', 'education', 'certifications', 'languages', 'awards', 'interests', 'references'],
  headingCase: 'upper',
  gaps: { entry: 7, section: 13 },
}

/** Page margin scale: compact trims the user's margin slightly to win space. */
const MARGIN_SCALE = 0.85

/**
 * Join the non-empty parts with a muted separator (no stray dots when fields are missing). The
 * separator is glued to the part that follows it, so a wrapped line never ends with a dangling "·".
 */
function Joined({ parts, sep = '·' }: { parts: ReactNode[]; sep?: string }) {
  const items = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  return (
    <>
      {items.map((p, i) =>
        i === 0 ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <Fragment key={i}>
            {' '}
            <span className="cp-part">
              <span className="cp-sep">{sep}</span>
              {'\u00a0'}
              {p}
            </span>
          </Fragment>
        ),
      )}
    </>
  )
}

/* ---------------- entries ---------------- */

function SkillEntry({ e, side }: { e: EntryView; side: boolean }) {
  if (!side) {
    return (
      <div className="cp-skill cp-skill--main">
        {e.title && <span className="cp-skill__name">{e.title}</span>}
        {e.title && e.levelLabel && <span className="cp-skill__label"> ({e.levelLabel})</span>}
        {e.title && e.keywords.length > 0 && <span className="cp-skill__name">: </span>}
        {e.keywords.length > 0 && <span className="cp-skill__kw">{e.keywords.join(', ')}</span>}
      </div>
    )
  }
  return (
    <div className="cp-skill">
      {(e.title || e.level > 0) && (
        <div className="cp-skill__row">
          <span className="cp-skill__name">{e.title}</span>
          <LevelSegments level={e.level} label={e.levelLabel} className="cp-skill__level" height="0.34em" gap="0.18em" />
        </div>
      )}
      {e.keywords.length > 0 && <div className="cp-skill__kw">{e.keywords.join(', ')}</div>}
    </div>
  )
}

function LanguageEntry({ e }: { e: EntryView }) {
  return (
    <div className="cp-lang">
      <span className="cp-lang__name">{e.title}</span>
      {e.levelLabel && <span className="cp-lang__level">{e.levelLabel}</span>}
    </div>
  )
}

/** Main-column entry: one dense head line (title · employer · place … date), then details. */
function MainEntry({ e }: { e: EntryView }) {
  const isPub = e.kind === 'publications'
  const link = e.url ? <EntryLink entry={e} className="cp-e__url" /> : null
  const title = e.title && (
    <span key="t" className="cp-e__title">
      {e.title}
    </span>
  )
  const sub = e.subtitle && (
    <span key="s" className="cp-e__sub">
      {e.subtitle}
    </span>
  )
  const loc = e.location && (
    <span key="l" className="cp-e__loc">
      {e.location}
    </span>
  )
  const authors = isPub && e.meta && (
    <span key="a" className="cp-e__authors">
      {e.meta}
    </span>
  )
  return (
    <div className={cx('cp-e', `cp-e--${e.kind}`)}>
      <div className="cp-e__head">
        <div className="cp-e__lead">
          <Joined parts={isPub ? [title] : [title, sub, loc, link]} />
        </div>
        {e.date && <span className="cp-e__date">{e.date}</span>}
      </div>
      {isPub && (authors || sub || link) && (
        <div className="cp-e__cite">
          <Joined parts={[authors, sub, link]} />
        </div>
      )}
      {!isPub && e.meta && <div className="cp-e__meta">{e.kind === 'references' ? <MaybeLink text={e.meta} /> : e.meta}</div>}
      {e.description && <Rich as="div" className="cp-e__desc" text={e.description} />}
      {e.keywords.length > 0 && <Keywords className="cp-e__kw" items={e.keywords} variant="inline" separator=" · " />}
      <Bullets items={e.bullets} marker="square" className="cp-bullets" />
    </div>
  )
}

/** Side-column entry: stacked, narrow-friendly. */
function SideEntry({ e }: { e: EntryView }) {
  const isPub = e.kind === 'publications'
  const isRef = e.kind === 'references'
  return (
    <div className={cx('cp-s', `cp-s--${e.kind}`)}>
      {e.title && <div className="cp-s__title">{e.title}</div>}
      {isPub && e.meta && <div className="cp-s__authors">{e.meta}</div>}
      {e.subtitle && <div className="cp-s__sub">{e.subtitle}</div>}
      {(e.date || e.location) && (
        <div className="cp-s__when">
          <Joined parts={[e.date, e.location]} />
        </div>
      )}
      {!isPub && e.meta && <div className="cp-s__meta">{isRef ? <MaybeLink text={e.meta} /> : e.meta}</div>}
      {e.url && (
        <div className="cp-s__url">
          <EntryLink entry={e} />
        </div>
      )}
      {e.description && <Rich as="div" className="cp-s__desc" text={e.description} />}
      {e.keywords.length > 0 && <Keywords className="cp-s__kw" items={e.keywords} variant="comma" />}
      <Bullets items={e.bullets} marker="square" className="cp-bullets" />
    </div>
  )
}

function entryNode(e: EntryView, side: boolean): ReactNode {
  if (e.kind === 'skills') return <SkillEntry e={e} side={side} />
  if (e.kind === 'languages') return <LanguageEntry e={e} />
  return side ? <SideEntry e={e} /> : <MainEntry e={e} />
}

/** Interests read best as one inline run: "Carnatic music · Photography (film, street)". */
function interestsNode(s: SectionView): ReactNode {
  return (
    <div className="cp-interests">
      <Joined
        parts={s.entries.map((e) => (
          <span key={e.id} className="cp-interest">
            {e.title && <span className="cp-interest__name">{e.title}</span>}
            {e.keywords.length > 0 && <span className="cp-interest__details">{e.title ? ` (${e.keywords.join(', ')})` : e.keywords.join(', ')}</span>}
          </span>
        ))}
      />
    </div>
  )
}

export default function Compact({ data, design, main, side, headingCase, isLetter }: TemplateProps) {
  const b = data.basics
  const heading = (s: SectionView) => <h2 className={cx('cp-h', headingCase === 'normal' && 'cp-h--normal')}>{s.title}</h2>
  const hasContact = contactEntries(b).length > 0

  const header = (
    <header className="cp-header">
      {hasPhoto(b, design) && <Photo basics={b} size="20mm" className="cp-photo" />}
      <div className="cp-id">
        <h1 className="cp-name">{displayName(b)}</h1>
        {b.title.trim() && <div className="cp-title">{b.title}</div>}
      </div>
      {hasContact && <ContactList basics={b} layout="grid" className="cp-contact" iconSize="0.95em" />}
    </header>
  )

  const renderers = (isSide: boolean) => ({
    heading,
    summary: (s: SectionView) => <RichParagraphs className={isSide ? 'cp-summary cp-summary--side' : 'cp-summary'} text={s.content} />,
    entry: (e: EntryView) => entryNode(e, isSide),
    whole: (s: SectionView) => (s.kind === 'interests' ? interestsNode(s) : undefined),
  })

  const mainBlocks = sectionsToBlocks(main, renderers(false))
  const sideBlocks = isLetter ? [] : sectionsToBlocks(side, renderers(true))
  const name = displayName(b)

  return (
    <PageLayout
      header={header}
      main={mainBlocks}
      side={sideBlocks}
      bottom={mmToPx(design.margin * MARGIN_SCALE)}
      page={({ index, count, header, main, side }) => (
        <div className="cp-page">
          {header}
          {index > 0 && (
            <div className="cp-run">
              <span className="cp-run__name">{name}</span>
              <span className="cp-run__page">
                {index + 1} / {Math.max(count, index + 1)}
              </span>
            </div>
          )}
          {isLetter ? (
            <div className="cp-letter">{main}</div>
          ) : (
            <div className="cp-cols">
              <div className="cp-main">{main}</div>
              <div className="cp-side">{side}</div>
            </div>
          )}
        </div>
      )}
    />
  )
}
