import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import JSZip from 'jszip'
import { defaultDesign } from '../src/lib/design.ts'
import { docxModelText, docxTheme, hasLetterContent, inlineRuns, letterDocxModel, mmToTwip, resumeDocxModel, type DocxPara } from '../src/lib/docxModel.ts'
import { Packer, renderDocx } from '../src/lib/docxRender.ts'
import { kitchenSinkData } from '../src/lib/fixtures.ts'
import { emptyCoverLetter } from '../src/lib/normalize.ts'
import { blankData, developerSample } from '../src/lib/samples.ts'
import { createEntry, createSection } from '../src/lib/sections.ts'
import type { Design } from '../src/lib/types.ts'

const design: Design = { ...defaultDesign }
const text = (p: DocxPara) => p.runs.map((r) => r.text).join('')
const kinds = (ps: DocxPara[], kind: DocxPara['kind']) => ps.filter((p) => p.kind === kind)

describe('docx model — inline runs', () => {
  it('maps markdown to bold/italic/code/link runs', () => {
    const runs = inlineRuns('Cut **costs** by *23%* with `SQL` — [docs](example.com/x)')
    assert.deepEqual(
      runs.map((r) => [r.text, !!r.bold, !!r.italic, !!r.code, r.href ?? null]),
      [
        ['Cut ', false, false, false, null],
        ['costs', true, false, false, null],
        [' by ', false, false, false, null],
        ['23%', false, true, false, null],
        [' with ', false, false, false, null],
        ['SQL', false, false, true, null],
        [' — ', false, false, false, null],
        ['docs', false, false, false, 'https://example.com/x'],
      ],
    )
  })

  it('turns newlines into soft breaks and drops unsafe links', () => {
    const runs = inlineRuns('line one\nline **two**\n[x](javascript:alert(1))')
    assert.equal(runs.filter((r) => r.breakBefore).length, 2)
    assert.equal(runs[1].text, 'line ')
    assert.ok(runs[1].breakBefore)
    assert.ok(runs.every((r) => !r.href), 'javascript: link removed')
    assert.ok(runs.some((r) => r.text === 'x'), 'label kept')
  })
})

