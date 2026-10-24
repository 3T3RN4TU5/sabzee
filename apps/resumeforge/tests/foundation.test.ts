import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyse } from '../src/lib/analysis.ts'
import { contrastRatio, ensureContrast, hexToRgb, mix, readableOn, rgbTriplet, tint } from '../src/lib/color.ts'
import { defaultDesign } from '../src/lib/design.ts'
import {
  addBullet,
  addEntry,
  addSection,
  canAddSection,
  cloneData,
  duplicateEntry,
  duplicateSection,
  isNoopPatch,
  moveBullet,
  moveEntry,
  moveItem,
  moveSection,
  removeBullet,
  removeEntry,
  removeSection,
  transferEntry,
  updateBasics,
  updateBullet,
  updateEntry,
  updateSection,
} from '../src/lib/ops.ts'
import { parseRoute, routeHash, VIEW_PREFIX } from '../src/lib/route.ts'
import { developerSample, researcherSample } from '../src/lib/samples.ts'
import { createEntry, createSection, KIND_SPECS, ADDABLE_KINDS } from '../src/lib/sections.ts'
import { SHARE_ROUTE } from '../src/lib/share.ts'
import { isWithin, targetAncestors, targetKey } from '../src/lib/target.ts'
import { buildEntryView, buildSectionViews, displayName, initials, paperSize, resolveColumn, resolveFont, resolveHeadingCase } from '../src/lib/templateData.ts'
import type { ResumeData } from '../src/lib/types.ts'
import { kitchenSinkData, minimalData } from '../src/lib/fixtures.ts'
import { normalizeData } from '../src/lib/normalize.ts'

const exp = (d: ResumeData) => d.sections.find((s) => s.kind === 'experience')!

