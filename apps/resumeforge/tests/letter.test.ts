import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { joinList, letterSkills, letterToText, starterLetter } from '../src/lib/coverLetter.ts'
import {
  CLOSINGS,
  greetingOptions,
  hasFillableTokens,
  isLetterLayout,
  LETTER_LAYOUTS,
  letterPlaceholders,
  letterReport,
  replaceLetterTokens,
  todayIso,
} from '../src/lib/letterTools.ts'
import { emptyCoverLetter } from '../src/lib/normalize.ts'
import { developerSample } from '../src/lib/samples.ts'
import type { CoverLetter } from '../src/lib/types.ts'

const letter = (patch: Partial<CoverLetter> = {}): CoverLetter => ({ ...emptyCoverLetter, ...patch })

describe('letter layouts', () => {
  it('has three layouts and a guard', () => {
    assert.deepEqual(
      LETTER_LAYOUTS.map((l) => l.id),
      ['classic', 'accent', 'minimal'],
    )
    assert.equal(isLetterLayout('accent'), true)
    assert.equal(isLetterLayout('fancy'), false)
    assert.equal(isLetterLayout(undefined), false)
  })
})

describe('letter tokens & placeholders', () => {
  it('finds placeholders but not links', () => {
    assert.deepEqual(letterPlaceholders('Join [Company] as [Role]. See [my site](https://example.com). [Company] again.'), ['[Company]', '[Role]'])
  })

  it('replaces company / role / recipient tokens', () => {
    const body = 'Dear [Hiring Manager], I want to join [Company] as your next **[Role]** at [company name].'
    assert.equal(replaceLetterTokens(body, { company: 'Acme', role: 'Data Analyst', recipient: 'Priya Sharma' }), 'Dear Priya Sharma, I want to join Acme as your next **Data Analyst** at Acme.')
    assert.equal(replaceLetterTokens(body, { company: '  ' }), body)
    assert.equal(hasFillableTokens(body, { role: 'X' }), true)
    assert.equal(hasFillableTokens('No tokens', { role: 'X' }), false)
  })

  it('a starter letter with company/role filled has no company/role placeholders', () => {
    const data = developerSample()
    const l = letter({ company: 'Lumen Health', role: 'Senior Frontend Engineer' })
    const s = starterLetter('formal', data, l)
    const body = s.body
    assert.ok(body.includes('Lumen Health'))
    assert.ok(!letterPlaceholders(body).includes('[Company]'))
  })
})

describe('starter letter skills', () => {
  it('joins skills with "and" and prefers ones the job description asks for', () => {
    assert.equal(joinList(['a']), 'a')
    assert.equal(joinList(['a', 'b', 'c']), 'a, b and c')
    const data = developerSample()
    const jd = 'Requirements\n- PostgreSQL and Docker in production\n- Strong PostgreSQL skills'
    const skills = letterSkills(data, jd)
    assert.ok(skills.length <= 4)
    assert.equal(skills[0], 'PostgreSQL')
    const body = starterLetter('formal', data, letter({ company: 'Acme', role: 'Engineer' }), jd).body
    assert.match(body, /experience in PostgreSQL(, [^,.]+)* and [^,.]+, I am/)
  })
})

describe('letter report', () => {
  it('flags an empty letter', () => {
    const r = letterReport(letter())
    assert.equal(r.words, 0)
    assert.equal(r.minutes, 0)
    assert.equal(r.checks.find((c) => c.id === 'length')!.ok, false)
    assert.equal(r.checks.find((c) => c.id === 'company')!.ok, false)
  })

  it('passes a complete, personalised letter', () => {
    const para = 'I led a team that cut checkout time by 35% for 2M users at Finlytics, and I want to bring that focus to Lumen Health as a Senior Frontend Engineer working on accessible patient tools every single day, with the same care for quality and speed.'
    const body = [para, para, para, para, para].join('\n\n')
    const r = letterReport(letter({ company: 'Lumen Health', role: 'Senior Frontend Engineer', greeting: 'Dear Priya Sharma,', body }))
    assert.equal(r.paragraphs, 5)
    for (const c of r.checks) assert.ok(c.ok, `${c.id}: ${c.detail ?? ''}`)
    assert.ok(r.minutes >= 1)
  })

  it('detects generic greetings and leftover placeholders', () => {
    const r = letterReport(letter({ greeting: 'To whom it may concern,', body: 'Hello [Company] team.' }))
    assert.equal(r.checks.find((c) => c.id === 'greeting')!.ok, false)
    assert.deepEqual(r.placeholders, ['[Company]'])
  })
})

describe('letter utilities', () => {
  it('formats today as an ISO date', () => {
    assert.equal(todayIso(new Date(2026, 0, 5)), '2026-01-05')
  })

  it('offers personalised greetings and closings', () => {
    assert.deepEqual(greetingOptions({ recipient: 'Priya Sharma', company: 'Acme' }), ['Dear Priya Sharma,', 'Dear Acme team,', 'Dear Hiring Manager,'])
    assert.deepEqual(greetingOptions({ recipient: '', company: '' }), ['Dear Hiring Manager,'])
    assert.ok(CLOSINGS.includes('Sincerely,'))
  })

  it('letterToText exports a plain-text letter', () => {
    const data = developerSample()
    const txt = letterToText(letter({ company: 'Acme', date: '2026-03-04', greeting: 'Dear Priya,', body: 'Hello **there**.\n\nSecond.' }), data)
    assert.ok(txt.startsWith('Aarav Mehta\n'))
    assert.ok(txt.includes('4 March 2026'))
    assert.ok(txt.includes('Hello there.'))
    assert.ok(!txt.includes('**'))
  })
})
