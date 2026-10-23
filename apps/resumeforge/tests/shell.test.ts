import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultDesign } from '../src/lib/design.ts'
import { makeDoc } from '../src/lib/samples.ts'
import {
  addTags,
  applyMark,
  clampCrop,
  coverScale,
  cropRect,
  dataUrlBytes,
  filterByTag,
  fitScale,
  relativeTime,
  resetDesignToTemplate,
  sortResumes,
  splitTags,
  stepZoom,
  uniqueName,
  yearOptions,
} from '../src/lib/shell.ts'

const NOW = new Date(2026, 9, 19, 12, 0, 0).getTime()

describe('relativeTime', () => {
  it('formats recent times', () => {
    assert.equal(relativeTime(NOW - 10_000, NOW), 'just now')
    assert.equal(relativeTime(NOW - 5 * 60_000, NOW), '5 min ago')
    assert.equal(relativeTime(NOW - 3 * 3600_000, NOW), '3 h ago')
    assert.equal(relativeTime(NOW - 30 * 3600_000, NOW), 'yesterday')
    assert.equal(relativeTime(NOW - 4 * 86400_000, NOW), '4 days ago')
  })
  it('falls back to a date', () => {
    assert.equal(relativeTime(new Date(2026, 2, 12).getTime(), NOW), '12 Mar')
    assert.equal(relativeTime(new Date(2024, 0, 3).getTime(), NOW), '3 Jan 2024')
  })
})

describe('sortResumes', () => {
  const a = { ...makeDoc('developer'), name: 'Beta', createdAt: 1, updatedAt: 30 }
  const b = { ...makeDoc('researcher'), name: 'alpha', createdAt: 3, updatedAt: 10 }
  const c = { ...makeDoc('blank'), name: 'Gamma', createdAt: 2, updatedAt: 20 }
  const list = [a, b, c]
  it('sorts by updated, created and name without mutating', () => {
    assert.deepEqual(sortResumes(list).map((r) => r.name), ['Beta', 'Gamma', 'alpha'])
    assert.deepEqual(sortResumes(list, 'created').map((r) => r.name), ['alpha', 'Gamma', 'Beta'])
    assert.deepEqual(sortResumes(list, 'name').map((r) => r.name), ['alpha', 'Beta', 'Gamma'])
    assert.deepEqual(list.map((r) => r.name), ['Beta', 'alpha', 'Gamma'])
  })
  it('filters by name, person and job title', () => {
    assert.deepEqual(sortResumes(list, 'updated', 'gam').map((r) => r.name), ['Gamma'])
    assert.equal(sortResumes(list, 'updated', 'full-stack')[0].name, 'Beta')
    assert.equal(sortResumes(list, 'updated', 'zzz').length, 0)
  })
})

describe('templates', () => {
  const list = [
    { id: 'a', tags: ['ATS-friendly', 'One-page'] },
    { id: 'b', tags: ['Two-column', 'Photo'] },
  ]
  it('filters by tag', () => {
    assert.deepEqual(filterByTag(list, 'All').map((t) => t.id), ['a', 'b'])
    assert.deepEqual(filterByTag(list, 'Photo').map((t) => t.id), ['b'])
    assert.deepEqual(filterByTag(list, 'Creative'), [])
  })
  it('resets style settings but keeps template, paper, dates and photo visibility', () => {
    const d = { ...defaultDesign, template: 'classic' as const, accent: '#ff0000', font: 'garamond' as const, fontSize: 15, margin: 22, paper: 'letter' as const, dateFormat: 'YYYY' as const, showPhoto: false, headingCase: 'normal' as const }
    const r = resetDesignToTemplate(d, { defaultAccent: '#0f766e' })
    assert.equal(r.template, 'classic')
    assert.equal(r.accent, '#0f766e')
    assert.equal(r.font, 'auto')
    assert.equal(r.fontSize, defaultDesign.fontSize)
    assert.equal(r.margin, defaultDesign.margin)
    assert.equal(r.headingCase, 'auto')
    assert.equal(r.paper, 'letter')
    assert.equal(r.dateFormat, 'YYYY')
    assert.equal(r.showPhoto, false)
  })
})

describe('zoom', () => {
  const L = { min: 0.3, max: 2, step: 0.1 }
  it('steps on the 10 % grid', () => {
    assert.equal(stepZoom(0.73, 1, L), 0.8)
    assert.equal(stepZoom(0.8, 1, L), 0.9)
    assert.equal(stepZoom(0.73, -1, L), 0.7)
    assert.equal(stepZoom(0.8, -1, L), 0.7)
    assert.equal(stepZoom(2, 1, L), 2)
    assert.equal(stepZoom(0.3, -1, L), 0.3)
  })
  it('fits the container', () => {
    assert.equal(fitScale(0, 800, 48, L), 0.6)
    assert.ok(Math.abs(fitScale(848, 800, 48, L) - 1) < 1e-9)
    assert.equal(fitScale(5000, 800, 48, L), 1.4)
    assert.equal(fitScale(100, 800, 48, L), 0.3)
  })
})