describe('ops: immutable editing helpers', () => {
  it('moveItem moves and is a no-op for bad indices', () => {
    const a = [1, 2, 3, 4]
    assert.deepEqual(moveItem(a, 0, 2), [2, 3, 1, 4])
    assert.deepEqual(moveItem(a, 3, 0), [4, 1, 2, 3])
    assert.equal(moveItem(a, 1, 1), a)
    assert.equal(moveItem(a, 9, 0), a)
    assert.deepEqual(moveItem(a, 0, 99), [2, 3, 4, 1])
  })

  it('returns the same object for no-op patches', () => {
    const d = developerSample()
    assert.equal(updateBasics(d, { name: d.basics.name }), d)
    assert.equal(updateSection(d, exp(d).id, { title: exp(d).title }), d)
    assert.equal(updateSection(d, 'missing', { title: 'x' }), d)
    const e = exp(d).items[0]
    assert.equal(updateEntry(d, exp(d).id, e.id, { bullets: [...e.bullets] }), d)
    assert.equal(updateBullet(d, exp(d).id, e.id, 0, e.bullets[0]), d)
    assert.equal(removeEntry(d, exp(d).id, 'missing'), d)
    assert.ok(isNoopPatch({ a: 1, b: [1, 2] }, { b: [1, 2] }))
    assert.ok(!isNoopPatch({ a: 1, b: [1, 2] }, { b: [2, 1] }))
  })

  it('updates basics, sections and entries immutably', () => {
    const d = developerSample()
    const d2 = updateBasics(d, { name: 'New Name' })
    assert.notEqual(d2, d)
    assert.equal(d2.basics.name, 'New Name')
    assert.equal(d.basics.name, 'Aarav Mehta')
    assert.equal(d2.sections, d.sections) // untouched parts are shared

    const sid = exp(d).id
    const eid = exp(d).items[0].id
    const d3 = updateEntry(d, sid, eid, { title: 'Staff Engineer' })
    assert.equal(exp(d3).items[0].title, 'Staff Engineer')
    assert.equal(exp(d3).items[0].id, eid)
    assert.equal(exp(d3).items[1], exp(d).items[1])
    assert.equal(updateEntry(d, sid, eid, { id: 'hijack' } as never).sections, d.sections)
  })

  it('adds sections respecting the one-per-kind rule', () => {
    const d = developerSample()
    assert.equal(canAddSection(d, 'experience'), false)
    assert.equal(canAddSection(d, 'custom'), true)
    const same = addSection(d, 'experience')
    assert.equal(same.data, d)
    assert.equal(same.id, exp(d).id)
    const added = addSection(d, 'awards', { index: 1 })
    assert.equal(added.data.sections[1].kind, 'awards')
    assert.equal(added.data.sections[1].id, added.id)
    assert.equal(added.data.sections[1].items.length, 1)
    const summary = addSection({ ...d, sections: [] }, 'summary')
    assert.equal(summary.data.sections[0].items.length, 0)
    const c1 = addSection(d, 'custom', { title: 'Talks' })
    const c2 = addSection(c1.data, 'custom', { title: 'Patents' })
    assert.equal(c2.data.sections.filter((s) => s.kind === 'custom').length, 2)
  })

  it('removes, moves and duplicates sections', () => {
    const d = developerSample()
    const sid = exp(d).id
    assert.equal(removeSection(d, sid).sections.length, d.sections.length - 1)
    assert.equal(removeSection(d, 'nope'), d)
    const moved = moveSection(d, 1, 0)
    assert.equal(moved.sections[0].id, sid)
    const dup = duplicateSection(d, sid)
    const copy = dup.data.sections[2]
    assert.equal(copy.id, dup.id)
    assert.equal(copy.kind, 'custom') // built-in kinds stay unique
    assert.equal(copy.items.length, exp(d).items.length)
    assert.notEqual(copy.items[0].id, exp(d).items[0].id)
  })

  it('adds, duplicates, moves and transfers entries', () => {
    const d = developerSample()
    const sid = exp(d).id
    const added = addEntry(d, sid, { title: 'Freelancer' }, 0)
    assert.equal(exp(added.data).items[0].title, 'Freelancer')
    assert.deepEqual(exp(added.data).items[0].bullets, ['']) // experience starts with one bullet
    assert.equal(addEntry(d, 'missing').data, d)
    const dup = duplicateEntry(d, sid, exp(d).items[0].id)
    assert.equal(exp(dup.data).items[1].id, dup.id)
    assert.equal(exp(dup.data).items[1].title, exp(d).items[0].title)
    assert.notEqual(exp(dup.data).items[1].bullets, exp(d).items[0].bullets)
    const moved = moveEntry(d, sid, 0, 1)
    assert.equal(exp(moved).items[1].id, exp(d).items[0].id)
    const projects = d.sections.find((s) => s.kind === 'projects')!
    const t = transferEntry(d, sid, exp(d).items[1].id, projects.id, 0)
    assert.equal(exp(t).items.length, 1)
    assert.equal(t.sections.find((s) => s.kind === 'projects')!.items[0].id, exp(d).items[1].id)
  })

  it('edits bullets', () => {
    const d = developerSample()
    const sid = exp(d).id
    const eid = exp(d).items[0].id
    const n = exp(d).items[0].bullets.length
    const a = addBullet(d, sid, eid, 'New bullet', 0)
    assert.equal(exp(a).items[0].bullets[0], 'New bullet')
    assert.equal(exp(a).items[0].bullets.length, n + 1)
    const u = updateBullet(a, sid, eid, 0, 'Edited')
    assert.equal(exp(u).items[0].bullets[0], 'Edited')
    assert.equal(updateBullet(a, sid, eid, 99, 'x'), a)
    const r = removeBullet(u, sid, eid, 0)
    assert.deepEqual(exp(r).items[0].bullets, exp(d).items[0].bullets)
    const m = moveBullet(d, sid, eid, 0, n - 1)
    assert.equal(exp(m).items[0].bullets[n - 1], exp(d).items[0].bullets[0])
  })

  it('clones data, optionally with fresh ids', () => {
    const d = developerSample()
    const c = cloneData(d)
    assert.deepEqual(c, d)
    assert.notEqual(c.sections[0], d.sections[0])
    const f = cloneData(d, true)
    assert.notEqual(f.sections[0].id, d.sections[0].id)
    assert.equal(f.sections[1].items[0].title, d.sections[1].items[0].title)
  })
})

