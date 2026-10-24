/**
 * Modern — the reference template. Two columns: an accent sidebar (photo, contact, skills,
 * languages, certifications, interests, references) and a main column (name/title header, summary,
 * experience, projects, education, publications …). Copy this folder to start a new template.
 */
import type { ReactNode } from 'react'
import {
  ContactList,
  DefaultEntry,
  Keywords,
  PageLayout,
  Photo,
  RichParagraphs,
  contactEntries,
  displayName,
  hasPhoto,
  sectionsToBlocks,
  type Block,
  type EntryView,
  type SectionView,
  type TemplateMeta,
  type TemplateProps,
} from '../shared'
import './modern.css'

export const meta: TemplateMeta = {
  id: 'modern',
  name: 'Modern',
  description: 'Bold accent sidebar for contact details and skills, with a clean, spacious main column.',
  tags: ['Modern', 'Two-column', 'Photo'],
  order: 10,
  supportsPhoto: true,
  columns: 2,
  defaultFont: 'inter',
  defaultAccent: '#4f46e5',
  sideKinds: ['skills', 'languages', 'certifications', 'interests', 'references'],
  headingCase: 'upper',
  gaps: { entry: 11, section: 20 },
}

const mainHeading = (s: SectionView) => (
  <h2 className="mo-h">
    <span>{s.title}</span>
  </h2>
)

const sideHeading = (s: SectionView | string) => <h3 className="mo-sh">{typeof s === 'string' ? s : s.title}</h3>

function sideEntry(e: EntryView): ReactNode {
  switch (e.kind) {
    case 'skills':
      return <DefaultEntry entry={e} variant="side" level="bar" />
    case 'languages':
      return <DefaultEntry entry={e} variant="side" level="dots" />
    default:
      return <DefaultEntry entry={e} variant="side" />
  }
}

export default function Modern({ data, design, main, side }: TemplateProps) {
  const b = data.basics

  const header = (
    <header className="mo-header">
      <h1 className="mo-name">{displayName(b)}</h1>
      {b.title.trim() && <div className="mo-title">{b.title}</div>}
      <div className="mo-rule" />
    </header>
  )

  const mainBlocks = sectionsToBlocks(main, {
    heading: mainHeading,
    summary: (s) => <RichParagraphs className="mo-summary" text={s.content} />,
    entry: (e) => <DefaultEntry entry={e} variant="main" />,
  })

  const sideBlocks: Block[] = []
  if (hasPhoto(b, design)) {
    sideBlocks.push({ key: 'photo', gap: 'section', letter: true, node: <Photo basics={b} size="31mm" className="mo-photo" /> })
  }
  if (contactEntries(b).length) {
    sideBlocks.push({ key: 'contact', gap: 'section', letter: true, node: <>{sideHeading('Contact')}<ContactList basics={b} layout="stack" className="mo-contact" /></> })
  }
  sideBlocks.push(
    ...sectionsToBlocks(side, {
      heading: sideHeading,
      summary: (s) => <RichParagraphs className="mo-side-summary" text={s.content} />,
      entry: sideEntry,
      // interests read best as a chip cloud → one block for the whole section
      whole: (s) => (s.kind === 'interests' ? <Keywords variant="chips" className="mo-chips" items={s.entries.map((e) => (e.keywords.length ? `${e.title} (${e.keywords.join(', ')})` : e.title)).filter(Boolean)} /> : undefined),
    }),
  )

  return (
    <PageLayout
      header={header}
      main={mainBlocks}
      side={sideBlocks}
      page={({ header, main, side }) => (
        <div className="mo-page">
          <aside className="mo-side">{side}</aside>
          <div className="mo-main">
            {header}
            {main}
          </div>
        </div>
      )}
    />
  )
}
