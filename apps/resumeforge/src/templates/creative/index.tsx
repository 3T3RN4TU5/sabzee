/**
 * Creative — two zones: a full-width colour band on page 1 (photo or monogram, display-weight name with
 * the surname in heavy type, soft accent shapes) above a tinted sidebar (contact with icon badges,
 * skills as segment bars, languages as dots, interests as chips) and a white main column with
 * icon-badge section headings and date pills. Main content comes first in the DOM for ATS parsers;
 * the sidebar is moved to the left visually.
 */
import type { ReactNode } from 'react'
import {
  ContactIcon,
  DefaultEntry,
  Keywords,
  LevelDots,
  LevelSegments,
  PageLayout,
  Photo,
  RichParagraphs,
  contactEntries,
  cx,
  displayName,
  hasPhoto,
  initials,
  sectionsToBlocks,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import type { Basics } from '../../lib/types.ts'
import { SectionIcon } from './icons.tsx'
import './creative.css'

export const meta: TemplateMeta = {
  id: 'creative',
  name: 'Creative',
  description: 'A bold colour band with your photo and a display-weight name over a tinted skills sidebar, with icon-led sections and date pills.',
  tags: ['Creative', 'Two-column', 'Photo', 'Modern'],
  order: 80,
  supportsPhoto: true,
  columns: 2,
  defaultFont: 'poppins',
  defaultAccent: '#0f766e',
  sideKinds: ['skills', 'languages', 'certifications', 'awards', 'interests', 'references'],
  headingCase: 'normal',
  gaps: { entry: 11, section: 20 },
}

/** "Dr. Meera Iyer" → ["Dr. Meera", "Iyer"] (the surname is set in heavy type). */
function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return ['', name.trim()]
  return [parts.slice(0, -1).join(' '), parts[parts.length - 1]]
}

const interestLabel = (e: EntryView) => (e.keywords.length ? `${e.title} (${e.keywords.join(', ')})` : e.title)

function SideSkill({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--skills rf-entry--side rf-skill cr-skill">
      {e.title && <div className="rf-skill__name">{e.title}</div>}
      {e.level > 0 && <LevelSegments level={e.level} label={e.levelLabel} className="cr-skill__bar" height="0.34em" gap="0.24em" />}
      {e.keywords.length > 0 && <div className="rf-skill__keywords cr-skill__kw">{e.keywords.join(', ')}</div>}
    </div>
  )
}

function MainSkill({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--skills rf-entry--main rf-skill cr-mskill">
      <div className="cr-mskill__name">
        {e.title && <span className="rf-skill__name">{e.title}</span>}
        {e.level > 0 && <LevelSegments level={e.level} label={e.levelLabel} className="cr-mskill__bar" height="0.3em" gap="0.2em" />}
      </div>
      {e.keywords.length > 0 && <Keywords items={e.keywords} variant="chips" className="cr-mskill__kw" />}
    </div>
  )
}

function LanguageGrid({ s }: { s: SectionView }) {
  return (
    <div className="cr-langs">
      {s.entries.map((e) => (
        <div key={e.id} className="rf-entry rf-entry--languages rf-lang cr-langs__item">
          <span className="rf-lang__name">{e.title}</span>
          {e.level > 0 ? <LevelDots level={e.level} label={e.levelLabel} className="rf-lang__level" size="0.55em" gap="0.25em" /> : null}
        </div>
      ))}
    </div>
  )
}