describe('field targets', () => {
  it('keys and ancestors', () => {
    const t = { sectionId: 's1', entryId: 'e1', field: 'bullets', bullet: 2 }
    assert.equal(targetKey(t), 's1/e1/bullets/2')
    assert.equal(targetKey({ field: 'email' }), 'basics/-/email/-')
    assert.deepEqual(targetAncestors(t).map(targetKey), ['s1/e1/bullets/2', 's1/e1/bullets/-', 's1/e1/-/-', 's1/-/-/-'])
    assert.deepEqual(targetAncestors({ field: 'email' }).map(targetKey), ['basics/-/email/-', 'basics/-/-/-'])
    assert.deepEqual(targetAncestors({ sectionId: 's1', field: 'content' }).map(targetKey), ['s1/-/content/-', 's1/-/-/-'])
  })

  it('containment', () => {
    const bullet = { sectionId: 's1', entryId: 'e1', field: 'bullets', bullet: 2 }
    assert.ok(isWithin(bullet, { sectionId: 's1' }))
    assert.ok(isWithin(bullet, { sectionId: 's1', entryId: 'e1' }))
    assert.ok(!isWithin(bullet, { sectionId: 's1', entryId: 'e2' }))
    assert.ok(!isWithin({ sectionId: 's1' }, { sectionId: 's1', entryId: 'e1' }))
    assert.ok(isWithin({ field: 'email' }, {}))
    assert.ok(!isWithin(bullet, {}))
    assert.ok(!isWithin({ field: 'email' }, { sectionId: 's1' }))
  })

  it('every analysis issue target resolves to a known shape', () => {
    const d = researcherSample()
    d.basics.email = ''
    d.sections[1].items[0].bullets.push('Responsible for things')
    const { issues } = analyse(d)
    for (const i of issues) {
      if (!i.target) continue
      const t = i.target
      if (t.sectionId) assert.ok(d.sections.some((s) => s.id === t.sectionId), i.rule)
      if (t.entryId) assert.ok(d.sections.some((s) => s.items.some((e) => e.id === t.entryId)), i.rule)
      if (t.bullet !== undefined) assert.equal(t.field, 'bullets')
      assert.ok(targetAncestors(t).length >= 1)
    }
  })
})

describe('routes', () => {
  it('parses and builds hashes', () => {
    assert.equal(VIEW_PREFIX, SHARE_ROUTE)
    assert.deepEqual(parseRoute(''), { name: 'dashboard' })
    assert.deepEqual(parseRoute('#/'), { name: 'dashboard' })
    assert.deepEqual(parseRoute('#/nope'), { name: 'dashboard' })
    assert.deepEqual(parseRoute('#/edit'), { name: 'edit' })
    assert.deepEqual(parseRoute('#/edit/'), { name: 'edit' })
    assert.deepEqual(parseRoute('#/edit/abc123'), { name: 'edit', id: 'abc123' })
    assert.deepEqual(parseRoute('#/view/r1.xyz'), { name: 'view', payload: 'r1.xyz' })
    assert.deepEqual(parseRoute('#/view/'), { name: 'dashboard' })
    assert.deepEqual(parseRoute('#/lab'), { name: 'lab', params: {} })
    assert.deepEqual(parseRoute('#/lab?t=classic&photo=1'), { name: 'lab', params: { t: 'classic', photo: '1' } })
    for (const r of [{ name: 'dashboard' }, { name: 'edit' }, { name: 'edit', id: 'a b' }, { name: 'view', payload: 'r1.Q' }, { name: 'lab', params: { t: 'modern', s: 'kitchen' } }] as const) {
      assert.deepEqual(parseRoute(routeHash(r)), r)
    }
  })
})

describe('colour helpers', () => {
  it('converts and mixes', () => {
    assert.deepEqual(hexToRgb('#4f46e5'), { r: 79, g: 70, b: 229 })
    assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 })
    assert.equal(mix('#000000', '#ffffff', 0.5), '#808080')
    assert.equal(tint('#4f46e5', 0), '#4f46e5')
    assert.equal(rgbTriplet('#4f46e5'), '79 70 229')
  })

  it('picks readable text and enforces contrast', () => {
    assert.equal(readableOn('#1e3a5f'), '#ffffff')
    assert.equal(readableOn('#fde68a'), '#111827')
    assert.ok(contrastRatio('#000000', '#ffffff') > 20)
    const c = ensureContrast('#fde68a')
    assert.ok(contrastRatio(c, '#ffffff') >= 4.5)
    assert.equal(ensureContrast('#1e3a5f'), '#1e3a5f')
  })
})

