/**
 * Tech — a developer-first layout: a README-style main column with monospace "## section" headings,
 * "Role @ Company" entries and GitHub-style repository cards with topic tags, plus a slim right rail
 * (links, stack chips with contribution-graph level squares, languages, certifications …).
 * DOM order is header → main → rail, so ATS parsers read the experience first.
 */
import type { ReactNode } from 'react'
import {
  Bullets,
  ContactIcon,
  ContactList,
  DefaultEntry,
  EntryLink,
  PageLayout,
  Photo,
  Rich,
  RichParagraphs,
  contactEntries,
  cx,
  displayName,
  sectionsToBlocks,
  useFont,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './tech.css'

export const meta: TemplateMeta = {
  id: 'tech',
  name: 'Tech',
  description: 'Built for developers: monospace headings, repo-style project cards with topic tags and a slim rail for your links and stack.',
  tags: ['Modern', 'Two-column', 'One-page'],
  order: 90,
  supportsPhoto: true,
  columns: 2,
  defaultFont: 'plex',
  defaultAccent: '#2563eb',
  sideKinds: ['education', 'skills', 'languages', 'certifications', 'awards', 'interests', 'references'],
  headingCase: 'normal',
  gaps: { entry: 10, section: 17 },
}

const LINK_KEYS = ['website', 'github', 'linkedin'] as const
const CONTACT_KEYS = ['email', 'phone', 'location'] as const

/** 5 small squares, filled with a contribution-graph ramp (decorative; the level is in aria-label). */
function Squares({ level, label }: { level: number; label?: string }) {
  if (!level) return null
  return (
    <span className="te-squares" role="img" aria-label={label || `${level} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cx('te-square', i < level && 'is-on')} style={i < level ? { opacity: 0.45 + (0.55 * (i + 1)) / level } : undefined} />
      ))}
    </span>
  )
}

function Chips({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null
  return (
    <div className={cx('te-chips', className)}>
      {items.map((k) => (
        <span key={k} className="te-chip">
          {k}
        </span>
      ))}
    </div>
  )
}

function RepoIcon() {
  return (
    <svg className="te-repo__icon" viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 13.5V3a1.5 1.5 0 0 1 1.5-1.5H13v10H4.5A1.5 1.5 0 0 0 3 13a1.5 1.5 0 0 0 1.5 1.5H6" />
      <path d="M8 13v2.5l1-.8 1 .8V13" />
    </svg>
  )
}

/** "Role @ Company" entries (experience, volunteering). */
function RoleEntry({ e, icons }: { e: EntryView; icons: boolean }) {
  const hasMeta = e.location || e.url
  return (
    <div className={cx('rf-entry', `rf-entry--${e.kind}`, 'rf-entry--main', 'te-role')}>
      <div className="te-role__head">
        <div className="te-role__heading">
          {e.title && <span className="rf-entry__title">{e.title}</span>}
          {e.title && e.subtitle && <span className="te-role__at"> @ </span>}
          {e.subtitle && <span className="te-role__org">{e.subtitle}</span>}
        </div>
        {e.date && <span className="te-date">{e.date}</span>}
      </div>
      {hasMeta && (
        <div className="te-role__meta">
          {e.location && (
            <span className="te-role__loc">
              {icons && <ContactIcon kind="location" size="0.95em" className="te-meta-icon" />}
              {e.location}
            </span>
          )}
          {e.url && (
            <span className="te-role__url">
              {icons && <ContactIcon kind="website" size="0.95em" className="te-meta-icon" />}
              <EntryLink entry={e} />
            </span>
          )}
        </div>
      )}
      {e.description && <Rich as="div" className="rf-entry__desc" text={e.description} />}
      <Bullets items={e.bullets} marker="arrow" />
    </div>
  )
}

/** GitHub-style repository card (projects). */
function RepoCard({ e, icons }: { e: EntryView; icons: boolean }) {
  return (
    <div className="rf-entry rf-entry--projects rf-entry--main te-repo">
      <div className="te-repo__head">
        {icons && <RepoIcon />}
        {e.href ? (
          <a className="rf-link te-repo__name" href={e.href} target="_blank" rel="noopener noreferrer">
            {e.title || e.url}
          </a>
        ) : (
          <span className="te-repo__name">{e.title}</span>
        )}
        {e.subtitle && <span className="te-repo__badge">{e.subtitle}</span>}
        {e.date && <span className="te-date te-repo__date">{e.date}</span>}
      </div>
      {e.url && e.title && <div className="te-repo__url">{e.url}</div>}
      {e.description && <Rich as="div" className="rf-entry__desc te-repo__desc" text={e.description} />}
      <Bullets items={e.bullets} marker="arrow" />
      <Chips items={e.keywords} className="te-repo__topics" />
    </div>
  )
}

function RailSkill({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--skills rf-skill te-skill">
      {(e.title || e.level > 0) && (
        <div className="te-skill__head">
          <span className="rf-skill__name te-skill__name">{e.title}</span>
          <Squares level={e.level} label={e.levelLabel} />
        </div>
      )}
      <Chips items={e.keywords} />
    </div>
  )
}

function Language({ e }: { e: EntryView }) {
  return (
    <div className="rf-entry rf-entry--languages rf-lang te-lang">
      <span className="rf-lang__name">{e.title}</span>
      {e.level > 0 && (
        <span className="te-lang__level" title={e.levelLabel}>
          <Squares level={e.level} label={e.levelLabel} />
        </span>
      )}
    </div>
  )
}

const interestChips = (s: SectionView) => s.entries.map((e) => (e.keywords.length ? `${e.title} (${e.keywords.join(', ')})` : e.title)).filter(Boolean)

export default function Tech({ data, design, main, side, headingCase }: TemplateProps) {
  // Monospace accents are the point of this template: make sure IBM Plex Mono is available whatever the pairing.
  useFont('plex')
  const b = data.basics
  const icons = design.showIcons
  const lower = design.headingCase === 'auto' // template default: lower-case, markdown-style headings
  const name = displayName(b)
  const hClass = cx(lower && 'te-lower', headingCase === 'upper' && 'te-upper')

  const header = (
    <header className="te-header">
      <div className="te-header__text">
        <h1 className="te-name">{name}</h1>
        {b.title.trim() && <div className="te-title">{b.title}</div>}
        <ContactList basics={b} include={[...CONTACT_KEYS]} className="te-contact" iconColor="var(--rf-accent-ink)" iconSize="1.05em" />
      </div>
      <Photo basics={b} size="23mm" className="te-photo" />
    </header>
  )

  const heading = (s: SectionView) => (
    <h2 className={cx('te-h', hClass)}>
      <span className="te-h__text">{s.title}</span>
    </h2>
  )
  const railHeading = (title: string) => (
    <h3 className={cx('te-rh', hClass)}>
      <span className="te-h__text">{title}</span>
    </h3>
  )

  const mainEntry = (e: EntryView): ReactNode => {
    switch (e.kind) {
      case 'experience':
      case 'volunteering':
        return <RoleEntry e={e} icons={icons} />
      case 'projects':
        return <RepoCard e={e} icons={icons} />
      case 'skills':
        return (
          <div className="te-mskill">
            <RailSkill e={e} />
          </div>
        )
      case 'languages':
        return <Language e={e} />
      default:
        return <DefaultEntry entry={e} variant="main" keywords="chips" marker="arrow" />
    }
  }

  const mainBlocks = sectionsToBlocks(main, {
    heading,
    summary: (s) => <RichParagraphs className="te-summary" text={s.content} />,
    entry: mainEntry,
    whole: (s) => (s.kind === 'interests' ? <Chips items={interestChips(s)} className="te-chips--neutral" /> : undefined),
  })

  const sideBlocks: Block[] = []
  if (contactEntries(b, [...LINK_KEYS]).length) {
    sideBlocks.push({
      key: 'links',
      gap: 'section',
      letter: true,
      node: (
        <>
          {railHeading('Links')}
          <ContactList basics={b} include={[...LINK_KEYS]} layout="stack" className="te-links" iconColor="var(--rf-accent-ink)" />
        </>
      ),
    })
  }
  sideBlocks.push(
    ...sectionsToBlocks(side, {
      heading: (s) => railHeading(s.title),
      summary: (s) => <RichParagraphs className="te-rail-summary" text={s.content} />,
      entry: (e): ReactNode => {
        if (e.kind === 'skills') return <RailSkill e={e} />
        if (e.kind === 'languages') return <Language e={e} />
        return <DefaultEntry entry={e} variant="side" keywords="chips" marker="arrow" />
      },
      whole: (s) => (s.kind === 'interests' ? <Chips items={interestChips(s)} className="te-chips--neutral" /> : undefined),
    }),
  )

  return (
    <PageLayout
      header={header}
      main={mainBlocks}
      side={sideBlocks}
      page={({ index, header, main, side }) => (
        <div className="te-page">
          <div className="te-topbar" aria-hidden="true" />
          {index > 0 && (
            <div className="te-runhead" aria-hidden="true">
              <span>{name}</span>
              <span>page {index + 1}</span>
            </div>
          )}
          {header}
          <div className="te-body">
            <div className="te-main">{main}</div>
            <aside className="te-rail">{side}</aside>
          </div>
        </div>
      )}
    />
  )
}
