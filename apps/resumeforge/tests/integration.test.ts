import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { emptyCoverLetter, normalizeCoverLetter, normalizeDoc } from '../src/lib/normalize.ts'
import { applyLegacyLetterLayouts } from '../src/lib/letterTools.ts'
import { exportDoc, importJson } from '../src/lib/importer.ts'
import { makeDoc } from '../src/lib/samples.ts'

describe('cover letter layout field', () => {
  it('defaults to classic and validates', () => {
    assert.equal(emptyCoverLetter.layout, 'classic')
    assert.equal(normalizeCoverLetter({}).layout, 'classic')
    assert.equal(normalizeCoverLetter({ layout: 'accent' }).layout, 'accent')
    assert.equal(normalizeCoverLetter({ layout: 'fancy' }).layout, 'classic')
    assert.equal(normalizeCoverLetter({ layout: 42, body: 'x' }).body, 'x')
  })

  it('survives a backup round-trip', () => {
    const doc = normalizeDoc({ ...makeDoc('developer'), coverLetter: { ...emptyCoverLetter, layout: 'minimal', body: 'Hi' } })
    const back = importJson(JSON.parse(JSON.stringify(exportDoc(doc))))
    assert.equal(back.coverLetter?.layout, 'minimal')
  })

  it('migrates legacy per-resume layouts', () => {
    const a = makeDoc('blank')
    const b = makeDoc('blank')
    const docs = [a, b]
    const legacy = { state: { layouts: { [a.id]: 'accent', [b.id]: 'bogus', nope: 'minimal' } }, version: 1 }
    const out = applyLegacyLetterLayouts(docs, legacy)
    assert.equal(out[0].coverLetter.layout, 'accent')
    assert.equal(out[1], b)
    assert.equal(applyLegacyLetterLayouts(docs, null), docs)
    assert.equal(applyLegacyLetterLayouts(docs, { state: { layouts: {} } }), docs)
  })
})