function ContactBlock({ basics, icons }: { basics: Basics; icons: boolean }) {
  const items = contactEntries(basics)
  return (
    <ul className={cx('cr-contact', !icons && 'cr-contact--labels')}>
      {items.map((c) => (
        <li key={c.key} className={`cr-contact__item cr-contact__item--${c.key}`}>
          {icons ? (
            <span className="cr-contact__icon" aria-hidden="true">
              <ContactIcon kind={c.key} size="0.95em" strokeWidth={2.2} />
            </span>
          ) : (
            <span className="cr-contact__label">{c.label}</span>
          )}
          {c.href ? (
            <a className="rf-link cr-contact__text" href={c.href} target="_blank" rel="noopener noreferrer">
              {c.value}
            </a>
          ) : (
            <span className="cr-contact__text">{c.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function Creative({ data, design, main, side }: TemplateProps) {
  const b = data.basics
  const icons = design.showIcons
  const name = displayName(b)
  const [first, last] = splitName(name)
  const photo = hasPhoto(b, design)

  const header = (
    <header className="cr-band">
      <span className="cr-shape cr-shape--disc" aria-hidden="true" />
      <span className="cr-shape cr-shape--ring" aria-hidden="true" />
      <span className="cr-shape cr-shape--dots" aria-hidden="true" />
      <div className="cr-band__media">
        {photo ? (
          <Photo basics={b} size="28mm" className="cr-photo" />
        ) : (
          <div className="cr-monogram" aria-hidden="true">
            <span>{initials(name)}</span>
          </div>
        )}
      </div>
      <div className="cr-band__text">
        <h1 className="cr-name">
          {first && <span className="cr-name__first">{first} </span>}
          <span className="cr-name__last">{last}</span>
        </h1>
        {b.title.trim() && <div className="cr-title">{b.title}</div>}
      </div>
    </header>
  )

  const mainHeading = (s: SectionView) => (
    <h2 className={cx('cr-h', !icons && 'cr-h--plain')}>
      {icons && (
        <span className="cr-h__badge" aria-hidden="true">
          <SectionIcon kind={s.kind} size="1.05em" />
        </span>
      )}
      <span className="cr-h__text">{s.title}</span>
    </h2>
  )
  const sideHeading = (title: string) => <h3 className="cr-sh">{title}</h3>

  const mainBlocks = sectionsToBlocks(main, {
    heading: mainHeading,
    summary: (s) => <RichParagraphs className="cr-summary" text={s.content} />,
    entry: (e) => {
      if (e.kind === 'skills') return <MainSkill e={e} />
      return <DefaultEntry entry={e} variant="main" keywords={e.kind === 'projects' ? 'chips' : 'inline'} />
    },
    whole: (s) => {
      if (s.kind === 'languages') return <LanguageGrid s={s} />
      if (s.kind === 'interests') return <Keywords variant="chips" className="cr-chips" items={s.entries.map(interestLabel).filter(Boolean)} />
      return undefined
    },
  })

  const sideBlocks: Block[] = []
  if (contactEntries(b).length) {
    sideBlocks.push({ key: 'contact', gap: 'section', letter: true, node: <>{sideHeading('Contact')}<ContactBlock basics={b} icons={icons} /></> })
  }
  sideBlocks.push(
    ...sectionsToBlocks(side, {
      heading: (s) => sideHeading(s.title),
      summary: (s) => <RichParagraphs className="cr-side-summary" text={s.content} />,
      entry: (e): ReactNode => {
        if (e.kind === 'skills') return <SideSkill e={e} />
        if (e.kind === 'languages') return <DefaultEntry entry={e} variant="side" level="dots" />
        return <DefaultEntry entry={e} variant="side" keywords="chips" />
      },
      whole: (s) => (s.kind === 'interests' ? <Keywords variant="chips" className="cr-chips" items={s.entries.map(interestLabel).filter(Boolean)} /> : undefined),
    }),
  )

  return (
    <PageLayout
      header={header}
      main={mainBlocks}
      side={sideBlocks}
      page={({ index, header, main, side }) => (
        <div className="cr-page">
          {index > 0 && <div className="cr-strip" aria-hidden="true" />}
          {header}
          <div className="cr-body">
            <div className="cr-main">{main}</div>
            <aside className="cr-side">{side}</aside>
          </div>
        </div>
      )}
    />
  )
}
