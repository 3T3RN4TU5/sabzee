/**
 * Job-match helpers on top of lib/keywords.ts: keyword grouping & importance, where to add a missing
 * keyword (and a target to jump to), "add to skills", years-of-experience comparison, company/role
 * detection for cover-letter autofill and a demo job description.
 */
import type { TermCategory } from './dictionaries.ts'
import type { MatchResult } from './keywords.ts'
import type { FieldTarget } from './target.ts'
import type { ResumeData, SectionKind } from './types.ts'

export type MatchRow = MatchResult['keywords'][number]
export type KeywordGroupId = 'technical' | 'tools' | 'methods' | 'soft' | 'domain' | 'certifications' | 'phrases'

export const KEYWORD_GROUPS: { id: KeywordGroupId; label: string }[] = [
  { id: 'technical', label: 'Technical skills' },
  { id: 'tools', label: 'Tools & platforms' },
  { id: 'methods', label: 'Methods' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'soft', label: 'Soft skills' },
  { id: 'domain', label: 'Domain' },
  { id: 'phrases', label: 'Key phrases' },
]

const GROUP_OF: Record<TermCategory | 'phrase', KeywordGroupId> = {
  language: 'technical',
  frontend: 'technical',
  backend: 'technical',
  database: 'technical',
  mobile: 'technical',
  data: 'technical',
  ml: 'technical',
  security: 'technical',
  testing: 'technical',
  cloud: 'tools',
  devops: 'tools',
  tool: 'tools',
  design: 'tools',
  methodology: 'methods',
  soft: 'soft',
  business: 'domain',
  certification: 'certifications',
  phrase: 'phrases',
}

export function keywordGroup(row: Pick<MatchRow, 'category'>): KeywordGroupId {
  return GROUP_OF[row.category] ?? 'phrases'
}

export function groupKeywords<T extends Pick<MatchRow, 'category'>>(rows: T[]): { id: KeywordGroupId; label: string; rows: T[] }[] {
  return KEYWORD_GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => keywordGroup(r) === g.id) })).filter((g) => g.rows.length)
}

export type Importance = 'must' | 'high' | 'normal'

export const IMPORTANCE_LABEL: Record<Importance, string> = { must: 'Must-have', high: 'Important', normal: 'Mentioned' }

/** Must-have = appears on a requirements line; important = repeated / heavily weighted. */
export function importance(row: Pick<MatchRow, 'required' | 'weight'>): Importance {
  if (row.required) return 'must'
  return row.weight >= 6 ? 'high' : 'normal'
}

const IMPORTANCE_RANK: Record<Importance, number> = { must: 0, high: 1, normal: 2 }

/** Missing keywords, most important first. */
export function missingByPriority<T extends MatchRow>(rows: T[]): T[] {
  return rows.filter((r) => !r.matched).sort((a, b) => IMPORTANCE_RANK[importance(a)] - IMPORTANCE_RANK[importance(b)] || b.weight - a.weight || a.label.localeCompare(b.label))
}

/** Can this keyword sensibly be listed in a Skills section? */
export function isSkillKeyword(row: Pick<MatchRow, 'category' | 'source'>): boolean {
  const g = GROUP_OF[row.category]
  return row.source === 'dictionary' && (g === 'technical' || g === 'tools' || g === 'methods')
}

export interface Placement {
  /** Section label shown on the jump button ("Skills", "Experience" …). */
  label: string
  /** Where to jump; absent when the section does not exist yet. */
  target?: FieldTarget
  /** Section kind to create when `target` is absent. */
  addKind?: SectionKind
}

const visibleOfKind = (data: ResumeData, kind: SectionKind) => data.sections.find((s) => s.kind === kind && !s.hidden) ?? data.sections.find((s) => s.kind === kind)

function sectionPlacement(data: ResumeData, kind: SectionKind, label: string, field?: 'keywords' | 'bullets'): Placement {
  const s = visibleOfKind(data, kind)
  if (!s) return { label, addKind: kind }
  if (kind === 'summary') return { label, target: { sectionId: s.id, field: 'content' } }
  const e = s.items[0]
  if (!e) return { label, target: { sectionId: s.id } }
  return { label, target: field ? { sectionId: s.id, entryId: e.id, field } : { sectionId: s.id, entryId: e.id } }
}

