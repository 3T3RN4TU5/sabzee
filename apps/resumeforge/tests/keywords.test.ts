import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractKeywords, findTerms, matchResume, stem, tokenize, yearsRequired } from '../src/lib/keywords.ts'
import { developerSample } from '../src/lib/samples.ts'

const JD = `Senior Frontend Engineer — Payments

About the role
We are looking for an engineer to build our checkout experience.

Requirements
- 4+ years of experience with React, TypeScript and Node.js
- Experience with GraphQL APIs and PostgreSQL
- Familiarity with Kubernetes, Docker and CI/CD pipelines
- Strong communication and mentoring skills
- Experience building design systems and improving web performance

Nice to have
- Experience with Kafka and payment systems
- Knowledge of payment systems compliance (PCI)`

describe('tokenizer', () => {
  it('keeps tech punctuation and strips sentence punctuation', () => {
    const toks = tokenize('We use C++, C#, Node.js, .NET and CI/CD. Front-end too.').map((t) => t.norm)
    for (const t of ['c++', 'c#', 'node.js', '.net', 'ci/cd', 'front-end', 'too']) assert.ok(toks.includes(t), t)
    assert.ok(!toks.some((t) => t.endsWith('.') && t !== '.net'))
  })

  it('splits unknown slash pairs', () => {
    assert.deepEqual(
      tokenize('react/redux').map((t) => t.norm),
      ['react', 'redux'],
    )
  })

  it('stems simple plurals and suffixes', () => {
    assert.equal(stem('systems'), 'system')
    assert.equal(stem('libraries'), 'library')
    assert.equal(stem('class'), 'class')
  })
})

describe('dictionary terms', () => {
  it('maps aliases to canonical terms', () => {
    const hits = findTerms(tokenize('Experience with ReactJS, nodejs, k8s and Postgres; JS is a plus'))
    for (const t of ['react', 'node.js', 'kubernetes', 'postgresql', 'javascript']) assert.ok(hits.has(t), t)
  })

  it('prefers the longest match', () => {
    const hits = findTerms(tokenize('We ship with React Native and GitHub Actions'))
    assert.ok(hits.has('react native'))
    assert.ok(!hits.has('react'))
    assert.ok(hits.has('github actions'))
  })

  it('ignores ambiguous lowercase words', () => {
    const hits = findTerms(tokenize('you will go to the next level and rest'))
    assert.ok(!hits.has('go'))
    assert.ok(!hits.has('rest apis'))
    assert.ok(findTerms(tokenize('Services written in Go')).has('go'))
  })
})

describe('keyword extraction', () => {
  const kws = extractKeywords(JD)
  const labels = kws.map((k) => k.label)

  it('finds tech terms and removes stopwords', () => {
    for (const t of ['React', 'TypeScript', 'Node.js', 'GraphQL', 'PostgreSQL', 'Kubernetes', 'Docker', 'CI/CD', 'Design systems', 'Communication', 'Mentoring']) {
      assert.ok(labels.includes(t), `${t} missing from ${labels.join(', ')}`)
    }
    for (const stop of ['experience', 'with', 'years', 'strong', 'and']) assert.ok(!labels.some((l) => l.toLowerCase() === stop), stop)
  })

  it('extracts repeated multi-word phrases (n-grams)', () => {
    assert.ok(labels.includes('payment systems'), labels.join(', '))
  })

  it('marks keywords from the requirements block as required and weights them higher', () => {
    const react = kws.find((k) => k.label === 'React')!
    const kafka = kws.find((k) => k.label === 'Kafka')!
    assert.equal(react.required, true)
    assert.equal(kafka.required, false)
    assert.ok(react.weight > kafka.weight)
  })

  it('reads the years requirement', () => {
    assert.equal(yearsRequired(JD), 4)
    assert.equal(yearsRequired('No experience needed'), null)
  })
})

describe('resume matching', () => {
  const result = matchResume(developerSample(), JD, new Date('2026-10-01'))

  it('scores between 0 and 100 and splits matched vs missing', () => {
    assert.ok(result.score > 0 && result.score < 100, String(result.score))
    assert.equal(result.matched + result.missing, result.keywords.length)
  })

  it('matches keywords the sample resume has', () => {
    const byLabel = Object.fromEntries(result.keywords.map((k) => [k.label, k]))
    assert.equal(byLabel.React.matched, true)
    assert.equal(byLabel.TypeScript.matched, true)
    assert.equal(byLabel.PostgreSQL.matched, true)
    assert.ok(byLabel.React.foundIn.includes('Skills'))
    assert.equal(byLabel.Kubernetes.matched, false)
    assert.equal(byLabel.GraphQL.matched, false)
    assert.match(byLabel.Kubernetes.suggestion, /Skills/)
  })

  it('reports experience years', () => {
    assert.equal(result.yearsRequired, 4)
    assert.ok(result.yearsOnResume > 2 && result.yearsOnResume < 3.5, String(result.yearsOnResume))
  })

  it('hits 100% when the resume contains everything', () => {
    const data = developerSample()
    const skills = data.sections.find((s) => s.kind === 'skills')!
    skills.items[0].keywords.push(...extractKeywords(JD).map((k) => k.label))
    assert.equal(matchResume(data, JD).score, 100)
  })

  it('handles an empty job description', () => {
    const r = matchResume(developerSample(), '')
    assert.equal(r.score, 0)
    assert.equal(r.keywords.length, 0)
  })
})
