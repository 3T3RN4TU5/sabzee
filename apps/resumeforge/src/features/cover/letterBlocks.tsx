/**
 * Letter body → pagination blocks for <PagedDocument letter={…}>, in one of three visual layouts
 * (classic block, modern accent, minimal). Styling: letter.css, scoped to `.rf-doc .rf-letter__*`
 * and `.rf-doc.rf-letter--<layout>`. OWNER: cover agent.
 */
import { letterParagraphs } from '../../lib/coverLetter.ts'
import { formatLongDate } from '../../lib/dates.ts'
import type { LetterLayoutId } from '../../lib/letterTools.ts'
import type { CoverLetter, ResumeData } from '../../lib/types.ts'
import { Rich, type Block } from '../../templates'

const EMPTY_HINT = 'Write your letter in the Cover letter tab — or start from one of the templates.'

/** Letter body → pagination blocks (date, recipient, subject, greeting, each paragraph, sign-off). */
export function letterBlocks(letter: CoverLetter, data: ResumeData, layout: LetterLayoutId = 'classic'): Block[] {
  const blocks: Block[] = []
  const recipient = [letter.recipient, letter.recipientTitle, letter.company, letter.address].map((s) => s.trim()).filter(Boolean)
  const date = letter.date ? formatLongDate(letter.date) : ''
  const role = letter.role.trim()
  const name = letter.signature.trim() || data.basics.name.trim() || 'Your Name'
  const title = data.basics.title.trim()
  const recipientNode = recipient.length ? (
    <address className="rf-letter__recipient">
      {recipient.map((line, i) => (
        <span key={i} className={i === 0 ? 'rf-letter__recipient-name' : undefined}>
          {line}
        </span>
      ))}
    </address>
  ) : null

  if (layout === 'accent') {
    if (date || recipientNode)
      blocks.push({
        key: 'meta',
        gap: 'section',
        node: (
          <div className="rf-letter__meta">
            {recipientNode ?? <span />}
            {date && <div className="rf-letter__date">{date}</div>}
          </div>
        ),
      })
    if (role)
      blocks.push({
        key: 'subject',
        gap: 'section',
        node: (
          <div className="rf-letter__subject">
            <span className="rf-letter__subject-label">Application for</span>
            <span className="rf-letter__subject-role">{role}</span>
          </div>
        ),
      })
  } else {
    if (date) blocks.push({ key: 'date', gap: layout === 'minimal' ? 'entry' : 'section', node: <div className="rf-letter__date">{date}</div> })
    if (recipientNode) blocks.push({ key: 'recipient', gap: 'section', node: recipientNode })
    if (role) blocks.push({ key: 'subject', gap: layout === 'minimal' ? 'entry' : 'section', node: <div className="rf-letter__subject">{layout === 'minimal' ? `Re: ${role}` : `Re: Application for ${role}`}</div> })
  }

  blocks.push({ key: 'greeting', gap: layout === 'minimal' ? 14 : 'entry', node: <div className="rf-letter__greeting">{letter.greeting.trim() || 'Dear Hiring Manager,'}</div> })

  const paragraphs = letterParagraphs(letter.body)
  if (paragraphs.length) paragraphs.forEach((p, i) => blocks.push({ key: `p${i}`, gap: layout === 'minimal' ? 14 : 'entry', node: <Rich as="p" className="rf-letter__p" text={p} /> }))
  else blocks.push({ key: 'p0', gap: 'entry', node: <p className="rf-letter__p rf-letter__p--hint">{EMPTY_HINT}</p> })

  blocks.push({
    key: 'closing',
    gap: 'none',
    node: (
      <div className="rf-letter__closing">
        <div className="rf-letter__closing-text">{letter.closing.trim() || 'Sincerely,'}</div>
        {layout === 'minimal' && (
          <div className="rf-letter__flourish" aria-hidden="true">
            {name}
          </div>
        )}
        <div className="rf-letter__signature">{name}</div>
        {layout === 'accent' && title && <div className="rf-letter__sign-title">{title}</div>}
      </div>
    ),
  })
  return blocks
}
