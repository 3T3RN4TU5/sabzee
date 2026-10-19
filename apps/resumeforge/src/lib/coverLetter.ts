/** Cover-letter starters and text export. */
import { formatLongDate } from './dates.ts'
import { inlineToPlain } from './markdown.ts'
import type { CoverLetter, ResumeData } from './types.ts'

export interface LetterStarter {
  id: 'formal' | 'story' | 'switch'
  name: string
  description: string
}

export const LETTER_STARTERS: LetterStarter[] = [
  { id: 'formal', name: 'Classic formal', description: 'Three tight paragraphs: why this role, proof, close.' },
  { id: 'story', name: 'Impact story', description: 'Opens with a concrete win, then connects it to their needs.' },
  { id: 'switch', name: 'Career change / fresher', description: 'Leads with transferable skills and motivation.' },
]

function facts(data: ResumeData) {
  const exp = data.sections.find((s) => s.kind === 'experience' && !s.hidden)?.items[0]
  const skills = data.sections
    .filter((s) => s.kind === 'skills' && !s.hidden)
    .flatMap((s) => s.items.flatMap((e) => e.keywords))
    .slice(0, 4)
  const bullet = exp?.bullets.find((b) => /\d/.test(b)) ?? exp?.bullets[0] ?? ''
  return {
    title: data.basics.title || 'professional',
    company: exp?.subtitle || 'my current team',
    role: exp?.title || data.basics.title || 'my current role',
    skills: skills.length ? skills.join(', ') : '[your top skills]',
    win: inlineToPlain(bullet).replace(/\.$/, '') || '[a measurable achievement]',
  }
}

export function starterLetter(id: LetterStarter['id'], data: ResumeData, letter: CoverLetter): Pick<CoverLetter, 'greeting' | 'body' | 'closing'> {
  const f = facts(data)
  const company = letter.company || '[Company]'
  const role = letter.role || '[Role]'
  const greeting = letter.recipient ? `Dear ${letter.recipient},` : 'Dear Hiring Manager,'
  if (id === 'story') {
    return {
      greeting,
      closing: 'Best regards,',
      body: [
        `At ${f.company}, I ${f.win.charAt(0).toLowerCase()}${f.win.slice(1)}. Results like that are what I want to bring to ${company} as your next **${role}**.`,
        `Your team is tackling [a challenge from the job description]. In my work as a ${f.role} I have used ${f.skills} to solve similar problems — shipping quickly, measuring impact and iterating with stakeholders.`,
        `What draws me to ${company} is [something specific about the product, mission or team]. I would bring the same ownership, curiosity and bias for measurable outcomes.`,
        `I would love to talk about how I can help ${company} reach its goals this year. Thank you for your time and consideration.`,
      ].join('\n\n'),
    }
  }
  if (id === 'switch') {
    return {
      greeting,
      closing: 'Sincerely,',
      body: [
        `I am excited to apply for the **${role}** position at ${company}. Although my background is as a ${f.title}, the skills at the heart of this role — [skill 1], [skill 2] and clear communication — are ones I have practised every day.`,
        `Most recently I ${f.win.charAt(0).toLowerCase()}${f.win.slice(1)}. Along the way I built a strong foundation in ${f.skills}, and I have been deepening it through [course, certification or project].`,
        `I learn fast, take feedback seriously and care about doing work that matters to users. I would welcome the chance to grow with ${company} and contribute from day one.`,
        'Thank you for considering my application. I look forward to the opportunity to discuss it further.',
      ].join('\n\n'),
    }
  }
  return {
    greeting,
    closing: 'Sincerely,',
    body: [
      `I am writing to apply for the **${role}** position at ${company}. As a ${f.title} with hands-on experience in ${f.skills}, I am confident I can contribute to your team quickly.`,
      `In my role as ${f.role} at ${f.company}, I ${f.win.charAt(0).toLowerCase()}${f.win.slice(1)}. I enjoy owning problems end to end, working closely with cross-functional partners and measuring the results of my work.`,
      `I would welcome the opportunity to discuss how my experience aligns with ${company}'s goals. Thank you for your time and consideration.`,
    ].join('\n\n'),
  }
}

export function letterParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function letterToText(letter: CoverLetter, data: ResumeData): string {
  const b = data.basics
  const lines = [
    b.name,
    [b.email, b.phone, b.location].filter(Boolean).join(' | '),
    '',
    letter.date ? formatLongDate(letter.date) : '',
    [letter.recipient, letter.recipientTitle, letter.company, letter.address].filter(Boolean).join('\n'),
    '',
    letter.greeting || 'Dear Hiring Manager,',
    '',
    letterParagraphs(letter.body)
      .map((p) => inlineToPlain(p, true))
      .join('\n\n'),
    '',
    letter.closing || 'Sincerely,',
    letter.signature || b.name,
  ]
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}
