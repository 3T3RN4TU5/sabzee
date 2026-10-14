import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { csvChunks, csvEscape, csvRow, jsonChunks, parseCsv } from '../src/lib/csv.ts'

describe('CSV escaping', () => {
  it('leaves plain values alone', () => {
    assert.equal(csvEscape('hello'), 'hello')
    assert.equal(csvEscape(42), '42')
    assert.equal(csvEscape(12n), '12')
    assert.equal(csvEscape(false), 'false')
  })
  it('writes NULL as an empty field', () => {
    assert.equal(csvEscape(null), '')
    assert.equal(csvEscape(undefined), '')
  })
  it('quotes delimiters, quotes, newlines and edge whitespace', () => {
    assert.equal(csvEscape('a,b'), '"a,b"')
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""')
    assert.equal(csvEscape('line1\nline2'), '"line1\nline2"')
    assert.equal(csvEscape('cr\rhere'), '"cr\rhere"')
    assert.equal(csvEscape(' padded'), '" padded"')
    assert.equal(csvEscape('a\tb', '\t'), '"a\tb"')
    assert.equal(csvEscape('a,b', '\t'), 'a,b')
  })
  it('serialises dates and nested values', () => {
    assert.equal(csvEscape(new Date(Date.UTC(2024, 0, 1))), '2024-01-01T00:00:00.000Z')
    assert.equal(csvEscape([1, 'x']), '"[1,""x""]"')
  })
  it('round-trips through a parser', () => {
    const rows = [
      ['id', 'note', 'empty'],
      ['1', 'comma, inside', ''],
      ['2', 'quote "q" and\nnewline', 'x'],
      ['3', '  spaces  ', 'y'],
    ]
    const text = rows.map((r) => csvRow(r)).join('\r\n') + '\r\n'
    assert.deepEqual(parseCsv(text), rows)
  })
  it('streams chunks with a header', () => {
    const data = [
      [1, 'a'],
      [2, null],
      [3, 'c,d'],
    ]
    const text = [...csvChunks(['n', 's'], data.length, (i) => data[i], { chunkRows: 2 })].join('')
    assert.equal(text, 'n,s\r\n1,a\r\n2,\r\n3,"c,d"\r\n')
  })
  it('streams JSON that parses back, BigInt-safe', () => {
    const data = [
      [1n, 'a'],
      [null, 'b'],
    ]
    const text = [...jsonChunks(['n', 's'], 2, (i) => data[i], 1)].join('')
    assert.deepEqual(JSON.parse(text), [
      { n: 1, s: 'a' },
      { n: null, s: 'b' },
    ])
  })
})
