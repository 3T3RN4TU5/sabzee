import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyse, detectBuzzwords, detectPassive, detectSpelling, detectWeakOpener, verbTense } from '../src/lib/analysis.ts'
import { countSyllables, fleschReadingEase } from '../src/lib/readability.ts'
import { blankData, developerSample, researcherSample } from '../src/lib/samples.ts'
import type { ResumeData } from '../src/lib/types.ts'

const now = new Date('2026-10-01')

function withBullets(bullets: string[], current = false): ResumeData {
  const data = developerSample()
  const exp = data.sections.find((s) => s.kind === 'experience')!
  exp.items = [{ ...exp.items[0], current, end: current ? '' : '2025-01', bullets }]
  return data
}

describe('rule detectors', () => {
  it('detects weak openers with suggestions', () => {
    const w = detectWeakOpener('Responsible for the billing service')
    assert.equal(w?.phrase, 'Responsible for')
    assert.ok(w!.suggestions.includes('Led'))
    assert.equal(detectWeakOpener('Worked on onboarding')?.phrase, 'Worked on')
    assert.equal(detectWeakOpener('Built a dashboard'), null)
  })

  it('detects passive voice but allows achievements', () => {
    assert.equal(detectPassive('The API was designed by me'), 'was designed')
    assert.equal(detectPassive('Reports were written weekly'), 'were written')
    assert.equal(detectPassive('Was promoted to team lead'), null)
    assert.equal(detectPassive('Built a dashboard used by 10k people'), null)
  })

  it('detects buzzwords as whole phrases', () => {
    assert.deepEqual(detectBuzzwords('A results-driven team player and self-starter'), ['team player', 'results-driven', 'self-starter'])
    assert.deepEqual(detectBuzzwords('Visited a gurudwara with the dynamics team'), [])
  })

  it('flags misspellings and tech casing but ignores URLs', () => {
    const found = detectSpelling('Built Javascript apps on Nodejs; recieved praise. See github.com/me and https://x.dev/Javascript')
    assert.deepEqual(found, [
      { wrong: 'Javascript', right: 'JavaScript' },
      { wrong: 'Nodejs', right: 'Node.js' },
      { wrong: 'recieved', right: 'received' },
    ])
  })

  it('classifies verb tense', () => {
    assert.equal(verbTense('Built a thing'), 'past')
    assert.equal(verbTense('Build a thing'), 'present')
    assert.equal(verbTense('Leads the team'), 'present')
    assert.equal(verbTense('Spearheaded launch'), 'past')
    assert.equal(verbTense('The dashboard'), null)
  })
})

describe('readability', () => {
  it('counts syllables heuristically', () => {
    assert.equal(countSyllables('cat'), 1)
    assert.equal(countSyllables('table'), 2)
    assert.equal(countSyllables('engineering'), 4)
  })

  it('computes Flesch reading ease', () => {
    const r = fleschReadingEase(['The cat sat on the mat.'])
    assert.equal(r.words, 6)
    assert.equal(r.sentences, 1)
    assert.equal(r.raw, 116.15)
    assert.equal(r.score, 100)
    const dense = fleschReadingEase(['Architected multidimensional organizational transformation methodologies facilitating comprehensive interdepartmental collaboration'])
    assert.ok(dense.score < 10, String(dense.score))
  })
})

describe('resume analysis', () => {
  it('scores the polished sample highly', () => {
    const a = analyse(developerSample(), { pages: 1, now })
    assert.ok(a.score >= 85, `score ${a.score}: ${a.issues.map((i) => i.message).join(' | ')}`)
    assert.equal(a.grade, 'Excellent')
    assert.equal(a.issues.filter((i) => i.severity === 'error').length, 0)
  })

  it('scores a blank resume low with contact errors', () => {
    const a = analyse(blankData(), { now })
    assert.ok(a.score < 30, String(a.score))
    assert.ok(a.issues.some((i) => i.rule === 'contact-email' && i.severity === 'error' && i.target?.field === 'email'))
  })

  it('reports weak verbs with a jump target to the exact bullet', () => {
    const data = withBullets(['Built a payments API serving 2M requests a day', 'Responsible for code reviews across 4 teams'])
    const a = analyse(data, { now })
    const weak = a.issues.find((i) => i.rule === 'weak-verb')!
    assert.ok(weak)
    const exp = data.sections.find((s) => s.kind === 'experience')!
    assert.deepEqual(weak.target, { sectionId: exp.id, entryId: exp.items[0].id, field: 'bullets', bullet: 1 })
  })

  it('flags missing metrics, passive voice, buzzwords, pronouns and placeholders', () => {
    const a = analyse(withBullets(['Improved the onboarding flow for new customers', 'Reports were written for my manager every week', 'Acted as a team player on a [Team] project']), { now })
    const rules = new Set(a.issues.map((i) => i.rule))
    for (const r of ['no-metrics', 'passive', 'buzzword', 'pronoun', 'placeholder']) assert.ok(rules.has(r), r)
  })

  it('flags present tense in a past role', () => {
    const a = analyse(withBullets(['Build dashboards used by 40 analysts', 'Reduced costs by 20%']), { now })
    const t = a.issues.find((i) => i.rule === 'tense-past')!
    assert.ok(t)
    assert.deepEqual(t.suggestions, ['Built'])
  })

  it('flags bullet length and page count', () => {
    const long = 'Delivered '.concat(Array.from({ length: 40 }, (_, i) => `word${i}`).join(' '))
    const a = analyse(withBullets(['Shipped it', long]), { pages: 3, now })
    const rules = a.issues.map((i) => i.rule)
    assert.ok(rules.includes('bullet-short'))
    assert.ok(rules.includes('bullet-long'))
    assert.ok(rules.includes('pages'))
  })

  it('flags reversed dates and invalid links', () => {
    const data = developerSample()
    const exp = data.sections.find((s) => s.kind === 'experience')!
    exp.items[1].start = '2025-06'
    exp.items[1].end = '2024-01'
    data.basics.linkedin = 'not a link'
    const a = analyse(data, { now })
    assert.ok(a.issues.some((i) => i.rule === 'date-reversed'))
    assert.ok(a.issues.some((i) => i.rule === 'contact-link-invalid' && i.target?.field === 'linkedin'))
  })

  it('category scores add up and stay within bounds', () => {
    for (const d of [developerSample(), researcherSample(), blankData()]) {
      const a = analyse(d, { pages: 2, now })
      assert.equal(
        a.score,
        a.categories.reduce((n, c) => n + c.score, 0),
      )
      for (const c of a.categories) assert.ok(c.score >= 0 && c.score <= c.max, `${c.name} ${c.score}`)
      assert.ok(a.score >= 0 && a.score <= 100)
    }
  })
})
