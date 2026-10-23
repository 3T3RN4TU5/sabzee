import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyse } from '../src/lib/analysis.ts'
import { checklist, groupIssues, RULE_HELP, scoreBand, severityCounts, textAt } from '../src/lib/atsReport.ts'
import { BULLET_TEMPLATES, EXAMPLE_BULLETS } from '../src/lib/bulletLibrary.ts'
import { exampleGroupIndex, fillTemplate, templateParts, templatePlaceholders } from '../src/lib/bulletTools.ts'
import { matchResume } from '../src/lib/keywords.ts'
import {
  extractJobInfo,
  groupKeywords,
  importance,
  isCompanyKeyword,
  isSkillKeyword,
  matchLabel,
  missingByPriority,
  pickSkillsEntry,
  placementFor,
  SAMPLE_JD,
  withKeyword,
  yearsStatus,
} from '../src/lib/jobMatch.ts'
import { applyVerb, derivedVerb, fixSpelling, issueFixes, prefixVerb, replaceFirstVerb, rewriteWeakOpener, verbBase } from '../src/lib/rewrite.ts'
import { blankData, developerSample } from '../src/lib/samples.ts'
import type { ResumeData } from '../src/lib/types.ts'

const now = new Date('2026-10-01')

describe('rewrite helpers', () => {
  it('finds verb bases including gerunds', () => {
    assert.equal(verbBase('building'), 'build')
    assert.equal(verbBase('managing'), 'manage')
    assert.equal(verbBase('planning'), 'plan')
    assert.equal(verbBase('Led'), 'lead')
    assert.equal(verbBase('banana'), null)
  })

  it('derives the hidden verb behind a weak opener', () => {
    assert.equal(derivedVerb('Responsible for building the billing API'), 'Built')
    assert.equal(derivedVerb('Helped migrate 3 services to Kubernetes'), 'Migrated')
    assert.equal(derivedVerb('Responsible for the billing API'), null)
    assert.equal(derivedVerb('Built a dashboard'), null)
  })

  it('rewrites weak openers', () => {
    assert.equal(rewriteWeakOpener('Responsible for the billing service', 'Led'), 'Led the billing service')
    assert.equal(rewriteWeakOpener('Worked on onboarding flows', 'Built'), 'Built onboarding flows')
    assert.equal(rewriteWeakOpener('Responsible for building the billing API', 'Built'), 'Built the billing API')
    assert.equal(rewriteWeakOpener('Built a dashboard', 'Led'), null)
    assert.equal(rewriteWeakOpener('Duties included reports', 'Rewrite as an achievement: Built…, Reduced…, Led…'), null)
    assert.equal(rewriteWeakOpener('**Responsible** for X', 'Led'), null)
  })

  it('prefixes, replaces verbs and fixes spelling', () => {
    assert.equal(prefixVerb('Payment API serving 2M users', 'Built'), 'Built payment API serving 2M users')
    assert.equal(prefixVerb('React dashboard for 5k users', 'Built'), 'Built React dashboard for 5k users')
    assert.equal(replaceFirstVerb('Build dashboards for ops', 'Built'), 'Built dashboards for ops')
    assert.equal(fixSpelling('Wrote Javascript and javascript tests', 'JavaScript'), 'Wrote JavaScript and JavaScript tests')
    assert.equal(fixSpelling('Wrote JavaScript', 'JavaScript'), null)
  })

  it('applies a picked verb to any bullet', () => {
    assert.equal(applyVerb('', 'reduced'), 'Reduced ')
    assert.equal(applyVerb('Built a dashboard', 'Engineered'), 'Engineered a dashboard')
    assert.equal(applyVerb('Worked on the checkout', 'Redesigned'), 'Redesigned the checkout')
    assert.equal(applyVerb('Checkout redesign for 2M users', 'Led'), 'Led checkout redesign for 2M users')
  })

  it('turns issue suggestions into concrete rewrites', () => {
    const fixes = issueFixes({ rule: 'weak-verb', suggestions: ['Led', 'Owned'] }, 'Responsible for building the API')
    assert.deepEqual(
      fixes.map((f) => f.label),
      ['Built', 'Led', 'Owned'],
    )
    assert.equal(fixes[0].value, 'Built the API')
    assert.equal(fixes[1].value, 'Led building the API')
    const copyOnly = issueFixes({ rule: 'buzzword', suggestions: ['x'] }, 'team player')
    assert.equal(copyOnly[0].value, null)
    assert.deepEqual(issueFixes({ rule: 'weak-verb', suggestions: ['Led'] }, null), [{ label: 'Led', value: null }])
  })

  it('every weak-verb issue on a messy resume gets at least one applicable fix', () => {
    const data = developerSample()
    const exp = data.sections.find((s) => s.kind === 'experience')!
    exp.items[0].bullets = ['Responsible for the payments service used by 2M users', 'Worked on onboarding which improved activation by 10%', 'Helped migrate 4 services to Kubernetes in 3 months']
    const a = analyse(data, { now })
    const weak = a.issues.filter((i) => i.rule === 'weak-verb')
    assert.equal(weak.length, 3)
    for (const i of weak) assert.ok(issueFixes(i, textAt(data, i.target)).some((f) => f.value), i.message)
  })
})

