/**
 * Elegant — refined serif stationery. A centred header (double-ring monogram or photo, a tracked
 * display-serif name, an italic title, a hairline–diamond ornament and the contact line) sits above
 * a double hairline; the body is a wide main column and a narrow side column divided by a hairline.
 * Headings are tracked small caps between hairlines, levels are drawn as tiny diamonds with dotted
 * leaders, and continuation pages get a quiet running head and a folio set into the page frame.
 * With the 'auto' font it pairs Playfair Display (display) with EB Garamond (text).
 * DOM order is header → main → side, so ATS parsers read the experience first.
 */
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { FONT_BY_ID } from '../../lib/fonts.ts'
import {
  ContactList,
  DefaultEntry,
  PageLayout,
  Photo,
  RichParagraphs,
  cx,
  displayName,
  hasPhoto,
  initials,
  sectionsToBlocks,
  useFont,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './elegant.css'

export const meta: TemplateMeta = {
  id: 'elegant',
  name: 'Elegant',
  description: 'Refined serif typography with a centred monogram, small-caps headings and hairline rules over a quiet two-column body.',
  tags: ['Classic', 'Two-column', 'Photo'],
  order: 70,
  supportsPhoto: true,
  columns: 2,
  defaultFont: 'garamond',
  defaultAccent: '#7b5a3c',
  sideKinds: ['education', 'skills', 'languages', 'certifications', 'awards', 'interests', 'references'],
  headingCase: 'upper',
  gaps: { entry: 12, section: 22 },
}

/** Five tiny diamonds (decorative; the level is in aria-label). */
function Diamonds({ level, label }: { level: number; label?: string }) {
  if (!level) return null
  return (
    <span className="el-dias" role="img" aria-label={label || `${level} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cx('el-dia', i < level && 'is-on')} />
      ))}
    </span>
  )
}

/** "Name ········ value" row with a dotted leader (skills, languages). */
function LeaderRow({ name, nameClass, children }: { name: string; nameClass: string; children?: ReactNode }) {
  return (
    <div className="el-leader">
      <span className={cx('el-leader__name', nameClass)}>{name}</span>
      {children && (
        <>
          <span className="el-leader__dots" aria-hidden="true" />
          <span className="el-leader__value">{children}</span>
        </>
      )}
    </div>
  )
}

function SideSkill({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--skills rf-entry--side rf-skill el-skill">
      {e.title ? (
        <LeaderRow name={e.title} nameClass="rf-skill__name">
          {e.level > 0 && <Diamonds level={e.level} label={e.levelLabel} />}
        </LeaderRow>
      ) : (
        e.level > 0 && <Diamonds level={e.level} label={e.levelLabel} />
      )}
      {e.keywords.length > 0 && <div className="rf-skill__keywords el-skill__kw">{e.keywords.join(', ')}</div>}
    </div>
  )
}

function MainSkill({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--skills rf-entry--main rf-skill el-mskill">
      <span className="rf-skill__name el-mskill__name">{e.title}</span>
      <span className="rf-skill__keywords el-mskill__kw">{e.keywords.join(', ')}</span>
      <span className="el-mskill__level">{e.level > 0 && <Diamonds level={e.level} label={e.levelLabel} />}</span>
    </div>
  )
}

function Language({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--languages rf-lang el-lang">
      <LeaderRow name={e.title} nameClass="rf-lang__name">
        {e.levelLabel && <span className="rf-lang__level">{e.levelLabel}</span>}
      </LeaderRow>
    </div>
  )
}

/** Interests as one flowing line with diamond separators. */
function Interests({ s }: { s: SectionView }) {
  const items = s.entries.map((e) => (e.keywords.length ? `${e.title} (${e.keywords.join(', ')})` : e.title)).filter(Boolean)
  return (
    <p className="el-interests">
      {items.map((t, i) => (
        <Fragment key={`${i}:${t}`}>
          {i > 0 && <span className="el-sep" aria-hidden="true" />}
          <span className="rf-interest__name">{t}</span>
        </Fragment>
      ))}
    </p>
  )
}

export default function Elegant({ data, design, font, main, side, headingCase, isLetter }: TemplateProps) {
  // The signature pairing: Playfair Display for display type over EB Garamond text (font = 'auto').
  const auto = design.font === 'auto'
  useFont(auto ? 'playfair' : font.id)
  const b = data.basics
  const name = displayName(b)
  const caps = headingCase === 'upper'
  const photo = hasPhoto(b, design)
  const frameStyle = auto ? ({ '--rf-font-heading': FONT_BY_ID.playfair.heading } as CSSProperties) : undefined

  const header = (
    <header className="el-header">
      {photo ? (
        <Photo basics={b} size="25mm" className="el-photo" />
      ) : (
        <div className="el-mono" aria-hidden="true">
          <span>{initials(name)}</span>
        </div>
      )}
      <h1 className={cx('el-name', caps && 'el-name--caps')}>{name}</h1>
      {b.title.trim() && <div className="el-title">{b.title}</div>}
      <div className="el-orn" aria-hidden="true">
        <span />
      </div>
      <ContactList basics={b} className="el-contact" separator={<span className="el-sep" />} iconColor="var(--rf-accent-ink)" iconSize="0.95em" />
      <div className="el-rule" aria-hidden="true" />
    </header>
  )

  const hClass = caps ? 'el-h--caps' : 'el-h--italic'
  const heading = (s: SectionView) => (
    <h2 className={cx('el-h', hClass)}>
      <span className="el-h__text">{s.title}</span>
    </h2>
  )
  const sideHeading = (s: SectionView) => (
    <h3 className={cx('el-h el-h--side', hClass)}>
      <span className="el-h__text">{s.title}</span>
    </h3>
  )

  const mainBlocks = sectionsToBlocks(main, {
    heading,
    summary: (s) => <RichParagraphs className="el-summary" text={s.content} />,
    entry: (e): ReactNode => {
      if (e.kind === 'skills') return <MainSkill e={e} />
      if (e.kind === 'languages') return <Language e={e} />
      return <DefaultEntry entry={e} variant="main" keywords="inline" />
    },
    whole: (s) => {
      if (s.kind === 'interests') return <Interests s={s} />
      if (s.kind === 'languages')
        return (
          <div className="el-langs">
            {s.entries.map((e) => (
              <Language key={e.id} e={e} />
            ))}
          </div>
        )
      return undefined
    },
  })

  const sideBlocks: Block[] = isLetter
    ? []
    : sectionsToBlocks(side, {
        heading: sideHeading,
        summary: (s) => <RichParagraphs className="el-side-summary" text={s.content} />,
        entry: (e): ReactNode => {
          if (e.kind === 'skills') return <SideSkill e={e} />
          if (e.kind === 'languages') return <Language e={e} />
          return <DefaultEntry entry={e} variant="side" keywords="comma" />
        },
        whole: (s) => {
          if (s.kind === 'interests') return <Interests s={s} />
          if (s.kind === 'languages')
            return (
              <div className="el-side-langs">
                {s.entries.map((e) => (
                  <Language key={e.id} e={e} />
                ))}
              </div>
            )
          return undefined
        },
      })

  return (
    <PageLayout
      header={header}
      main={mainBlocks}
      side={sideBlocks}
      page={({ index, count, header, main, side }) => (
        <div className={cx('el-page', auto && 'el-page--auto')} style={frameStyle}>
          <div className="el-frame" aria-hidden="true" />
          {index > 0 && (
            <div className="el-runhead" aria-hidden="true">
              <span>{name}</span>
            </div>
          )}
          {header}
          {isLetter ? (
            <div className="el-body el-body--letter">
              <div className="el-main">{main}</div>
            </div>
          ) : (
            <div className="el-body">
              <div className="el-main">{main}</div>
              <aside className="el-side">{side}</aside>
            </div>
          )}
          {count > 1 && (
            <div className="el-folio" aria-hidden="true">
              {index + 1} / {count}
            </div>
          )}
        </div>
      )}
    />
  )
}
