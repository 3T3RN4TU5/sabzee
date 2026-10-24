import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { COMMON_VERBS, LOCATIONS } from '../src/lib/dictionaries.ts'
import { extractJobInfo, isCompanyKeyword } from '../src/lib/jobMatch.ts'
import { extractKeywords, matchResume, tokenize } from '../src/lib/keywords.ts'
import { blankData } from '../src/lib/samples.ts'

const fixture = (name: string) => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')
const DA = fixture('da-jd.txt')
const FE = fixture('fe-jd.txt')

const lower = (labels: string[]) => labels.map((l) => l.toLowerCase())

function assertNoJunk(labels: string[], banned: string[]) {
  const ls = lower(labels)
  for (const b of banned) assert.ok(!ls.includes(b.toLowerCase()), `"${b}" should not be a keyword: ${labels.join(', ')}`)
  for (const l of ls) {
    assert.ok(!COMMON_VERBS.has(l), `verb "${l}" leaked into keywords`)
    assert.ok(!LOCATIONS.has(l), `location "${l}" leaked into keywords`)
  }
}

describe('job match keywords — data analyst JD (Swiggy)', () => {
  const kws = extractKeywords(DA)
  const labels = kws.map((k) => k.label)

  it('keeps the real skills', () => {
    for (const s of ['SQL', 'Python', 'R', 'Excel', 'Tableau', 'Power BI', 'Snowflake', 'BigQuery', 'pandas', 'NumPy', 'dbt', 'ETL', 'Statistics', 'Google Analytics', 'Machine learning', 'Communication']) {
      assert.ok(labels.includes(s), `${s} missing from ${labels.join(', ')}`)
    }
  })

  it('keeps multi-word proper nouns intact', () => {
    assert.ok(labels.includes('Computer Science'), labels.join(', '))
    assert.ok(labels.includes('Google Analytics'), labels.join(', '))
    assertNoJunk(labels, ['Computer', 'Science', 'Google', 'Analytics'])
  })

  it('drops bullet-opening verbs, the company, locations and generic words', () => {
    assertNoJunk(labels, ['Analyse', 'Build', 'Write', 'Perform', 'Partner', 'Automate', 'Swiggy', 'Bangalore', 'Data', 'Analyst', 'Why'])
  })

  it('names the specific visualisation tools instead of folding them into one term', () => {
    assert.ok(labels.includes('Tableau') && labels.includes('Power BI'))
  })
})

describe('job match keywords — frontend JD (Razorpay)', () => {
  const kws = extractKeywords(FE)
  const labels = kws.map((k) => k.label)

  it('keeps the real skills', () => {
    for (const s of ['React', 'TypeScript', 'JavaScript', 'Next.js', 'HTML', 'CSS', 'Redux', 'Zustand', 'GraphQL', 'REST APIs', 'Git', 'CI/CD', 'Accessibility', 'Jest', 'Cypress', 'Playwright', 'Storybook', 'Tailwind CSS', 'Webpack', 'Vite', 'Node.js']) {
      assert.ok(labels.includes(s), `${s} missing from ${labels.join(', ')}`)
    }
  })

  it('keeps "React Testing Library" as one keyword', () => {
    assert.ok(labels.includes('React Testing Library'), labels.join(', '))
    assertNoJunk(labels, ['Library', 'Testing'])
  })

  it('drops verbs, the company, locations and generic words', () => {
    assertNoJunk(labels, ['Razorpay', 'Bengaluru', 'Hybrid', 'Engineer', 'Senior', 'Checkout', 'Build', 'Own', 'Write', 'Collaborate', 'Contribute', 'Mentor', 'ESOPs'])
  })
})

describe('job match keyword edge cases', () => {
  it('treats "* ", "1. " and "2) " bullets as sentence starts', () => {
    for (const marker of ['* ', '- ', '• ', '1. ', '2) ', '(a) ']) {
      const toks = tokenize(`${marker}Analyse large datasets`)
      assert.equal(toks[0].raw, 'Analyse', marker)
      assert.equal(toks[0].sentenceStart, true, marker)
      const labels = extractKeywords(`${marker}Analyse data daily\n${marker}Partner with sales\n${marker}Perform audits`).map((k) => k.label)
      assertNoJunk(labels, ['Analyse', 'Partner', 'Perform'])
    }
  })

  it('does not join capitalised words across punctuation', () => {
    const labels = extractKeywords('Degree in Statistics, Mathematics, Computer Science or Economics').map((k) => k.label)
    assert.ok(labels.includes('Computer Science'), labels.join(', '))
    assert.ok(!labels.some((l) => l.includes('Mathematics Computer')), labels.join(', '))
  })

  it('excludes the employer even when it appears mid-sentence', () => {
    const jd = 'Backend Engineer — Northwind Robotics (Pune, Remote)\nYou will build services with Kafka at Northwind Robotics and work with Grafana dashboards.'
    assert.equal(extractJobInfo(jd).company, 'Northwind Robotics')
    const labels = extractKeywords(jd).map((k) => k.label)
    assertNoJunk(labels, ['Northwind', 'Robotics', 'Northwind Robotics', 'Pune'])
    assert.ok(labels.includes('Kafka'))
  })

  it('ignores a capitalised word that also appears in lowercase', () => {
    const labels = extractKeywords('Join our Checkout team.\nYou will own the checkout flow and work with Snowflake.').map((k) => k.label)
    assert.ok(!labels.includes('Checkout'), labels.join(', '))
    assert.ok(labels.includes('Snowflake'))
  })

  it('counts a specific tool on the resume towards its broader JD term', () => {
    const data = blankData()
    const skills = data.sections.find((s) => s.kind === 'skills')!
    skills.items.push({ ...structuredClone(skills.items[0] ?? { id: 'x', title: '', subtitle: '', location: '', meta: '', start: '', end: '', current: false, url: '', description: '', bullets: [], keywords: [] }), id: 'sk-test', title: 'Tools', keywords: ['Tableau', 'Jest'] })
    const r = matchResume(data, 'Requirements\n- Data visualization experience\n- Unit testing discipline')
    const byLabel = Object.fromEntries(r.keywords.map((k) => [k.label, k]))
    assert.equal(byLabel['Data visualization']?.matched, true)
    assert.equal(byLabel['Unit testing']?.matched, true)
  })
})

describe('company / location detection', () => {
  it('cuts the location off the company', () => {
    assert.deepEqual(extractJobInfo(DA), { company: 'Swiggy', role: 'Data Analyst' })
    assert.deepEqual(extractJobInfo(FE), { company: 'Razorpay', role: 'Senior Frontend Engineer' })
    assert.equal(extractJobInfo('Product Designer at Acme Corp · Remote').company, 'Acme Corp')
    assert.equal(extractJobInfo('Acme Corp | Product Designer | London').company, 'Acme Corp')
  })

  it('matches company keywords on whole words only', () => {
    assert.equal(isCompanyKeyword({ label: 'Razorpay' }, 'Razorpay'), true)
    assert.equal(isCompanyKeyword({ label: 'Lumen Health' }, 'Lumen Health Inc'), true)
    assert.equal(isCompanyKeyword({ label: 'Pay' }, 'Razorpay'), false)
    assert.equal(isCompanyKeyword({ label: 'Health Inc' }, 'Lumen Health'), false)
    assert.equal(isCompanyKeyword({ label: 'umen Heal' }, 'Lumen Health'), false)
  })
})
