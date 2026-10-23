/** Academic CV template helpers (src/templates/academic/cite.ts) — pure, no DOM. */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { educationFirst, ownerKey, splitAuthors, terminate } from '../src/templates/academic/cite.ts'

const selfOf = (list: string, owner: string) =>
  splitAuthors(list, owner)
    .filter((t) => t.self)
    .map((t) => t.text)

describe('academic: ownerKey', () => {
  it('drops titles and suffixes', () => {
    assert.deepEqual(ownerKey('Dr. Meera Iyer'), { initial: 'm', surname: 'iyer' })
    assert.deepEqual(ownerKey('Prof Anil Rao PhD'), { initial: 'a', surname: 'rao' })
    assert.deepEqual(ownerKey('Madonna'), { initial: '', surname: 'madonna' })
    assert.equal(ownerKey(''), null)
    assert.equal(ownerKey('  Dr.  '), null)
  })
})

describe('academic: splitAuthors', () => {
  it('flags the owner in common author formats', () => {
    assert.deepEqual(selfOf('M. Iyer, R. Varma, S. Khan', 'Dr. Meera Iyer'), ['M. Iyer'])
    assert.deepEqual(selfOf('R. Varma and Meera Iyer', 'Dr. Meera Iyer'), ['Meera Iyer'])
    assert.deepEqual(selfOf('Varma R; Iyer M', 'Meera Iyer'), ['Iyer M'])
    assert.deepEqual(selfOf('A. Rao & M.R. Iyer', 'Meera Iyer'), ['M.R. Iyer'])
    assert.deepEqual(selfOf('M. Iyer', 'Meera Iyer'), ['M. Iyer'])
  })
  it('does not flag namesakes with another initial, or anyone when the owner is unnamed', () => {
    assert.deepEqual(selfOf('K. Iyer, M. Rao', 'Meera Iyer'), [])
    assert.deepEqual(selfOf('M. Iyer, R. Varma', ''), [])
    assert.deepEqual(selfOf('Iyerson M.', 'Meera Iyer'), [])
  })
  it('keeps every character (tokens re-join to the input)', () => {
    for (const list of ['M. Iyer, R. Varma, S. Khan', 'A, B and C', 'X; Y & Z', 'Solo Author', 'A, and B']) {
      assert.equal(
        splitAuthors(list, 'Meera Iyer')
          .map((t) => t.text)
          .join(''),
        list,
      )
    }
    assert.deepEqual(splitAuthors('   ', 'Meera Iyer'), [])
  })
  it('ignores accents and case', () => {
    assert.deepEqual(selfOf('J. Müller, A. Smith', 'Jonas Muller'), ['J. Müller'])
    assert.deepEqual(selfOf('j. MULLER', 'Jonas Müller'), ['j. MULLER'])
  })
})

describe('academic: educationFirst', () => {
  const k = (...kinds: string[]) => kinds.map((kind) => ({ kind }) as { kind: 'summary' })
  const kinds = (xs: { kind: string }[]) => xs.map((x) => x.kind)
  it('moves education after the opening summary', () => {
    assert.deepEqual(kinds(educationFirst(k('summary', 'experience', 'skills', 'education', 'publications'))), ['summary', 'education', 'experience', 'skills', 'publications'])
    assert.deepEqual(kinds(educationFirst(k('experience', 'education'))), ['education', 'experience'])
  })
  it('leaves lists without education (or already ordered) alone', () => {
    assert.deepEqual(kinds(educationFirst(k('summary', 'experience'))), ['summary', 'experience'])
    assert.deepEqual(kinds(educationFirst(k('education', 'summary'))), ['education', 'summary'])
    assert.deepEqual(educationFirst([]), [])
  })
})

describe('academic: terminate', () => {
  it('adds a full stop only when needed', () => {
    assert.equal(terminate('Interspeech'), 'Interspeech.')
    assert.equal(terminate('Iyer, M.'), 'Iyer, M.')
    assert.equal(terminate('Why not?'), 'Why not?')
    assert.equal(terminate('“Quoted.”'), '“Quoted.”')
    assert.equal(terminate('  '), '')
  })
})