describe('docx model — resume', () => {
  const model = resumeDocxModel(developerSample(), design)
  const ps = model.paragraphs

  it('starts with name, headline and a linked contact line', () => {
    assert.deepEqual(
      ps.slice(0, 3).map((p) => p.kind),
      ['name', 'headline', 'contact'],
    )
    assert.equal(text(ps[0]), 'Aarav Mehta')
    assert.equal(text(ps[1]), 'Full-Stack Developer')
    const hrefs = ps[2].runs.map((r) => r.href).filter(Boolean)
    assert.ok(hrefs.includes('mailto:aarav.mehta@example.com'))
    assert.ok(hrefs.includes('https://aarav.dev'))
    assert.ok(hrefs.includes('https://linkedin.com/in/aaravmehta'))
  })

  it('has one heading per visible section, in order', () => {
    assert.deepEqual(
      kinds(ps, 'heading').map(text),
      developerSample()
        .sections.filter((s) => !s.hidden)
        .map((s) => s.title),
    )
    assert.ok(kinds(ps, 'heading').every((p) => p.keepNext && p.gapBefore === 'section'))
  })

  it('lays out entries: bold title ⇥ date, italic subtitle ⇥ location, bullets', () => {
    const head = ps.find((p) => p.kind === 'entry-head' && text(p) === 'Software Engineer')!
    assert.ok(head.runs[0].bold)
    assert.equal(head.right?.[0].text, 'Jul 2024 – Present')
    const sub = ps[ps.indexOf(head) + 1]
    assert.equal(sub.kind, 'entry-sub')
    assert.equal(text(sub), 'Finlytics Technologies')
    assert.ok(sub.runs[0].italic)
    assert.equal(sub.right?.[0].text, 'Bengaluru')
    const bullets = ps.slice(ps.indexOf(sub) + 1, ps.indexOf(sub) + 5)
    assert.ok(bullets.every((p) => p.kind === 'bullet'))
    assert.ok(bullets[0].runs.some((r) => r.bold && r.text === '200k+ monthly users'))
    // the entry stays together; the last line releases the keep
    assert.ok(head.keepNext && sub.keepNext && bullets[2].keepNext && !bullets[3].keepNext)
  })

  it('puts a lone project link on the head line and lists the tech stack', () => {
    const head = ps.find((p) => p.kind === 'entry-head' && text(p).startsWith('Sabzee'))!
    assert.ok(head.runs.some((r) => r.href === 'https://sabzee.vercel.app'))
    const tech = ps[ps.indexOf(head) + 1]
    assert.equal(text(tech), 'Tech stack: Next.js, TypeScript, Tailwind CSS, Zustand')
  })

  it('writes skills as "Group: a, b" lines and languages on one line', () => {
    const all = docxModelText(model)
    assert.ok(all.includes('Languages: TypeScript, JavaScript, Python, Java, SQL  —  Expert'))
    assert.ok(all.includes('English (Native / bilingual)   ·   Hindi'))
    assert.ok(all.includes('Grade / GPA: CGPA 8.7 / 10'))
  })

  it('omits hidden and empty sections and honours the date format', () => {
    const d = developerSample()
    d.sections.find((s) => s.kind === 'projects')!.hidden = true
    d.sections.push(createSection('awards'))
    const t = docxModelText(resumeDocxModel(d, { ...design, dateFormat: 'MM/YYYY' }))
    assert.ok(!t.includes('Projects'))
    assert.ok(!t.includes('Awards'))
    assert.ok(t.includes('07/2024 – Present'))
  })

  it('handles every section kind (kitchen sink) and a blank resume', () => {
    const t = docxModelText(resumeDocxModel(kitchenSinkData(), design))
    for (const s of ['Talks & workshops', 'References', 'Interests', 'Volunteering', 'Hierarchical Transformers']) assert.ok(t.includes(s), s)
    assert.ok(t.includes('anil.rao@example.com'))
    const blank = resumeDocxModel(blankData(), design)
    assert.equal(text(blank.paragraphs[0]), 'Your Name')
  })

  it('links reference contacts', () => {
    const d = blankData()
    d.sections.push(createSection('references', 'References', { items: [createEntry('references', { title: 'Kavya Rao', subtitle: 'EM, Acme', meta: 'kavya@example.com' })] }))
    const meta = resumeDocxModel(d, design).paragraphs.find((p) => p.kind === 'entry-meta')!
    assert.equal(meta.runs[0].href, 'mailto:kavya@example.com')
  })
})

describe('docx model — theme', () => {
  it('maps paper, margins, fonts, size and heading case', () => {
    const a4 = docxTheme(design, { fontId: 'merriweather', headingCase: 'normal' })
    assert.deepEqual(a4.page, { width: 11906, height: 16838, margin: mmToTwip(14) })
    assert.equal(a4.font, 'Georgia')
    assert.equal(a4.sizePt, 10)
    assert.equal(a4.headingCase, 'normal')
    const letter = docxTheme({ ...design, paper: 'letter', fontSize: 15, margin: 20 })
    assert.deepEqual(letter.page, { width: 12240, height: 15840, margin: mmToTwip(20) })
    assert.equal(letter.sizePt, 11.5)
    assert.equal(letter.font, 'Calibri')
  })

  it('keeps accent text readable but uses the raw accent for rules', () => {
    const t = docxTheme({ ...design, accent: '#fde68a' })
    assert.equal(t.rule, 'FDE68A')
    assert.notEqual(t.accent, 'FDE68A')
    assert.match(t.accent, /^[0-9A-F]{6}$/)
  })

  it('centres the header for classic-style templates', () => {
    assert.equal(docxTheme({ ...design, template: 'classic' }).align, 'center')
    assert.equal(docxTheme({ ...design, template: 'modern' }).align, 'left')
  })
})

