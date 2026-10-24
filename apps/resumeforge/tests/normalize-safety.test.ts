import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import JSZip from 'jszip'
import { defaultDesign } from '../src/lib/design.ts'
import { resumeDocxModel } from '../src/lib/docxModel.ts'
import { Packer, renderDocx } from '../src/lib/docxRender.ts'
import { importJson } from '../src/lib/importer.ts'
import { MAX_PHOTO_CHARS, normalizeBasics, normalizeData, normalizeDoc, stripControlChars } from '../src/lib/normalize.ts'
import { developerSample } from '../src/lib/samples.ts'

describe('normalize — entry ids', () => {
  it('de-duplicates entry ids across the whole document', () => {
    const data = developerSample()
    const [a, b] = data.sections.filter((s) => s.items.length >= 1)
    a.items[1] = { ...a.items[1], id: a.items[0].id } // duplicate within a section
    b.items[0] = { ...b.items[0], id: a.items[0].id } // duplicate across sections
    const out = normalizeData(JSON.parse(JSON.stringify(data)))
    const ids = out.sections.flatMap((s) => s.items.map((e) => e.id))
    assert.equal(new Set(ids).size, ids.length)
    // the first occurrence keeps its id; content is untouched
    assert.equal(out.sections[data.sections.indexOf(a)].items[0].id, a.items[0].id)
    assert.equal(out.sections[data.sections.indexOf(a)].items[1].title, a.items[1].title)
  })
})

describe('normalize — control characters', () => {
  it('strips XML-illegal C0 control characters but keeps tabs and newlines', () => {
    assert.equal(stripControlChars('a\u0000b\u0007c\u000Bd\u001Fe\tf\ng\rh￿'), 'abcde\tf\ng\rh')
    const data = normalizeData({ basics: { name: 'Ann\u0008a' }, sections: [{ kind: 'experience', title: 'Work\u0001', items: [{ title: 'Dev\u0002', bullets: ['Shipped\u000C it'] }] }] })
    assert.equal(data.basics.name, 'Anna')
    assert.equal(data.sections[0].title, 'Work')
    assert.equal(data.sections[0].items[0].bullets[0], 'Shipped it')
  })

  it('writes a well-formed .docx even when the in-memory data has control characters', async () => {
    const data = developerSample()
    data.basics.name = 'Aarav\u0001 Mehta'
    data.sections.find((s) => s.kind === 'experience')!.items[0].bullets[0] = 'Cut\u0007 costs\u001B 20%'
    const buf = await Packer.toBuffer(renderDocx(resumeDocxModel(data, { ...defaultDesign })))
    const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string')
    // eslint-disable-next-line no-control-regex
    assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(xml))
    assert.ok(xml.includes('Aarav Mehta'))
    assert.ok(xml.includes('Cut costs 20%'))
  })
})

describe('import length caps', () => {
  it('caps the resume name and job description', () => {
    const r = importJson({ $type: 'resumeforge', name: 'N'.repeat(500), data: { basics: {}, sections: [] }, jobDescription: 'j'.repeat(80000) })
    assert.equal(r.name.length, 120)
    assert.equal(r.jobDescription!.length, 50000)
    const doc = normalizeDoc({ name: 'x'.repeat(300), jobDescription: 'y'.repeat(60000) })
    assert.equal(doc.name.length, 120)
    assert.equal(doc.jobDescription.length, 50000)
  })

  it('drops oversized photos', () => {
    const small = `data:image/png;base64,${'A'.repeat(1000)}`
    assert.equal(normalizeBasics({ photo: small }).photo, small)
    assert.equal(normalizeBasics({ photo: `data:image/png;base64,${'A'.repeat(MAX_PHOTO_CHARS)}` }).photo, '')
  })
})
