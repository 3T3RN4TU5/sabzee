import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyse } from '../src/lib/analysis.ts'
import { letterSkills, letterToText, starterLetter } from '../src/lib/coverLetter.ts'
import { safeInlineLinks, toMarkdown } from '../src/lib/exportText.ts'
import { importJson } from '../src/lib/importer.ts'
import { extractJobInfo, skillsDestination } from '../src/lib/jobMatch.ts'
import { importDateValue } from '../src/lib/jsonresume.ts'
import { extractKeywords, matchResume, yearsRequired } from '../src/lib/keywords.ts'
import { MAX_PHOTO_BYTES, MAX_PHOTO_CHARS, normalizeDoc } from '../src/lib/normalize.ts'
import { gerundChainToPast, issueFixes } from '../src/lib/rewrite.ts'
import { developerSample, makeDoc } from '../src/lib/samples.ts'
import { emptyCoverLetter } from '../src/lib/normalize.ts'

const time = (fn: () => void) => {
  const t = performance.now()
  fn()
  return performance.now() - t
}
const labels = (jd: string) => extractKeywords(jd).map((k) => k.label)
const req = (jd: string) => Object.fromEntries(extractKeywords(jd).map((k) => [k.label, k.required]))

describe('ReDoS regressions', () => {
  it('yearsRequired stays linear on long whitespace runs', () => {
    assert.ok(time(() => yearsRequired(`1${' '.repeat(5000)}`)) < 50)
    assert.ok(time(() => yearsRequired(`Step 2${'\n  '.repeat(3000)}Apply`)) < 50)
  })
  it('yearsRequired still reads the usual shapes', () => {
    assert.equal(yearsRequired('5+ years of experience'), 5)
    assert.equal(yearsRequired('3-5 years building APIs'), 3)
    assert.equal(yearsRequired('2 to 4 years'), 2)
    assert.equal(yearsRequired('2025 years'), null)
  })
  it('job-description parsing handles 20k-char pathological input quickly', () => {
    const data = developerSample()
    for (const s of [' '.repeat(20000), '\t'.repeat(20000) + 'x', 'A'.repeat(20000), '.'.repeat(20000) + 'a', ' - '.repeat(7000), '@'.repeat(20000)]) {
      assert.ok(time(() => extractJobInfo(s)) < 200, JSON.stringify(s.slice(0, 5)))
      assert.ok(time(() => matchResume(data, s)) < 1000, JSON.stringify(s.slice(0, 5)))
    }
  })
})

describe('weak-opener rewrites', () => {
  const fixes = (t: string) => issueFixes({ rule: 'weak-verb', suggestions: analyse(withBullet(t)).issues.find((i) => i.rule === 'weak-verb')?.suggestions ?? [] }, t)
  const withBullet = (b: string) => {
    const d = developerSample()
    d.sections.find((s) => s.kind === 'experience')!.items[0].bullets = [b]
    return d
  }
  it('"Worked with" is its own opener with copy-only suggestions', () => {
    const f = fixes('Worked with designers on UX')
    assert.deepEqual(f.map((x) => x.label), ['Partnered with', 'Collaborated with'])
    assert.ok(f.every((x) => x.value === null))
    assert.ok(analyse(withBullet('Worked with designers on UX')).issues.some((i) => i.message.includes('Worked with')))
  })
  it('converts every gerund in a chain', () => {
    assert.deepEqual(fixes('Responsible for planning and executing launches'), [{ label: 'Planned', value: 'Planned and executed launches' }])
    assert.equal(gerundChainToPast('designing, building and testing the API'), 'designed, built and tested the API')
    assert.equal(gerundChainToPast('migrate and test services'), 'migrated and tested services')
  })
  it('falls back to copy-only when a later gerund is unknown', () => {
    assert.ok(fixes('Responsible for planning and reconciling accounts').every((x) => x.value === null))
  })
})

describe('JD keyword extraction', () => {
  it('splits hyphenated compounds', () => {
    assert.ok(labels('Requirements:\n- Kafka-based pipelines').includes('Kafka'))
    const l = labels('Requirements:\n- React-based apps and AWS-hosted services\n- Python-based ETL')
    for (const k of ['React', 'AWS', 'Python', 'ETL']) assert.ok(l.includes(k), l.join(', '))
  })
  it('scopes optional items', () => {
    assert.deepEqual(req('Requirements:\n- Bonus: Rust\n- Go'), { Go: true, Rust: false })
    assert.deepEqual(req('Requirements:\n* Nice to have: Rust\n- Go'), { Go: true, Rust: false })
    const r = req('Must have: 3+ years in product management, SQL. Nice to have: Jira, Figma.')
    assert.equal(r.SQL, true)
    assert.equal(r.Jira, false)
    assert.equal(r.Figma, false)
  })
  it('drops states, perks, the title specialisation and shouting acronyms', () => {
    const l = labels('Product Manager, Growth\nWe are Zeta. Must have: SQL, Amplitude. Location: Hyderabad, Telangana. Benefits include health insurance, ESOPs and a MacBook Pro.\nAbout Acme: based in Pune, Maharashtra.')
    for (const bad of ['Growth', 'Telangana', 'Maharashtra', 'MacBook Pro', 'Zeta']) assert.ok(!l.includes(bad), l.join(', '))
    const caps = labels('JAVA DEVELOPER\nREQUIRED SKILLS: JAVA, SPRING BOOT, ORACLE, JENKINS. KNOWLEDGE OF AGILE/SCRUM.')
    assert.ok(caps.includes('Oracle') && !caps.includes('ORACLE'), caps.join(', '))
  })
  it('names specific tools instead of their broader term', () => {
    const l = labels('Requirements:\n- Prometheus and Grafana\n- EKS\n- A/B testing\n- Scrum')
    for (const k of ['Prometheus', 'Grafana', 'Amazon EKS', 'A/B testing', 'Scrum']) assert.ok(l.includes(k), l.join(', '))
  })
  it('does not read "present findings to leadership" as a leadership skill', () => {
    assert.ok(!labels('Requirements:\n- Present findings to leadership').includes('Leadership'))
  })
})