describe('ATS report helpers', () => {
  const messy = (): ResumeData => {
    const d = developerSample()
    d.basics.email = 'not-an-email'
    d.sections.find((s) => s.kind === 'experience')!.items[0].bullets[0] = 'Responsible for the dashboard'
    return d
  }

  it('groups issues by severity and category', () => {
    const a = analyse(messy(), { now })
    const bySev = groupIssues(a.issues, 'severity')
    assert.equal(bySev[0].key, 'error')
    assert.ok(bySev.every((g) => g.issues.length))
    const byCat = groupIssues(a.issues, 'category')
    assert.equal(byCat.reduce((n, g) => n + g.issues.length, 0), a.issues.length)
    assert.ok(byCat.find((g) => g.key === 'Contact'))
    const counts = severityCounts(a.issues)
    assert.equal(counts.error + counts.warning + counts.info, a.issues.length)
  })

  it('has help text for every rule the analyser emits', () => {
    const a = analyse(messy(), { now, pages: 3 })
    for (const i of a.issues) assert.ok(RULE_HELP[i.rule], `missing help for ${i.rule}`)
  })

  it('builds a checklist with pass / fail / skip', () => {
    const good = checklist(analyse(developerSample(), { now, pages: 1 }))
    assert.ok(good.filter((c) => c.status === 'pass').length >= 15)
    const bad = checklist(analyse(messy(), { now }))
    assert.equal(bad.find((c) => c.id === 'email')!.status, 'fail')
    assert.equal(bad.find((c) => c.id === 'verbs')!.status, 'fail')
    const blank = checklist(analyse(blankData(), { now }))
    assert.equal(blank.find((c) => c.id === 'metrics')!.status, 'skip')
  })

  it('reads the text behind a target', () => {
    const d = developerSample()
    const exp = d.sections.find((s) => s.kind === 'experience')!
    const sum = d.sections.find((s) => s.kind === 'summary')!
    assert.equal(textAt(d, { field: 'email' }), 'aarav.mehta@example.com')
    assert.equal(textAt(d, { sectionId: sum.id, field: 'content' }), sum.content)
    assert.equal(textAt(d, { sectionId: exp.id, entryId: exp.items[0].id, field: 'bullets', bullet: 1 }), exp.items[0].bullets[1])
    assert.equal(textAt(d, { sectionId: exp.id, entryId: exp.items[0].id, field: 'title' }), 'Software Engineer')
    assert.equal(textAt(d, { sectionId: exp.id, entryId: exp.items[0].id, field: 'bullets' }), null)
    assert.equal(textAt(d, { sectionId: 'nope', field: 'content' }), null)
    assert.equal(textAt(d, undefined), null)
  })

  it('bands scores', () => {
    assert.equal(scoreBand(90), 'excellent')
    assert.equal(scoreBand(72), 'good')
    assert.equal(scoreBand(55), 'fair')
    assert.equal(scoreBand(10), 'low')
  })
})

describe('bullet helper tools', () => {
  it('matches example groups by role', () => {
    const role = (r: string) => EXAMPLE_BULLETS[exampleGroupIndex(r)].role
    assert.equal(role('Senior Data Analyst'), 'Data & analytics')
    assert.equal(role('Frontend Developer Intern'), 'Software engineering')
    assert.equal(role('Marketing Intern'), 'Marketing & sales')
    assert.equal(role('Summer Intern'), 'Students & freshers')
    assert.equal(role('UX Designer'), 'Product & design')
    assert.equal(role('Customer Support Specialist'), 'Operations & support')
    assert.notEqual(role('Billing Specialist'), 'Data & analytics')
    assert.equal(role(''), 'Software engineering')
  })

  it('extracts and fills template placeholders', () => {
    const t = BULLET_TEMPLATES[0].pattern
    assert.deepEqual(templatePlaceholders(t), ['X', 'Y', 'Z'])
    assert.equal(fillTemplate(t, { X: 'a 20% faster checkout', Y: 'p95 latency', Z: 'caching' }), 'Accomplished a 20% faster checkout as measured by p95 latency by doing caching')
    assert.equal(fillTemplate(t, { X: 'Cut costs 10%', Y: 'AWS bills' }), 'Accomplished cut costs 10% as measured by AWS bills by doing [Z]')
    assert.equal(fillTemplate(t, { X: 'more sales' }), 'Accomplished more sales as measured by [Y] by doing [Z]')
    assert.deepEqual(
      templateParts('Led [N] people').map((p) => p.placeholder),
      [false, true, false],
    )
    assert.deepEqual(templatePlaceholders('See [docs](https://example.com)'), [])
  })
})

