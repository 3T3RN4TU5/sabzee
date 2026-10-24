/** Shared template helpers: contact text breaking/shortening and keep-with-next pagination. */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { breakChunks, contactEntries, contactGridFits, shortUrl } from '../src/templates/shared/utils.ts'
import { distributeKept, isShortList } from '../src/templates/shared/keep.ts'
import { distribute } from '../src/lib/paginate.ts'
import { developerSample } from '../src/lib/samples.ts'

describe('breakChunks', () => {
  it('joins back to the input', () => {
    for (const v of ['aaravindakshan.venkataraghavan@example.com', 'linkedin.com/in/aaravmehta', 'a.b', 'x', 'averyveryverylonghost.example.com/path/to/x']) assert.equal(breakChunks(v).join(''), v)
  })
  it('breaks only after separators and never leaves short chunks', () => {
    assert.deepEqual(breakChunks('aaravindakshan.venkataraghavan@example.com'), ['aaravindakshan.', 'venkataraghavan@', 'example.com'])
    assert.deepEqual(breakChunks('aaravindakshan-venkataraghavan.dev/portfolio'), ['aaravindakshan-', 'venkataraghavan.', 'dev/', 'portfolio'])
    for (const c of breakChunks('ab.cd.ef.gh.ijkl.m')) assert.ok(c.length >= 4, c)
    assert.deepEqual(breakChunks('aarav.dev'), ['aarav.dev'])
  })
  it('leaves text with spaces whole', () => {
    assert.deepEqual(breakChunks('Thiruvananthapuram, Kerala'), ['Thiruvananthapuram, Kerala'])
  })
})

describe('contact entries', () => {
  it('shorten long URLs for display but keep the full value and href', () => {
    const [w] = contactEntries({ ...developerSample().basics, website: 'https://aaravindakshan-venkataraghavan.dev/portfolio/projects/2024' }, ['website'])
    assert.equal(w.value, 'aaravindakshan-venkataraghavan.dev/portfolio/projects/2024')
    assert.ok(w.short.length <= 48 && w.short.endsWith('…'), w.short)
    assert.equal(w.href, 'https://aaravindakshan-venkataraghavan.dev/portfolio/projects/2024')
  })
  it('grid fits the samples but not long emails', () => {
    const b = developerSample().basics
    assert.equal(contactGridFits(contactEntries(b)), true)
    assert.equal(contactGridFits(contactEntries({ ...b, email: 'aaravindakshan.venkataraghavan@example.com' })), false)
  })
  it('shortUrl keeps the slash after the host', () => {
    assert.equal(shortUrl('aaravindakshan-venkataraghavan.dev/portfolio-and-more', 40), 'aaravindakshan-venkataraghavan.dev/…')
  })
})

describe('distributeKept', () => {
  const b = (h: number) => ({ height: h, gap: 0 })
  const avail = () => 100
  it('matches distribute without keeps', () => {
    const bs = [b(40), b(40), b(40)]
    assert.deepEqual(distributeKept(bs, [], avail), distribute(bs, avail))
  })
  it('moves a kept group to the next page together', () => {
    // 70 + (20 + 20): the pair does not fit after the first block, so both move
    assert.deepEqual(distributeKept([b(70), b(20), b(20)], [false, true, false], avail), [[0], [1, 2]])
  })
  it('does not keep groups taller than maxGroup', () => {
    assert.deepEqual(distributeKept([b(70), b(30), b(30)], [false, true, false], avail, 50), [[0, 1], [2]])
  })
  it('isShortList', () => {
    const en = (n: number) => Array.from({ length: n }) as never[]
    assert.equal(isShortList({ kind: 'languages', entries: en(3) }), true)
    assert.equal(isShortList({ kind: 'languages', entries: en(4) }), false)
    assert.equal(isShortList({ kind: 'experience', entries: en(2) }), false)
  })
})