describe('extractJobInfo', () => {
  it('handles specialisations, "is hiring" and "We are/We at"', () => {
    assert.deepEqual(extractJobInfo('Senior Software Engineer - Frontend\nAtlassian'), { company: 'Atlassian', role: 'Senior Software Engineer' })
    assert.deepEqual(extractJobInfo('Flipkart is hiring a Product Analyst'), { company: 'Flipkart', role: 'Product Analyst' })
    assert.equal(extractJobInfo('Product Manager, Growth\nWe are Zeta.').company, 'Zeta')
    assert.equal(extractJobInfo('About the job\nWe at CRED are looking for an SDE-2 (Android).').company, 'CRED')
    assert.deepEqual(extractJobInfo('Senior Backend Engineer – Acme Corp (Pune / Remote)'), { company: 'Acme Corp', role: 'Senior Backend Engineer' })
  })
})

describe('JSON Resume import', () => {
  it('parses Present, ISO datetimes and invalid months', () => {
    assert.deepEqual(importDateValue('Present'), { value: '', present: true })
    assert.equal(importDateValue('2018-05-01T00:00:00Z').value, '2018-05')
    assert.equal(importDateValue('2020-13-01').value, '2020')
    const r = importJson({ basics: { name: 'X', profiles: [{ network: 'Twitter', url: 'https://twitter.com/x' }, { network: 'Dribbble', url: 'https://dribbble.com/x' }] }, work: [{ name: 'A', position: 'Dev', startDate: '2020-01', endDate: 'Present' }] })
    const e = r.data.sections.find((s) => s.kind === 'experience')!.items[0]
    assert.equal(e.current, true)
    assert.equal(r.data.basics.website, 'twitter.com/x')
    assert.ok(r.warnings?.some((w) => w.includes('Dribbble')))
  })
  it('warns when a photo is dropped', () => {
    const doc = makeDoc('developer')
    const r = importJson({ $type: 'resumeforge', data: { ...doc.data, basics: { ...doc.data.basics, photo: `data:image/jpeg;base64,${'A'.repeat(MAX_PHOTO_CHARS)}` } } })
    assert.equal(r.data.basics.photo, '')
    assert.ok(r.warnings?.some((w) => /too large/.test(w)))
  })
})

describe('photo limit', () => {
  it('the load limit fits any photo within the cropper budget', () => {
    assert.ok(MAX_PHOTO_CHARS >= Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 'data:image/jpeg;base64,'.length)
  })
  it('normalizeDoc dedupes snapshot ids', () => {
    const doc = makeDoc('developer')
    const snap = { id: 'same', name: 'a', createdAt: 1, data: doc.data, design: doc.design }
    const n = normalizeDoc({ ...doc, snapshots: [snap, { ...snap, name: 'b' }] })
    assert.equal(new Set(n.snapshots.map((s) => s.id)).size, 2)
  })
})

describe('exports and letters', () => {
  it('Markdown inline links are absolute and safe', () => {
    assert.equal(safeInlineLinks('See [site](example.com) and [x](javascript:alert(1)) or [y](javascript:void)'), 'See [site](https://example.com) and x or y')
    const d = developerSample()
    d.sections.find((s) => s.kind === 'experience')!.items[0].bullets = ['Built [demo](acme.dev/demo) and [bad](javascript:x)']
    const md = toMarkdown(d, { dateFormat: 'MMM YYYY' } as never)
    assert.ok(md.includes('[demo](https://acme.dev/demo)') && !md.includes('javascript:'))
  })
  it('letter TXT has the headline and the subject line', () => {
    const d = developerSample()
    const txt = letterToText({ ...emptyCoverLetter, role: 'Frontend Engineer', body: 'Hi.' }, d)
    assert.ok(txt.includes('Re: Application for Frontend Engineer'))
    assert.ok(txt.split('\n')[1] === d.basics.title)
  })
  it('starters skip category names and fill the career-change skills', () => {
    const d = developerSample()
    assert.ok(!letterSkills(d, 'Requirements:\n- Frontend, React, TypeScript').includes('Frontend'))
    const body = starterLetter('switch', d, { ...emptyCoverLetter }, '').body
    assert.ok(!body.includes('[skill 1]'), body)
  })
})

describe('Add to Skills destination', () => {
  it('creates a fitting group instead of dumping a data skill into Tools', () => {
    const d = developerSample()
    const s = d.sections.find((x) => x.kind === 'skills')!
    s.items = s.items.filter((e) => !/data|analytic|ml|ai\b|other|misc/i.test(e.title))
    const dest = skillsDestination(d, 'data')
    assert.ok(dest && 'createTitle' in dest && dest.createTitle === 'Data')
  })
})