describe('job match helpers', () => {
  const data = developerSample()
  const result = matchResume(data, SAMPLE_JD, now)

  it('the sample JD gives a partial match with must-haves', () => {
    assert.ok(result.score > 30 && result.score < 95, `score ${result.score}`)
    assert.ok(result.keywords.some((k) => importance(k) === 'must'))
    assert.equal(result.yearsRequired, 4)
    const missing = missingByPriority(result.keywords)
    assert.ok(missing.length > 0)
    assert.ok(missing.every((k) => !k.matched))
    const ranks = missing.map((k) => ['must', 'high', 'normal'].indexOf(importance(k)))
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b))
  })

  it('groups keywords', () => {
    const groups = groupKeywords(result.keywords)
    assert.equal(groups.reduce((n, g) => n + g.rows.length, 0), result.keywords.length)
    assert.ok(groups.find((g) => g.id === 'technical'))
  })

  it('places missing keywords and picks a skills entry', () => {
    const graphql = { category: 'backend' as const, source: 'dictionary' as const }
    const p = placementFor(graphql, data)
    assert.equal(p.label, 'Skills')
    const skills = data.sections.find((s) => s.kind === 'skills')!
    assert.equal(p.target?.sectionId, skills.id)
    assert.equal(p.target?.field, 'keywords')
    assert.equal(skills.items.find((e) => e.id === p.target?.entryId)?.title, 'Backend')
    assert.equal(pickSkillsEntry(data, 'cloud')?.entryId, skills.items.find((e) => e.title === 'Tools')!.id)
    assert.equal(placementFor({ category: 'soft', source: 'dictionary' }, data).label, 'Experience')
    assert.equal(placementFor({ category: 'phrase', source: 'phrase' }, data).label, 'Summary')
    const blank = { ...blankData(), sections: blankData().sections.filter((x) => x.kind !== 'skills') }
    const pb = placementFor(graphql, blank)
    assert.equal(pb.target, undefined)
    assert.equal(pb.addKind, 'skills')
    assert.equal(isSkillKeyword(graphql), true)
    assert.equal(isSkillKeyword({ category: 'soft', source: 'dictionary' }), false)
  })

  it('adds keywords without duplicates', () => {
    assert.deepEqual(withKeyword(['React'], 'GraphQL'), ['React', 'GraphQL'])
    assert.deepEqual(withKeyword(['graphql'], 'GraphQL'), ['graphql'])
  })

  it('recognises the company name as a non-skill keyword', () => {
    assert.equal(isCompanyKeyword({ label: 'Lumen' }, 'Lumen Health'), true)
    assert.equal(isCompanyKeyword({ label: 'lumen health' }, 'Lumen Health'), true)
    assert.equal(isCompanyKeyword({ label: 'Health' }, ''), false)
    assert.equal(isCompanyKeyword({ label: 'React' }, 'Lumen Health'), false)
  })

  it('compares years and labels scores', () => {
    assert.equal(yearsStatus(null, 3), 'unknown')
    assert.equal(yearsStatus(3, 3.2), 'meets')
    assert.equal(yearsStatus(4, 3.1), 'close')
    assert.equal(yearsStatus(5, 2), 'below')
    assert.equal(matchLabel(80), 'Strong match')
    assert.equal(matchLabel(10), 'Low match')
  })

  it('detects company and role in job descriptions', () => {
    assert.deepEqual(extractJobInfo(SAMPLE_JD), { company: 'Lumen Health', role: 'Senior Frontend Engineer' })
    assert.deepEqual(extractJobInfo('Company: Acme Corp\nJob title: Data Analyst\n\nWe need SQL.'), { company: 'Acme Corp', role: 'Data Analyst' })
    assert.deepEqual(extractJobInfo('Northwind Traders is hiring a Product Designer to lead our mobile app.'), { company: 'Northwind Traders', role: 'Product Designer' })
    assert.deepEqual(extractJobInfo('About Us\nWe are looking for a Backend Engineer to join Contoso.'), { company: 'Contoso', role: 'Backend Engineer' })
    assert.deepEqual(extractJobInfo('Acme | Staff Software Engineer (m/f/d)'), { company: 'Acme', role: 'Staff Software Engineer' })
    assert.deepEqual(extractJobInfo('Great benefits and free snacks.'), { company: '', role: '' })
  })
})
