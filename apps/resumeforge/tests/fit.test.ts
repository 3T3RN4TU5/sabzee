import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultDesign, DESIGN_LIMITS } from '../src/lib/design.ts'
import { describeFit, fitCandidates, firstFitting, fitPatch, lastPageNearlyEmpty } from '../src/lib/fit.ts'
import type { Design } from '../src/lib/types.ts'

const base: Design = { ...defaultDesign } // spacing 1, lineHeight 1.45, fontSize 13, margin 14

describe('fitCandidates', () => {
  const list = fitCandidates(base)

  it('tightens one notch at a time, gentle stage first in the order spacing → line height → font → margin', () => {
    assert.ok(list.length > 10)
    let prev = base
    for (const c of list) {
      const changed = (['spacing', 'lineHeight', 'fontSize', 'margin'] as const).filter((k) => c[k] !== prev[k])
      assert.equal(changed.length, 1, 'exactly one field per step')
      assert.ok(c[changed[0]] < prev[changed[0]], 'always tighter')
      prev = c
    }
    const firstChange = (k: keyof Design) => list.findIndex((c) => c[k] !== base[k])
    assert.ok(firstChange('spacing') < firstChange('lineHeight'))
    assert.ok(firstChange('lineHeight') < firstChange('fontSize'))
    assert.ok(firstChange('fontSize') < firstChange('margin'))
    // stage 1 stops at the soft floors
    const endStage1 = list.findIndex((c) => c.spacing < 0.8)
    assert.deepEqual([list[endStage1 - 1].spacing, list[endStage1 - 1].lineHeight, list[endStage1 - 1].fontSize, list[endStage1 - 1].margin], [0.8, 1.3, 12, 10])
  })

  it('ends at the hard limits, keeps other design fields and stays on the slider grid', () => {
    const last = list[list.length - 1]
    assert.equal(last.spacing, DESIGN_LIMITS.spacing.min)
    assert.equal(last.lineHeight, DESIGN_LIMITS.lineHeight.min)
    assert.equal(last.fontSize, DESIGN_LIMITS.fontSize.min)
    assert.equal(last.margin, DESIGN_LIMITS.margin.min)
    assert.equal(last.template, base.template)
    assert.equal(last.accent, base.accent)
    for (const c of list) {
      assert.ok(Math.abs(c.spacing / 0.05 - Math.round(c.spacing / 0.05)) < 1e-9, `spacing ${c.spacing}`)
      assert.ok(Math.abs(c.lineHeight / 0.05 - Math.round(c.lineHeight / 0.05)) < 1e-9, `lineHeight ${c.lineHeight}`)
    }
  })

  it('is empty at the minimum and skips fields already below the soft floor', () => {
    const min: Design = { ...base, spacing: 0.6, lineHeight: 1.2, fontSize: 11, margin: 8 }
    assert.deepEqual(fitCandidates(min), [])
    const tight: Design = { ...base, spacing: 0.7 }
    const l = fitCandidates(tight)
    assert.ok(l.every((c) => c.spacing <= 0.7))
    assert.equal(l[0].lineHeight, 1.4)
  })
})

describe('firstFitting', () => {
  it('finds the first fitting candidate with a logarithmic number of probes', async () => {
    let probes = 0
    const at = await firstFitting(40, async (i) => (probes++, i >= 23))
    assert.equal(at, 23)
    assert.ok(probes <= 8, `${probes} probes`)
  })
  it('returns -1 when nothing fits, 0 when the first one fits', async () => {
    assert.equal(await firstFitting(10, async () => false), -1)
    assert.equal(await firstFitting(10, async () => true), 0)
    assert.equal(await firstFitting(0, async () => true), -1)
  })
})

describe('fit helpers', () => {
  it('fitPatch / describeFit report only changed fields', () => {
    const to = { ...base, spacing: 0.85, fontSize: 12.5 }
    assert.deepEqual(fitPatch(base, to), { spacing: 0.85, fontSize: 12.5 })
    assert.equal(describeFit(base, to), 'spacing 1 → 0.85×, font 13 → 12.5 px')
  })
  it('lastPageNearlyEmpty only for multi-page docs below 15 %', () => {
    assert.equal(lastPageNearlyEmpty(2, 0.1), true)
    assert.equal(lastPageNearlyEmpty(2, 0.4), false)
    assert.equal(lastPageNearlyEmpty(1, 0.05), false)
    assert.equal(lastPageNearlyEmpty(3, null), false)
  })
})
