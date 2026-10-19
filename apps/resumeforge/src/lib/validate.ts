import { sanitizeUrl } from './markdown.ts'

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
export const isPhone = (s: string) => {
  const digits = s.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 && /^[+\d][\d\s().-]*$/.test(s.trim())
}
export const isUrl = (s: string) => {
  const href = sanitizeUrl(s)
  return !!href && /^https?:\/\//i.test(href)
}

/** Returns an error message for a contact/link field, or null when fine or empty. */
export function fieldError(kind: 'email' | 'phone' | 'url' | 'linkedin' | 'github', value: string): string | null {
  const v = value.trim()
  if (!v) return null
  switch (kind) {
    case 'email':
      return isEmail(v) ? null : 'Enter a valid email, e.g. name@example.com'
    case 'phone':
      return isPhone(v) ? null : 'Use digits with an optional +country code'
    case 'url':
      return isUrl(v) ? null : 'Enter a valid link, e.g. yourname.dev'
    case 'linkedin':
      return !isUrl(v) ? 'Enter a valid link, e.g. linkedin.com/in/you' : /linkedin\.com\//i.test(v) ? null : 'This doesn’t look like a LinkedIn URL'
    case 'github':
      return !isUrl(v) ? 'Enter a valid link, e.g. github.com/you' : /github\.com\//i.test(v) ? null : 'This doesn’t look like a GitHub URL'
  }
}

/** Display form of a link: no scheme, no trailing slash. */
export const prettyUrl = (s: string) =>
  s
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/$/, '')
