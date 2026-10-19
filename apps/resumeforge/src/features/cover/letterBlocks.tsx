/** Letter body → pagination blocks. OWNER: cover agent. */
import { letterParagraphs } from '../../lib/coverLetter.ts'
import { formatLongDate } from '../../lib/dates.ts'
import type { CoverLetter, ResumeData } from '../../lib/types.ts'
import { Rich, type Block } from '../../templates'

/** Letter body → pagination blocks (date, recipient, greeting, each paragraph, closing). */
export function letterBlocks(letter: CoverLetter, data: ResumeData): Block[] {
  const blocks: Block[] = []
  const recipient = [letter.recipient, letter.recipientTitle, letter.company, letter.address].map((s) => s.trim()).filter(Boolean)
  if (letter.date) blocks.push({ key: 'date', gap: 'section', node: <div className="rf-letter__date">{formatLongDate(letter.date)}</div> })
  if (recipient.length)
    blocks.push({
      key: 'recipient',
      gap: 'section',
      node: (
        <div className="rf-letter__recipient">
          {recipient.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ),
    })
  if (letter.role.trim()) blocks.push({ key: 'subject', gap: 'section', node: <div className="rf-letter__subject">Re: {letter.role}</div> })
  blocks.push({ key: 'greeting', gap: 'entry', node: <div className="rf-letter__greeting">{letter.greeting || 'Dear Hiring Manager,'}</div> })
  const paragraphs = letterParagraphs(letter.body)
  ;(paragraphs.length ? paragraphs : ['Write your letter in the Cover letter tab — or start from one of the templates.']).forEach((p, i) =>
    blocks.push({ key: `p${i}`, gap: 'entry', node: <Rich as="p" className="rf-letter__p" text={p} /> }),
  )
  blocks.push({
    key: 'closing',
    gap: 'none',
    node: (
      <div className="rf-letter__closing">
        <div>{letter.closing || 'Sincerely,'}</div>
        <div className="rf-letter__signature">{letter.signature || data.basics.name}</div>
      </div>
    ),
  })
  return blocks
}