describe('docx model — cover letter', () => {
  const data = developerSample()
  const letter = { ...emptyCoverLetter, recipient: 'Ms. Kavya Rao', company: 'Acme', address: '1 Main St\nPune', date: '2026-10-20', role: 'Frontend Engineer', body: 'First **para**.\n\nSecond para.', signature: '' }

  it('has header, date, recipient, subject, greeting, paragraphs and sign-off', () => {
    const m = letterDocxModel(letter, data, design)
    assert.deepEqual(
      m.paragraphs.map((p) => p.kind),
      ['name', 'headline', 'contact', 'letter-date', 'letter-recipient', 'letter-subject', 'letter-greeting', 'letter-body', 'letter-body', 'letter-closing', 'letter-signature'],
    )
    const t = docxModelText(m)
    assert.ok(t.includes('20 October 2026'))
    assert.ok(t.includes('Ms. Kavya Rao\nAcme\n1 Main St\nPune'))
    assert.ok(t.includes('Re: Frontend Engineer'))
    assert.ok(t.includes('Dear Hiring Manager,'))
    assert.ok(t.endsWith('Sincerely,\nAarav Mehta'))
    assert.ok(m.paragraphs[2].ruleBelow)
    assert.equal(m.meta.title, 'Aarav Mehta — Cover letter')
  })

  it('knows when a letter is empty', () => {
    assert.equal(hasLetterContent(emptyCoverLetter), false)
    assert.equal(hasLetterContent(letter), true)
  })
})

describe('docx render', () => {
  async function unzip(model: Parameters<typeof renderDocx>[0]) {
    const buf = await Packer.toBuffer(renderDocx(model))
    assert.equal(buf.subarray(0, 2).toString(), 'PK')
    const zip = await JSZip.loadAsync(buf)
    const read = (p: string) => zip.file(p)!.async('string')
    return { doc: await read('word/document.xml'), styles: await read('word/styles.xml'), numbering: await read('word/numbering.xml'), rels: await read('word/_rels/document.xml.rels'), core: await read('docProps/core.xml') }
  }

  it('produces a valid .docx with name, headings, bullets, tab stops and hyperlinks', async () => {
    const { doc, styles, numbering, rels, core } = await unzip(resumeDocxModel(developerSample(), { ...design, accent: '#0f766e' }, { fontId: 'plex' }))
    assert.ok(doc.includes('Aarav Mehta'))
    for (const h of ['Summary', 'Experience', 'Projects', 'Skills', 'Education']) assert.ok(doc.includes(`>${h}<`), h)
    assert.ok(doc.includes('w:val="Title"'), 'name uses the Title style')
    assert.equal((doc.match(/w:val="Heading1"/g) ?? []).length, 7, 'one Heading 1 per section')
    assert.ok(doc.includes('w:numPr'), 'real list numbering for bullets')
    assert.ok(/<w:tab w:val="right" w:pos="\d+"\/>/.test(doc), 'right-aligned tab stop')
    assert.ok(doc.includes('<w:pgSz w:w="11906" w:h="16838"'), 'A4 page size')
    assert.ok(doc.includes('w:hyperlink'))
    assert.ok(rels.includes('mailto:aarav.mehta@example.com'))
    assert.ok(rels.includes('https://github.com/aaravmehta'))
    assert.ok(styles.includes('Arial'), 'font pairing → Word font')
    assert.ok(styles.includes('0F766E'), 'accent colour')
    assert.ok(numbering.includes('•'))
    assert.ok(core.includes('Aarav Mehta — Resume'))
  })

  it('renders a US Letter cover letter', async () => {
    const { doc } = await unzip(letterDocxModel({ ...emptyCoverLetter, body: 'Hello **there**.' }, developerSample(), { ...design, paper: 'letter' }))
    assert.ok(doc.includes('<w:pgSz w:w="12240" w:h="15840"'))
    assert.ok(doc.includes('Dear Hiring Manager,'))
    assert.ok(doc.includes('Sincerely,'))
  })
})
