/** ATS-Plain template: standard section headings (src/templates/ats/headings.ts). */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ATS_HEADINGS, atsHeading } from '../src/templates/ats/headings.ts'
import { researcherSample } from '../src/lib/samples.ts'
import { ADDABLE_KINDS, KIND_SPECS } from '../src/lib/sections.ts'

describe('atsHeading', () => {
  it('keeps titles that already use a standard term for their kind', () => {
    assert.equal(atsHeading('experience', 'Work Experience'), 'Work Experience')
    assert.equal(atsHeading('experience', 'Employment history'), 'Employment history')
    assert.equal(atsHeading('summary', 'Profile'), 'Profile')
    assert.equal(atsHeading('skills', 'Technical skills'), 'Technical skills')
    assert.equal(atsHeading('publications', 'Selected publications'), 'Selected publications')
    assert.equal(atsHeading('volunteering', 'Volunteer experience'), 'Volunteer experience')
    assert.equal(atsHeading('awards', 'Honours & awards'), 'Honours & awards')
  })

  it('replaces creative titles with the standard heading', () => {
    assert.equal(atsHeading('projects', 'Open source'), 'Projects')
    assert.equal(atsHeading('experience', "Where I've worked"), 'Experience')
    assert.equal(atsHeading('skills', 'My toolbox'), 'Skills')
    assert.equal(atsHeading('volunteering', 'Giving back'), 'Volunteer Experience')
  })

  it('does not accept a term that belongs to another kind', () => {
    // "Experience" is a standard term, but not for a volunteering section
    assert.equal(atsHeading('volunteering', 'Experience'), 'Volunteer Experience')
    assert.equal(atsHeading('education', 'Skills'), 'Education')
  })

  it('falls back to the standard heading for empty titles', () => {
    for (const kind of ADDABLE_KINDS) {
      if (kind === 'custom') continue
      assert.equal(atsHeading(kind, '  '), ATS_HEADINGS[kind])
    }
  })

  it('keeps custom section titles', () => {
    assert.equal(atsHeading('custom', 'Talks & workshops'), 'Talks & workshops')
    assert.equal(atsHeading('custom', ''), 'Additional Information')
  })

  it('keeps every default kind label as-is', () => {
    for (const kind of ADDABLE_KINDS) {
      if (kind === 'custom') continue
      assert.equal(atsHeading(kind, KIND_SPECS[kind].label), KIND_SPECS[kind].label)
    }
  })

  it('maps the researcher sample to recognisable headings', () => {
    const headings = researcherSample().sections.map((s) => atsHeading(s.kind, s.title))
    assert.deepEqual(headings, [
      'Profile',
      'Experience',
      'Education',
      'Selected publications',
      'Projects',
      'Skills',
      'Awards',
      'Certifications',
      'Volunteering',
      'Languages',
      'References',
      'Interests',
    ])
  })
})