/** Where a missing keyword belongs, with a focus target for the editor. */
export function placementFor(row: Pick<MatchRow, 'category' | 'source'>, data: ResumeData): Placement {
  const g = GROUP_OF[row.category]
  if (g === 'certifications') return sectionPlacement(data, 'certifications', 'Certifications')
  if (g === 'technical' || g === 'tools') {
    const pick = pickSkillsEntry(data, row.category === 'phrase' ? null : row.category)
    if (pick) return { label: 'Skills', target: { sectionId: pick.sectionId, entryId: pick.entryId, field: 'keywords' } }
    return sectionPlacement(data, 'skills', 'Skills', 'keywords')
  }
  if (g === 'soft' || g === 'methods') {
    const exp = sectionPlacement(data, 'experience', 'Experience', 'bullets')
    return exp.target ? exp : sectionPlacement(data, 'summary', 'Summary')
  }
  return sectionPlacement(data, 'summary', 'Summary')
}

const ENTRY_HINTS: Partial<Record<TermCategory, RegExp>> = {
  language: /lang|program|code/i,
  frontend: /front|web|ui\b|client/i,
  backend: /back|server|api|platform/i,
  database: /data|db|storage|back/i,
  cloud: /cloud|devops|infra|platform|tool/i,
  devops: /devops|infra|cloud|tool|platform/i,
  testing: /test|qa|quality|tool/i,
  mobile: /mobile|app|android|ios/i,
  data: /data|analytic|ml|ai\b/i,
  ml: /ml|machine|ai\b|data|model/i,
  design: /design|ui|ux|tool/i,
  tool: /tool|other|platform/i,
  security: /secur|infra|devops/i,
  methodology: /method|practice|process|other|tool/i,
}

/** The skills entry a keyword of `category` fits best (by entry title), else the last skills entry. */
export function pickSkillsEntry(data: ResumeData, category: TermCategory | null): { sectionId: string; entryId: string } | null {
  const sections = data.sections.filter((s) => s.kind === 'skills')
  const s = sections.find((x) => !x.hidden && x.items.length) ?? sections.find((x) => x.items.length)
  if (!s) return null
  const hint = category ? ENTRY_HINTS[category] : undefined
  const e = (hint && s.items.find((x) => hint.test(x.title))) || s.items.find((x) => /tool|other|misc/i.test(x.title)) || s.items[s.items.length - 1]
  return { sectionId: s.id, entryId: e.id }
}

/** Keywords list with `label` appended (no-op when already present, case-insensitive). */
export function withKeyword(keywords: string[], label: string): string[] {
  return keywords.some((k) => k.trim().toLowerCase() === label.trim().toLowerCase()) ? keywords : [...keywords, label.trim()]
}

