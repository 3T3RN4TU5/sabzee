import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { exportDoc, exportJsonResume } from '../src/lib/importer.ts'
import { checkImportFile, formatBytes, MAX_IMPORT_BYTES, parseImportText, shareLevel, summarizeImport, uniqueName } from '../src/lib/ioHelpers.ts'
import { makeDoc } from '../src/lib/samples.ts'

describe('checkImportFile', () => {
  it('accepts json and unknown text files', () => {
    assert.equal(checkImportFile({ name: 'resume.json', size: 1200 }), null)
    assert.equal(checkImportFile({ name: 'backup', size: 1200 }), null)
  })
  it('rejects documents, images, empty and huge files with a reason', () => {
    assert.match(checkImportFile({ name: 'CV.pdf', size: 1000 })!, /PDF document.*\.json files/)
    assert.match(checkImportFile({ name: 'CV.DOCX', size: 1000 })!, /Word document/)
    assert.match(checkImportFile({ name: 'me.png', size: 1000 })!, /an image/)
    assert.match(checkImportFile({ name: 'x.json', size: 0 })!, /empty/)
    assert.match(checkImportFile({ name: 'x.json', size: MAX_IMPORT_BYTES + 1 })!, /too large \(5\.0 MB\)/)
  })
})

describe('parseImportText', () => {
  const doc = makeDoc('developer', 'Tailored — Acme', { template: 'tech' })

  it('detects ResumeForge backups (with BOM) and JSON Resume', () => {
    const rf = parseImportText(`﻿${JSON.stringify(exportDoc(doc))}`)
    assert.equal(rf.format, 'resumeforge')
    assert.equal(rf.name, 'Tailored — Acme')
    const jr = parseImportText(JSON.stringify(exportJsonResume(doc)))
    assert.equal(jr.format, 'json-resume')
    assert.equal(jr.data.basics.name, 'Aarav Mehta')
  })

  it('detects the legacy v1 export', () => {
    const v1 = parseImportText(JSON.stringify({ basics: { name: 'Old Timer' }, experience: [{ role: 'Dev', company: 'X', start: 'Jan 2020', end: 'Present', bullets: 'a\nb' }] }))
    assert.equal(v1.format, 'resumeforge-v1')
  })

  it('explains invalid input', () => {
    assert.throws(() => parseImportText('  '), /empty/)
    assert.throws(() => parseImportText('{\n  "a": 1,\n}'), /valid JSON \(problem near line 3, column 1\)/)
    assert.throws(() => parseImportText('[1,2]'), /is a list/)
    assert.throws(() => parseImportText('42'), /doesn’t contain a resume/)
    assert.throws(() => parseImportText('{"hello":"world"}'), /doesn’t look like a resume.*JSON Resume/)
  })
})

describe('summarizeImport', () => {
  it('summarises sections, entries and extras', () => {
    const doc = makeDoc('developer')
    doc.coverLetter.body = 'Dear team…'
    doc.jobDescription = 'We need React'
    const s = summarizeImport(parseImportText(JSON.stringify(exportDoc(doc))))
    assert.equal(s.formatLabel, 'ResumeForge backup')
    assert.equal(s.person, 'Aarav Mehta')
    assert.equal(s.headline, 'Full-Stack Developer')
    assert.equal(s.template, 'modern')
    assert.ok(s.hasCoverLetter && s.hasJobDescription && !s.hasPhoto && !s.isEmpty)
    const exp = s.sections.find((x) => x.kind === 'experience')!
    assert.equal(exp.count, 2)
    assert.equal(s.bulletCount, 7)
    assert.equal(s.entryCount, s.sections.filter((x) => x.kind !== 'summary').reduce((n, x) => n + x.count, 0))
  })

  it('flags empty files and JSON Resume has no design', () => {
    const s = summarizeImport(parseImportText(JSON.stringify({ basics: {}, work: [] })))
    assert.equal(s.template, null)
    assert.ok(s.isEmpty)
  })
})

describe('misc', () => {
  it('uniqueName adds a counter', () => {
    assert.equal(uniqueName('Aarav', ['Bea']), 'Aarav')
    assert.equal(uniqueName('Aarav', ['aarav']), 'Aarav (2)')
    assert.equal(uniqueName('Aarav (2)', ['Aarav', 'Aarav (2)']), 'Aarav (3)')
    assert.equal(uniqueName('  ', []), 'Imported resume')
  })
  it('shareLevel thresholds and formatBytes', () => {
    assert.equal(shareLevel(1500), 'ok')
    assert.equal(shareLevel(2500), 'ok')
    assert.equal(shareLevel(5000), 'long')
    assert.equal(shareLevel(20000), 'very-long')
    assert.equal(formatBytes(512), '512 B')
    assert.equal(formatBytes(2048), '2.0 KB')
    assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB')
  })
})