describe('tags', () => {
  it('splits on separators', () => {
    assert.deepEqual(splitTags('React, TypeScript;Node\n  Go  •Rust'), ['React', 'TypeScript', 'Node', 'Go', 'Rust'])
    assert.deepEqual(splitTags(' , ,'), [])
  })
  it('adds without duplicates', () => {
    const base = ['React']
    assert.deepEqual(addTags(base, 'react, Vue, vue'), ['React', 'Vue'])
    assert.equal(addTags(base, 'REACT'), base)
  })
})

describe('applyMark', () => {
  it('wraps and unwraps bold', () => {
    const r = applyMark('Cut costs by 30%', 13, 16, 'bold')
    assert.equal(r.text, 'Cut costs by **30%**')
    assert.equal(r.text.slice(r.start, r.end), '30%')
    const u = applyMark(r.text, r.start, r.end, 'bold')
    assert.equal(u.text, 'Cut costs by 30%')
    assert.equal(u.text.slice(u.start, u.end), '30%')
  })
  it('unwraps when the marks are selected and keeps spaces outside', () => {
    assert.equal(applyMark('a **b** c', 2, 7, 'bold').text, 'a b c')
    assert.equal(applyMark('a b c', 1, 4, 'italic').text, 'a *b* c')
  })
  it('does not mistake bold for italic', () => {
    const r = applyMark('**b**', 2, 3, 'italic')
    assert.equal(r.text, '***b***')
  })
  it('inserts a placeholder without a selection', () => {
    const r = applyMark('Hi ', 3, 3, 'italic')
    assert.equal(r.text, 'Hi *italic text*')
    assert.equal(r.text.slice(r.start, r.end), 'italic text')
  })
  it('creates links and selects the URL', () => {
    const r = applyMark('See demo', 4, 8, 'link')
    assert.equal(r.text, 'See [demo](https://)')
    assert.equal(r.text.slice(r.start, r.end), 'https://')
    const u = applyMark('Go www.example.com', 3, 18, 'link')
    assert.equal(u.text, 'Go [link text](https://www.example.com)')
    assert.equal(u.text.slice(u.start, u.end), 'link text')
  })
})

describe('crop', () => {
  it('covers the viewport at zoom 1', () => {
    assert.equal(coverScale(800, 400, 200), 0.5)
    const r = cropRect({ zoom: 1, x: 0, y: 0 }, 800, 400, 200)
    assert.deepEqual(r, { sx: 200, sy: 0, size: 400 })
  })
  it('clamps offsets so no empty edge shows', () => {
    const c = clampCrop({ zoom: 1, x: 1000, y: 50 }, 800, 400, 200)
    assert.equal(c.x, 100) // (800*0.5 - 200) / 2
    assert.equal(c.y, 0)
    assert.equal(clampCrop({ zoom: 99, x: 0, y: 0 }, 800, 400, 200).zoom, 4)
    assert.equal(clampCrop({ zoom: 0.1, x: 0, y: 0 }, 800, 400, 200).zoom, 1)
  })
  it('maps pan and zoom to the source rect', () => {
    // panned fully right → shows the left edge of the source
    assert.deepEqual(cropRect({ zoom: 1, x: 100, y: 0 }, 800, 400, 200), { sx: 0, sy: 0, size: 400 })
    const z = cropRect({ zoom: 2, x: 0, y: 0 }, 800, 400, 200)
    assert.deepEqual(z, { sx: 300, sy: 100, size: 200 })
  })
  it('estimates data URL size', () => {
    assert.equal(dataUrlBytes('data:image/png;base64,AAAA'), 3)
    assert.equal(dataUrlBytes('data:image/png;base64,AA=='), 1)
    assert.equal(dataUrlBytes('nope'), 0)
  })
})

describe('misc', () => {
  it('offers years newest first', () => {
    const ys = yearOptions(new Date(2026, 0, 1), 2, 1)
    assert.deepEqual(ys, [2027, 2026, 2025, 2024])
  })
  it('makes unique names', () => {
    assert.equal(uniqueName('Untitled resume', []), 'Untitled resume')
    assert.equal(uniqueName('Untitled resume', ['untitled resume', 'Untitled resume 2']), 'Untitled resume 3')
  })
})
