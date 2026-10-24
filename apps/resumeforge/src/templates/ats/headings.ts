/**
 * Standard section headings for the ATS-Plain template. Applicant tracking systems split a resume
 * into fields by looking for well-known headings ("Experience", "Education", "Skills" …). A creative
 * title such as "Open source" or "Where I've worked" can make a parser miss a whole section, so the
 * template keeps the user's title only when it already contains a standard term for that kind and
 * otherwise prints the standard heading. Custom sections always keep their own title.
 * Pure (no React) so it can be unit-tested from Node.
 */
import type { SectionKind } from '../../lib/types.ts'

type StandardKind = Exclude<SectionKind, 'custom'>

export const ATS_HEADINGS: Record<StandardKind, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
  languages: 'Languages',
  awards: 'Awards',
  publications: 'Publications',
  volunteering: 'Volunteer Experience',
  references: 'References',
  interests: 'Interests',
}

/** Terms ATS parsers associate with each kind (matched as whole words, case-insensitive). */
const RECOGNISED: Record<StandardKind, RegExp> = {
  summary: /\b(summary|profile|objective|about me|overview)\b/i,
  experience: /\b(experience|employment|work history|career history|professional history)\b/i,
  education: /\b(education|academics?|academic background|qualifications?)\b/i,
  projects: /\bprojects?\b/i,
  skills: /\b(skills?|competenc(y|ies)|expertise|technologies|tech stack|toolkit)\b/i,
  certifications: /\b(certifications?|certificates?|licen[cs]es?|credentials?)\b/i,
  languages: /\blanguages?\b/i,
  awards: /\b(awards?|honou?rs?|achievements?|recognition)\b/i,
  publications: /\b(publications?|papers?)\b/i,
  volunteering: /\b(volunteer(ing)?|community service|non-?profit)\b/i,
  references: /\breferences?\b/i,
  interests: /\b(interests?|hobbies|activities)\b/i,
}

/** The heading to print for a section in the ATS template. */
export function atsHeading(kind: SectionKind, title: string): string {
  const t = title.trim()
  if (kind === 'custom') return t || 'Additional Information'
  return t && RECOGNISED[kind].test(t) ? t : ATS_HEADINGS[kind]
}
