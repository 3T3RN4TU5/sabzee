/**
 * Presentation helpers for the ATS checker (lib/analysis.ts): grouping, plain-English explanations
 * per rule, a pass/fail checklist and reading the current text behind an issue's target.
 */
import type { Analysis, Category, Issue, Severity, Target } from './analysis.ts'
import type { Basics, ResumeData } from './types.ts'

export const SEVERITY_ORDER: Severity[] = ['error', 'warning', 'info']
export const CATEGORY_ORDER: Category[] = ['Contact', 'Content', 'Impact', 'Language', 'Format']

export const SEVERITY_LABEL: Record<Severity, { one: string; many: string }> = {
  error: { one: 'Critical', many: 'Critical' },
  warning: { one: 'Warning', many: 'Warnings' },
  info: { one: 'Tip', many: 'Tips' },
}

export interface IssueGroup {
  key: string
  label: string
  issues: Issue[]
}

/** Group issues by severity (critical → tips) or by category; empty groups are dropped. */
export function groupIssues(issues: Issue[], by: 'severity' | 'category'): IssueGroup[] {
  if (by === 'severity') {
    return SEVERITY_ORDER.map((s) => ({ key: s, label: SEVERITY_LABEL[s].many, issues: issues.filter((i) => i.severity === s) })).filter((g) => g.issues.length)
  }
  const sev = (i: Issue) => SEVERITY_ORDER.indexOf(i.severity)
  return CATEGORY_ORDER.map((c) => ({
    key: c,
    label: c,
    issues: issues.filter((i) => i.category === c).sort((a, b) => sev(a) - sev(b)),
  })).filter((g) => g.issues.length)
}

export function severityCounts(issues: Issue[]): Record<Severity, number> {
  const out: Record<Severity, number> = { error: 0, warning: 0, info: 0 }
  for (const i of issues) out[i.severity]++
  return out
}

/** Why each rule matters — shown under the issue. */
export const RULE_HELP: Record<string, string> = {
  'contact-name': 'Recruiters and ATS parsers expect your name and the title you are targeting at the very top.',
  'contact-email': 'An unreadable email means a recruiter cannot reply — use a simple, professional address.',
  'contact-phone': 'Many recruiters call first. Include the country code if you apply abroad.',
  'contact-location': 'ATS searches are often filtered by city or country; “Remote” is fine too.',
  'contact-links': 'A LinkedIn, GitHub or portfolio link lets reviewers verify your work in one click.',
  'contact-link-invalid': 'Broken links look careless and are dropped by parsers.',
  'summary-missing': 'A short summary tells a skimming recruiter who you are and what you want in seconds.',
  'summary-length': 'Too short says little; too long gets skipped. Two to four sentences is the sweet spot.',
  'experience-missing': 'Experience is the section recruiters read first — internships, freelance and open source all count.',
  'skills-few': 'ATS ranking leans heavily on skill keywords. List the tools you can actually discuss in an interview.',
  'education-missing': 'Most job filters check for a degree or equivalent training.',
  'weak-verb': 'Weak openers describe duties, not results. A strong verb shows what you actually did.',
  'no-action-verb': 'Bullets that open with an action verb are faster to scan and sound more confident.',
  passive: 'Passive voice hides who did the work. Make yourself the subject of the sentence.',
  'bullet-short': 'A bullet this short rarely shows impact — add the context and the result.',
  'bullet-long': 'Long bullets wrap to three lines and get skimmed. Split them or cut filler words.',
  pronoun: 'Resumes are written in implied first person — “Built…”, not “I built…”.',
  placeholder: 'Leftover template brackets are an instant red flag for recruiters.',
  'repeated-verb': 'Repeating the same verb makes different achievements blur together.',
  'tense-past': 'Past roles are described in the past tense; only your current role uses the present tense.',
  'tense-mixed': 'Switching tenses inside one role reads as careless editing.',
  'no-metrics': 'Numbers (%, money, users, time saved) are the fastest proof of impact.',
  'no-bullets': 'A role without achievements leaves the recruiter guessing what you did there.',
  'too-many-bullets': 'Long lists dilute your best work. Keep the four to six strongest results.',
  buzzword: 'Clichés are ignored by recruiters. Show the quality with a concrete achievement instead.',
  spelling: 'Typos and wrong tech-term casing (e.g. “Javascript”) signal low attention to detail.',
  'date-missing': 'ATS systems calculate your years of experience from dates — missing dates can rank you lower.',
  'date-end': 'Without an end date it is unclear whether you still work there.',
  'date-reversed': 'An end date before the start date confuses both people and parsers.',
  'link-invalid': 'Broken links look careless and are dropped by parsers.',
  pages: 'Most recruiters spend under a minute per resume — keep it to one or two focused pages.',
  'too-short': 'Very short resumes rarely contain enough keywords to rank in an ATS search.',
  readability: 'Dense, long sentences are hard to skim. Prefer short sentences and plain words.',
}