describe('template view-models', () => {
  it('formats every kind from KIND_SPECS', () => {
    const fmt = { dateFormat: 'MMM YYYY' as const }
    const ex = buildEntryView('experience', createEntry('experience', { title: ' Dev ', subtitle: 'Acme', start: '2024-07', current: true, bullets: ['a', ' ', 'b'], url: 'https://acme.com/' }), fmt)
    assert.equal(ex.title, 'Dev')
    assert.equal(ex.date, 'Jul 2024 – Present')
    assert.equal(ex.endText, 'Present')
    assert.deepEqual(ex.bullets, ['a', 'b'])
    assert.equal(ex.url, 'acme.com')
    assert.equal(ex.href, 'https://acme.com/')
    const cert = buildEntryView('certifications', createEntry('certifications', { title: 'AWS', start: '2025-03', end: '2026-01' }), fmt)
    assert.equal(cert.date, 'Mar 2025') // single-date kind ignores end
    const lang = buildEntryView('languages', createEntry('languages', { title: 'Hindi', level: 5, url: 'x.com' }), fmt)
    assert.equal(lang.levelLabel, 'Native / bilingual')
    assert.equal(lang.url, '') // languages have no link field
    const skill = buildEntryView('skills', createEntry('skills', { title: 'Frontend', level: 4, keywords: ['React', ' '] }), fmt)
    assert.equal(skill.levelLabel, 'Advanced')
    assert.deepEqual(skill.keywords, ['React'])
    const edu = buildEntryView('education', createEntry('education', { meta: 'CGPA 9' }), fmt)
    assert.equal(edu.metaLabel, 'Grade / GPA')
    const pub = buildEntryView('publications', createEntry('publications', { meta: 'M. Iyer' }), fmt)
    assert.equal(pub.metaLabel, 'Authors')
    const ref = buildEntryView('references', createEntry('references', { meta: 'a@example.com', start: '2020' }), fmt)
    assert.equal(ref.metaLabel, 'Contact')
    assert.equal(ref.date, '')
    for (const k of ADDABLE_KINDS) assert.equal(buildEntryView(k, createEntry(k, { title: 'x' }), fmt).kind, k)
  })

  it('filters hidden/empty sections and resolves columns', () => {
    const d = researcherSample()
    d.sections.find((s) => s.kind === 'awards')!.hidden = true
    d.sections.push(createSection('custom', 'Empty', { items: [createEntry('custom')] }))
    const skills = d.sections.find((s) => s.kind === 'skills')!
    const v1 = buildSectionViews(d, defaultDesign, { columns: 1, sideKinds: ['skills'] })
    assert.ok(!v1.all.some((s) => s.kind === 'awards'))
    assert.ok(!v1.all.some((s) => s.title === 'Empty'))
    assert.equal(v1.side.length, 0)
    const v2 = buildSectionViews(d, defaultDesign, { columns: 2, sideKinds: ['skills', 'languages'] })
    assert.deepEqual(v2.side.map((s) => s.kind), ['skills', 'languages'])
    assert.equal(v2.main.length + v2.side.length, v2.all.length)
    assert.equal(resolveColumn({ ...skills, column: 'main' }, { columns: 2, sideKinds: ['skills'] }), 'main')
    assert.equal(resolveColumn({ kind: 'experience', column: 'side' }, { columns: 2 }), 'side')
    assert.equal(v2.all.find((s) => s.kind === 'summary')!.content.length > 0, true)
    assert.equal(KIND_SPECS.summary.fields.length, 0)
  })

  it('basics and design helpers', () => {
    assert.equal(displayName({ name: '  ' }), 'Your Name')
    assert.equal(initials('Dr. Meera Iyer'), 'MI')
    assert.equal(initials('Aarav'), 'A')
    assert.equal(initials(''), '')
    assert.equal(resolveFont({ font: 'auto' }, 'inter'), 'inter')
    assert.equal(resolveFont({ font: 'garamond' }, 'inter'), 'garamond')
    assert.equal(resolveHeadingCase({ headingCase: 'auto' }, 'normal'), 'normal')
    assert.equal(resolveHeadingCase({ headingCase: 'upper' }, 'normal'), 'upper')
    const a4 = paperSize('a4')
    assert.ok(Math.abs(a4.widthPx - 793.7) < 0.1)
    assert.ok(Math.abs(a4.heightPx - 1122.5) < 0.1)
    assert.ok(Math.abs(paperSize('letter').widthPx - 816) < 0.01)
    assert.ok(Math.abs(paperSize('letter').heightPx - 1056) < 0.01)
  })
})

describe('fixtures', () => {
  it('kitchen sink covers every section kind and survives normalisation', () => {
    const d = kitchenSinkData()
    assert.deepEqual([...new Set(d.sections.map((s) => s.kind))].sort(), [...ADDABLE_KINDS].sort())
    assert.deepEqual(normalizeData(d).sections.length, d.sections.length)
    const views = buildSectionViews(d, defaultDesign, { columns: 1 })
    assert.equal(views.all.length, d.sections.length)
    assert.ok(JSON.stringify(d).includes('example.com'))
    assert.ok(!/@(?!example\.com)[a-z0-9-]+\.[a-z]/i.test(JSON.stringify(d).replace(/"[^"]*@example\.com"/g, '')))
    assert.equal(minimalData().sections.length, 3)
  })
})
