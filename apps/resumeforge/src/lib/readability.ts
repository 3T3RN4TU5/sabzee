/** Flesch reading-ease with a classic heuristic syllable counter. */

export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const groups = w.match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

export function words(text: string): string[] {
  return text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|\d+(?:[.,]\d+)*%?/g) ?? []
}

export interface Readability {
  /** Clamped to 0–100 for display. */
  score: number
  /** Unclamped Flesch value. */
  raw: number
  words: number
  sentences: number
  syllables: number
  label: string
}

/**
 * @param sentences each item is treated as at least one sentence (resume bullets rarely end with a period)
 */
export function fleschReadingEase(sentences: string[]): Readability {
  let sentenceCount = 0
  let wordCount = 0
  let syllableCount = 0
  for (const s of sentences) {
    const ws = words(s)
    if (!ws.length) continue
    sentenceCount += Math.max(1, (s.match(/(?<![.!?])[.!?]+(\s|$)/g) ?? []).length)
    wordCount += ws.length
    syllableCount += ws.reduce((n, w) => n + (/^\d/.test(w) ? 1 : countSyllables(w)), 0)
  }
  if (!wordCount) return { score: 0, raw: 0, words: 0, sentences: 0, syllables: 0, label: 'No text yet' }
  const raw = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)
  const score = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10
  return { score, raw: Math.round(raw * 100) / 100, words: wordCount, sentences: sentenceCount, syllables: syllableCount, label: readabilityLabel(score) }
}

export function readabilityLabel(score: number): string {
  if (score >= 60) return 'Plain English'
  if (score >= 45) return 'Clear & professional'
  if (score >= 30) return 'Technical'
  return 'Dense'
}