/** True when a keyword is just (part of) the employer's name — not something to add to a resume. */
export function isCompanyKeyword(row: Pick<MatchRow, 'label'>, company: string): boolean {
  const cw = company.toLowerCase().split(/[^\p{L}\p{N}&+#.'’-]+/u).filter(Boolean)
  const lw = row.label.toLowerCase().split(/[^\p{L}\p{N}&+#.'’-]+/u).filter(Boolean)
  if (!cw.length || !lw.length || lw.length > cw.length) return false
  // the keyword's words appear as a contiguous run of the company's words ("Lumen" / "Lumen Health")
  for (let i = 0; i + lw.length <= cw.length; i++) if (lw.every((w, k) => cw[i + k] === w)) return true
  return false
}

export type YearsStatus = 'meets' | 'close' | 'below' | 'unknown'

export function yearsStatus(required: number | null, onResume: number): YearsStatus {
  if (required === null) return 'unknown'
  if (onResume >= required) return 'meets'
  if (onResume >= required - 1) return 'close'
  return 'below'
}

export function matchLabel(score: number): string {
  if (score >= 75) return 'Strong match'
  if (score >= 55) return 'Good match'
  if (score >= 35) return 'Fair match'
  return 'Low match'
}

/* ---------------------- company / role detection ---------------------- */

const ROLE_WORD =
  /\b(engineer|developer|programmer|architect|manager|designer|analyst|scientist|lead|intern|specialist|consultant|director|coordinator|associate|officer|administrator|executive|writer|marketer|accountant|researcher|strategist|technician|head|owner|representative|recruiter|editor|teacher|nurse|sre|devops)s?\b/i
const NOT_COMPANY = /^(about|us|you|the|this|our|your|role|team|job|position|company|it|we|them|scale|least|all|work|home|night|times|once|what|who|why|how)$/i
const CAPS_NAME = String.raw`[A-Z0-9][\w&.'’-]*(?:[ \t]+(?:&[ \t]+)?[A-Z0-9][\w&.'’-]*){0,3}`

const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:|,]+|[\s\-–—:|,.!]+$/g, '')
    .trim()

function validCompany(name: string | undefined): string {
  // "Swiggy, Bangalore" / "Razorpay (Bengaluru, Hybrid)" / "Acme · Remote" → just the name
  const n = tidy((name ?? '').split(/\s*[,(|·•[]\s*|\s+[-–—]\s+/)[0])
  if (!n || n.length > 60 || NOT_COMPANY.test(n) || NOT_COMPANY.test(n.split(' ')[0]) || ROLE_WORD.test(n)) return ''
  return n
}

function validRole(role: string | undefined): string {
  const r = tidy(role ?? '').replace(/\s*\((?:m\/f\/d|f\/m\/d|all genders?)\)\s*$/i, '')
  if (!r || r.length > 80 || r.split(' ').length > 8 || !ROLE_WORD.test(r)) return ''
  return r
}

/**
 * Best-effort company and role from a pasted job description ("Senior Frontend Engineer — Acme",
 * "Company: Acme", "About Acme", "Acme is hiring a …", "We are looking for a Data Analyst to …").
 * Empty strings when nothing convincing is found.
 */
export function extractJobInfo(jd: string): { company: string; role: string } {
  const lines = jd
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s#*•\-–]+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
  let company = ''
  let role = ''
  for (const l of lines) {
    const m = /^(?:company|organi[sz]ation|employer|client)\s*[:\-–—]\s*(.+)$/i.exec(l)
    if (m && !company) company = validCompany(m[1])
    const r = /^(?:job title|title|role|position|job)\s*[:\-–—]\s*(.+)$/i.exec(l)
    if (r && !role) role = validRole(r[1])
  }
  // Title line: "Senior Frontend Engineer — Acme Corp" / "… at Acme Corp" / "Acme Corp | Senior …"
  for (const l of lines.slice(0, 4)) {
    if (role && company) break
    const parts = l.split(/\s+(?:[-–—|@·]|at)\s+/i)
    if (parts.length >= 2) {
      const [a, b] = parts
      if (validRole(a) && !validRole(b)) {
        role ||= validRole(a)
        company ||= validCompany(b)
      } else if (validRole(b) && !validRole(a)) {
        role ||= validRole(b)
        company ||= validCompany(a)
      }
    } else if (!role && l.split(' ').length <= 8 && !/[.!?]$/.test(l)) {
      role = validRole(l)
    }
  }
  const text = lines.join('\n')
  if (!company) {
    const about = new RegExp(`^About[ \\t]+(${CAPS_NAME})[ \\t]*$`, 'm').exec(text)
    company = validCompany(about?.[1])
  }
  if (!company) {
    const hiring = new RegExp(`(?:^|[.!]\\s+)(${CAPS_NAME})[ \\t]+(?:is|are)[ \\t]+(?:hiring|looking|seeking|growing|building|on a mission)`, 'm').exec(text)
    company = validCompany(hiring?.[1])
  }
  if (!company) {
    const join = new RegExp(`\\b(?:join|at)[ \\t]+(${CAPS_NAME})(?=[,.!]|\\s+(?:as|and|where|we|to|is)\\b)`).exec(text)
    company = validCompany(join?.[1])
  }
  if (!role) {
    const look = /\b(?:looking for|hiring|seeking|searching for)\s+(?:an?\s+)?((?:[A-Z][\w+#./-]*\s+){0,5}[A-Z][\w+#./-]*)/.exec(text)
    role = validRole(look?.[1])
  }
  return { company, role }
}

/** Fictional demo posting for the "Try a sample" button (works well with the developer sample). */
export const SAMPLE_JD = `Senior Frontend Engineer — Lumen Health
Bengaluru, India · Hybrid · Full-time

About Lumen Health
Lumen Health builds clinical scheduling software used by 900+ hospitals across India and Southeast Asia. Our product team ships weekly and cares deeply about accessibility and performance.

What you'll do
- Build accessible, high-performance user interfaces with React, TypeScript and Next.js
- Own features end to end: design reviews, implementation, testing and rollout
- Improve Core Web Vitals and front-end performance across the patient app
- Write unit and end-to-end tests with Jest and Playwright
- Partner with product, design and backend engineers in an Agile team
- Mentor junior engineers and lead code reviews

Requirements
- 4+ years of experience building production web applications
- Expert knowledge of React, TypeScript, HTML and modern CSS (Tailwind CSS or Sass)
- Experience with GraphQL or REST APIs and state management (Redux or Zustand)
- Experience with CI/CD pipelines, Docker and AWS
- Familiarity with accessibility standards (WCAG 2.1)
- Strong communication skills and a collaborative mindset

Nice to have
- Experience with design systems and Storybook
- Exposure to Node.js and PostgreSQL
- Healthcare or SaaS product experience
`
