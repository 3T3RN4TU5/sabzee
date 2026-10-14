import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { diverging, formatTimeTick, linear, niceStep, niceTicks, sequential, timeTicks } from '../src/lib/scale.ts'
import { decodeShare, encodeShare, fromBase64Url, referencedTables, toBase64Url } from '../src/lib/share.ts'

describe('scales', () => {
  it('picks nice steps', () => {
    assert.equal(niceStep(100, 5), 20)
    assert.equal(niceStep(1, 4), 0.25)
    assert.equal(niceStep(0, 5), 1)
  })
  it('builds nice ticks covering the domain', () => {
    assert.deepEqual(niceTicks(3, 97, 5), { domain: [0, 100], ticks: [0, 20, 40, 60, 80, 100] })
    assert.deepEqual(niceTicks(0.07, 0.93, 4).ticks, [0, 0.25, 0.5, 0.75, 1])
    const flat = niceTicks(5, 5)
    assert.ok(flat.domain[0] < 5 && flat.domain[1] > 5)
  })
  it('maps linearly', () => {
    const s = linear([0, 10], [100, 0])
    assert.equal(s(0), 100)
    assert.equal(s(5), 50)
    assert.equal(linear([1, 1], [0, 10])(1), 0)
  })
  it('generates month and day time ticks', () => {
    const m = timeTicks(Date.UTC(2024, 0, 15), Date.UTC(2024, 11, 20), 6)
    assert.equal(m.unit, 'month')
    assert.equal(formatTimeTick(m.ticks[0], m.unit), 'Mar')
    assert.ok(m.ticks.every((t) => new Date(t).getUTCDate() === 1))
    const d = timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 10), 6)
    assert.equal(d.unit, 'day')
    assert.equal(formatTimeTick(d.ticks[0], 'day'), 'Jan 1')
    const y = timeTicks(Date.UTC(2015, 5, 1), Date.UTC(2024, 0, 1), 5)
    assert.equal(y.unit, 'year')
    assert.equal(formatTimeTick(y.ticks[0], 'year'), '2016')
  })
  it('produces colors at the ends of ramps', () => {
    assert.equal(sequential(0), '#0d366b')
    assert.equal(sequential(1), '#b7d3f6')
    assert.equal(diverging(0), '#383835')
    assert.equal(diverging(1), '#2a78d6')
    assert.equal(diverging(-1), '#e34948')
  })
})

describe('share links', () => {
  it('round-trips unicode SQL through base64url', () => {
    const sql = "SELECT 'naïve ✓' AS s -- comment\nFROM t WHERE x > 1/2"
    const enc = toBase64Url(sql)
    assert.doesNotMatch(enc, /[+/=]/)
    assert.equal(fromBase64Url(enc), sql)
  })
  it('encodes and decodes state in the hash', () => {
    const hash = encodeShare({ sql: 'SELECT 1', samples: ['taxi_trips'] })
    assert.deepEqual(decodeShare(hash), { sql: 'SELECT 1', samples: ['taxi_trips'] })
    assert.equal(decodeShare(''), null)
    assert.equal(decodeShare('#foo=bar'), null)
    assert.deepEqual(decodeShare('#sql=U0VMRUNUIDE&samples=ok,BAD!,x_1')?.samples, ['ok', 'x_1'])
  })
  it('finds referenced tables', () => {
    assert.deepEqual(referencedTables('select * from taxi_trips t join "daily_metrics" d', ['taxi_trips', 'daily_metrics', 'taxi']), ['taxi_trips', 'daily_metrics'])
  })
})