export type CheckStatus = 'pass' | 'fail' | 'skip'

export interface CheckDef {
  id: string
  label: string
  category: Category
  rules: string[]
  /** Not applicable until the resume has bullets. */
  needsBullets?: boolean
}

export const CHECKS: CheckDef[] = [
  { id: 'name', label: 'Name and target job title', category: 'Contact', rules: ['contact-name'] },
  { id: 'email', label: 'Valid email address', category: 'Contact', rules: ['contact-email'] },
  { id: 'phone', label: 'Phone number', category: 'Contact', rules: ['contact-phone'] },
  { id: 'location', label: 'Location', category: 'Contact', rules: ['contact-location'] },
  { id: 'links', label: 'Working profile links', category: 'Contact', rules: ['contact-links', 'contact-link-invalid', 'link-invalid'] },
  { id: 'summary', label: 'Summary of 25–90 words', category: 'Content', rules: ['summary-missing', 'summary-length'] },
  { id: 'experience', label: 'Experience with achievements', category: 'Content', rules: ['experience-missing', 'no-bullets'] },
  { id: 'skills', label: 'At least 6 skills', category: 'Content', rules: ['skills-few'] },
  { id: 'education', label: 'Education', category: 'Content', rules: ['education-missing'] },
  { id: 'placeholders', label: 'No leftover [placeholders]', category: 'Content', rules: ['placeholder'], needsBullets: true },
  { id: 'verbs', label: 'Strong, varied action verbs', category: 'Impact', rules: ['weak-verb', 'no-action-verb', 'repeated-verb'], needsBullets: true },
  { id: 'metrics', label: 'Quantified achievements', category: 'Impact', rules: ['no-metrics'], needsBullets: true },
  { id: 'voice', label: 'Active voice, no “I / my”', category: 'Language', rules: ['passive', 'pronoun'], needsBullets: true },
  { id: 'tense', label: 'Consistent verb tense', category: 'Language', rules: ['tense-past', 'tense-mixed'], needsBullets: true },
  { id: 'cliches', label: 'No clichés or buzzwords', category: 'Language', rules: ['buzzword'] },
  { id: 'spelling', label: 'Spelling & tech-term casing', category: 'Language', rules: ['spelling'] },
  { id: 'bullet-length', label: 'Bullets of 5–32 words', category: 'Format', rules: ['bullet-short', 'bullet-long', 'too-many-bullets'], needsBullets: true },
  { id: 'dates', label: 'Complete, valid dates', category: 'Format', rules: ['date-missing', 'date-end', 'date-reversed'] },
  { id: 'length', label: 'Right length (pages & words)', category: 'Format', rules: ['pages', 'too-short'] },
  { id: 'readability', label: 'Readable sentences', category: 'Format', rules: ['readability'], needsBullets: true },
]

export interface CheckResult extends CheckDef {
  status: CheckStatus
  /** Number of issues raised by this check's rules. */
  count: number
}

/** Every check with its status. Checks about bullets are skipped while the resume has none. */
export function checklist(a: Pick<Analysis, 'issues' | 'stats'>): CheckResult[] {
  return CHECKS.map((c) => {
    const count = a.issues.filter((i) => c.rules.includes(i.rule)).length
    const status: CheckStatus = count ? 'fail' : c.needsBullets && a.stats.bullets === 0 ? 'skip' : 'pass'
    return { ...c, status, count }
  })
}

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'low'

export function scoreBand(score: number): ScoreBand {
  return score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'low'
}

const BASICS_FIELDS: (keyof Basics)[] = ['name', 'title', 'email', 'phone', 'location', 'website', 'linkedin', 'github']

/**
 * Current text behind a target (bullet, summary, entry text field or basics field), or null when
 * the target does not point at a single editable string.
 */
export function textAt(data: ResumeData, t: Target | undefined): string | null {
  if (!t) return null
  if (!t.sectionId) return t.field && (BASICS_FIELDS as string[]).includes(t.field) ? data.basics[t.field as keyof Basics] : null
  const s = data.sections.find((x) => x.id === t.sectionId)
  if (!s) return null
  if (!t.entryId) return t.field === 'content' ? s.content : t.field === 'title' ? s.title : null
  const e = s.items.find((x) => x.id === t.entryId)
  if (!e || !t.field) return null
  if (t.field === 'bullets') return t.bullet !== undefined && t.bullet < e.bullets.length ? e.bullets[t.bullet] : null
  const v = (e as unknown as Record<string, unknown>)[t.field]
  return typeof v === 'string' ? v : null
}
