import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseHistory, parseLayout, parseSaved, pushHistory, queryTitle, upsertSaved } from '../src/lib/workspace.ts'

describe('workspace persistence', () => {
  it('keeps history newest-first, de-duplicated and capped', () => {
    let h = pushHistory([], { sql: 'SELECT 1', at: 1 })
    h = pushHistory(h, { sql: 'SELECT 2', at: 2 })
    h = pushHistory(h, { sql: ' SELECT 1 ', at: 3 })
    assert.deepEqual(
      h.map((e) => e.at),
      [3, 2],
    )
    const many = Array.from({ length: 10 }, (_, i) => ({ sql: `q${i}`, at: i }))
    assert.equal(many.reduce((acc, e) => pushHistory(acc, e, 5), [] as typeof many).length, 5)
  })
  it('upserts saved queries by name', () => {
    let s = upsertSaved([], 'Revenue', 'SELECT 1', 10)
    s = upsertSaved(s, 'revenue', 'SELECT 2', 20)
    assert.equal(s.length, 1)
    assert.equal(s[0].sql, 'SELECT 2')
    s = upsertSaved(s, 'Other', 'SELECT 3', 30)
    assert.deepEqual(
      s.map((x) => x.name),
      ['Other', 'Revenue'],
    )
  })
  it('parses stored data defensively', () => {
    assert.equal(parseHistory('nope'), null)
    assert.deepEqual(parseHistory([{ sql: 'x', at: 1, ms: 'bad' }, { foo: 1 }]), [{ sql: 'x', at: 1, ms: undefined, rows: undefined, error: undefined }])
    assert.equal(parseSaved([{ name: 'a', sql: 'b', id: 'i', at: 2 }])?.[0].id, 'i')
    assert.deepEqual(parseLayout({ sidebar: 9999, editor: 'x' }), { sidebar: 520, editor: 0.42 })
  })
  it('derives a title from the first non-comment line', () => {
    assert.equal(queryTitle('-- comment\n\nSELECT a\nFROM t'), 'SELECT a')
    assert.equal(queryTitle('SELECT ' + 'x'.repeat(100), 10), 'SELECT xx…')
  })
})
