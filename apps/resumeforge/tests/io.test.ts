import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultDesign } from '../src/lib/design.ts'
import { toMarkdown, toPlainText } from '../src/lib/exportText.ts'
import { exportDoc, importJson } from '../src/lib/importer.ts'
import { fromJsonResume, levelFromText, toJsonResume } from '../src/lib/jsonresume.ts'
import { createEntry, createSection } from '../src/lib/sections.ts'
import { developerSample, makeDoc, researcherSample } from '../src/lib/samples.ts'
import { decodeShare, encodeShare, shareUrl } from '../src/lib/share.ts'
import type { ResumeData } from '../src/lib/types.ts'

/** Strip generated ids so two ResumeData values can be compared structurally. */
function withoutIds(d: ResumeData) {
  return { basics: d.basics, sections: d.sections.map(({ id: _id, ...s }) => ({ ...s, items: s.items.map(({ id: _eid, ...e }) => e) })) }
}

describe('JSON Resume', () => {
  it('exports schema-shaped data', () => {
    const j = toJsonResume(developerSample())
    assert.equal(j.basics?.name, 'Aarav Mehta')
    assert.equal(j.basics?.label, 'Full-Stack Developer')
    assert.equal(j.basics?.url, 'https://aarav.dev')
    assert.deepEqual(j.basics?.location, { city: 'Bengaluru', region: 'India' })
    assert.deepEqual(
      (j.basics?.profiles as { network: string }[]).map((p) => p.network),
      ['LinkedIn', 'GitHub'],
    )
    const work = j.work![0]
    assert.equal(work.name, 'Finlytics Technologies')
    assert.equal(work.position, 'Software Engineer')
    assert.equal(work.startDate, '2024-07')
    assert.equal(work.endDate, undefined) // current role
    assert.equal((work.highlights as string[]).length, 4)
    assert.deepEqual(j.education![0], { institution: 'RV College of Engineering', studyType: 'B.Tech', area: 'Computer Science & Engineering', location: 'Bengaluru', startDate: '2020', endDate: '2024', score: 'CGPA 8.7 / 10' })
    assert.equal(j.skills![0].level, 'Expert')
    assert.equal(j.languages![0].fluency, 'Native / bilingual')
  })

  it('round-trips ResumeForge → JSON Resume → ResumeForge losslessly', () => {
    for (const sample of [developerSample(), researcherSample()]) {
      sample.sections.push(createSection('custom', 'Talks', { items: [createEntry('custom', { title: 'React India', subtitle: 'Speaker', start: '2025-09', bullets: ['Spoke about **performance**'] })] }))
      sample.sections[1].hidden = true
      const back = fromJsonResume(JSON.parse(JSON.stringify(toJsonResume(sample))))
      assert.deepEqual(withoutIds(back), withoutIds(sample))
    }
  })

  it('imports a third-party JSON Resume without ResumeForge metadata', () => {
    const data = fromJsonResume({
      basics: { name: 'Riya Shah', label: 'Designer', email: 'riya@example.com', location: { city: 'Pune', countryCode: 'IN' }, profiles: [{ network: 'LinkedIn', username: 'riyashah' }] },
      work: [{ name: 'Studio', position: 'Product Designer', startDate: '2022-03-01', highlights: ['Redesigned onboarding'] }],
      skills: [{ name: 'Design', level: 'Master', keywords: ['Figma'] }],
      languages: [{ language: 'Gujarati', fluency: 'Native speaker' }],
    })
    assert.equal(data.basics.location, 'Pune, IN')
    assert.equal(data.basics.linkedin, 'linkedin.com/in/riyashah')
    const exp = data.sections.find((s) => s.kind === 'experience')!
    assert.equal(exp.items[0].start, '2022-03')
    assert.equal(exp.items[0].current, true)
    assert.equal(data.sections.find((s) => s.kind === 'skills')!.items[0].level, 5)
    assert.equal(data.sections.find((s) => s.kind === 'languages')!.items[0].level, 5)
  })

  it('maps proficiency words to levels', () => {
    assert.equal(levelFromText('Advanced', 'skills'), 4)
    assert.equal(levelFromText('3', 'skills'), 3)
    assert.equal(levelFromText('Conversational', 'languages'), 2)
    assert.equal(levelFromText('', 'languages'), 0)
  })
})

describe('importer', () => {
  it('detects every supported format', () => {
    const doc = makeDoc('developer')
    assert.equal(importJson(exportDoc(doc)).format, 'resumeforge')
    assert.equal(importJson(toJsonResume(doc.data)).format, 'json-resume')
    assert.equal(importJson({ basics: { name: 'Old' }, experience: [{ role: 'Dev', company: 'X', start: 'Jan 2020', end: 'Present', bullets: 'Did a\nDid b' }] }).format, 'resumeforge-v1')
    assert.throws(() => importJson({ hello: 'world' }), /Unrecognised/)
  })

  it('keeps design and name from ResumeForge exports', () => {
    const doc = makeDoc('developer', 'Tailored — Acme', { template: 'tech', accent: '#0f766e' })
    const back = importJson(JSON.parse(JSON.stringify(exportDoc(doc))))
    assert.equal(back.name, 'Tailored — Acme')
    assert.equal(back.design?.template, 'tech')
    assert.equal(back.design?.accent, '#0f766e')
  })
})

describe('text exports', () => {
  const data = developerSample()
  const md = toMarkdown(data, { dateFormat: 'MMM YYYY' })
  const txt = toPlainText(data, { dateFormat: 'MMM YYYY' })

  it('writes markdown with headings, meta lines and bullets', () => {
    assert.ok(md.startsWith('# Aarav Mehta\n**Full-Stack Developer**'))
    assert.ok(md.includes('[aarav.dev](https://aarav.dev)'))
    assert.ok(md.includes('## Experience'))
    assert.ok(md.includes('### Software Engineer — Finlytics Technologies\n*Jul 2024 – Present · Bengaluru*'))
    assert.ok(md.includes('- Built a real-time portfolio dashboard in Next.js and WebSockets used by **200k+ monthly users**'))
    assert.ok(md.includes('- **Languages:** TypeScript, JavaScript, Python, Java, SQL'))
    assert.ok(md.includes('- English — Native / bilingual'))
  })

  it('writes ATS plain text without markdown or fancy punctuation', () => {
    assert.ok(txt.startsWith('AARAV MEHTA\nFull-Stack Developer\naarav.mehta@example.com | +91 98765 43210 | Bengaluru, India'))
    assert.ok(txt.includes('\nEXPERIENCE\nSoftware Engineer, Finlytics Technologies\nJul 2024 - Present | Bengaluru\n- Built'))
    assert.ok(!/[*`#–—]/.test(txt), 'no markdown markers or en dashes')
    assert.ok(txt.includes('Technologies: Next.js, TypeScript, Tailwind CSS, Zustand'))
  })

  it('omits hidden and empty sections', () => {
    const d = developerSample()
    d.sections.find((s) => s.kind === 'projects')!.hidden = true
    d.sections.push(createSection('awards'))
    const out = toPlainText(d, { dateFormat: 'YYYY' })
    assert.ok(!out.includes('PROJECTS'))
    assert.ok(!out.includes('AWARDS'))
    assert.ok(out.includes('2024 - Present'))
  })
})

describe('share links', () => {
  it('round-trips through the URL hash', () => {
    const data = researcherSample()
    const design = { ...defaultDesign, template: 'elegant' as const, accent: '#be123c' }
    const encoded = encodeShare({ data, design })
    assert.match(encoded, /^r1\.[A-Za-z0-9+\-$]+$/)
    const back = decodeShare(encoded)!
    assert.deepEqual(withoutIds(back.data), withoutIds(data))
    assert.deepEqual(back.design, design)
  })

  it('drops the photo unless asked to include it', () => {
    const data = developerSample()
    data.basics.photo = 'data:image/jpeg;base64,AAAA'
    assert.equal(decodeShare(encodeShare({ data, design: defaultDesign }))!.data.basics.photo, '')
    assert.equal(decodeShare(encodeShare({ data, design: defaultDesign }, { includePhoto: true }))!.data.basics.photo, 'data:image/jpeg;base64,AAAA')
  })

  it('compresses well and builds a hash route', () => {
    const data = developerSample()
    const url = shareUrl('https://resumeforge-jeevan.vercel.app/#/edit/x', { data, design: defaultDesign })
    assert.ok(url.startsWith('https://resumeforge-jeevan.vercel.app/#/view/r1.'))
    assert.ok(url.length < JSON.stringify(data).length * 0.7, `${url.length} vs ${JSON.stringify(data).length}`)
  })

  it('rejects garbage', () => {
    assert.equal(decodeShare('nope'), null)
    assert.equal(decodeShare('r1.@@@'), null)
    assert.equal(decodeShare(''), null)
  })
})
