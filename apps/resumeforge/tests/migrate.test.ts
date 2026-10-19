import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatDate, formatRange, monthsBetween, parseLooseDate } from '../src/lib/dates.ts'
import { emptyHistory, record, redo, undo } from '../src/lib/history.ts'
import { initialState, migratePersisted, STORE_VERSION } from '../src/lib/migrate.ts'
import { distribute, zipColumns } from '../src/lib/paginate.ts'
import { printFilename } from '../src/lib/filename.ts'

/** Exactly what the original single-resume app wrote to localStorage['resumeforge-v1'].state */
const legacyState = {
  resume: {
    basics: {
      name: 'Aarav Mehta',
      title: 'Full-Stack Developer',
      email: 'aarav.mehta@example.com',
      phone: '+91 98765 43210',
      location: 'Bengaluru, India',
      website: 'aarav.dev',
      linkedin: 'linkedin.com/in/aaravmehta',
      github: 'github.com/aaravmehta',
      summary: 'Full-stack developer with 2+ years of experience.',
    },
    experience: [
      { id: 'e1', role: 'Software Engineer', company: 'Finlytics', location: 'Bengaluru', start: 'Jul 2024', end: '', current: true, bullets: 'Built a dashboard\n\n  Reduced LCP by 45%  ' },
      { id: 'e2', role: 'Intern', company: 'Kirana Cloud', location: 'Remote', start: 'Jan 2024', end: 'Jun 2024', current: false, bullets: 'Developed 15+ components' },
    ],
    education: [{ id: 'ed1', degree: 'B.Tech, CSE', school: 'RVCE', start: '2020', end: '2024', score: 'CGPA 8.7 / 10' }],
    projects: [{ id: 'p1', name: 'Sabzee', link: 'sabzee.vercel.app', tech: 'Next.js, TypeScript , Tailwind CSS', description: 'Grocery storefront' }],
    skills: [{ id: 's1', group: 'Languages', items: 'TypeScript, JavaScript,Python' }],
    certifications: [{ id: 'c1', name: 'AWS CCP', issuer: 'AWS', year: '2025' }],
  },
  settings: { template: 'classic', accent: '#0f766e', order: ['experience', 'summary', 'skills', 'projects', 'education', 'certifications'], hidden: ['certifications'] },
}

describe('store migration v0 → v2', () => {
  const state = migratePersisted(structuredClone(legacyState), 0)

  it('creates a single active resume', () => {
    assert.equal(STORE_VERSION, 2)
    assert.equal(state.resumes.length, 1)
    assert.equal(state.activeId, state.resumes[0].id)
    assert.equal(state.resumes[0].name, 'Aarav Mehta — Full-Stack Developer')
    assert.equal(state.theme, 'system')
  })

  it('keeps the section order, visibility and design', () => {
    const doc = state.resumes[0]
    assert.deepEqual(
      doc.data.sections.map((s) => s.kind),
      ['experience', 'summary', 'skills', 'projects', 'education', 'certifications'],
    )
    assert.equal(doc.data.sections.find((s) => s.kind === 'certifications')!.hidden, true)
    assert.equal(doc.design.template, 'classic')
    assert.equal(doc.design.accent, '#0f766e')
  })

  it('converts every field', () => {
    const doc = state.resumes[0]
    const sec = (k: string) => doc.data.sections.find((s) => s.kind === k)!
    assert.equal(sec('summary').content, 'Full-stack developer with 2+ years of experience.')
    assert.equal(doc.data.basics.github, 'github.com/aaravmehta')
    const [e1, e2] = sec('experience').items
    assert.deepEqual([e1.title, e1.subtitle, e1.start, e1.end, e1.current], ['Software Engineer', 'Finlytics', '2024-07', '', true])
    assert.deepEqual(e1.bullets, ['Built a dashboard', 'Reduced LCP by 45%'])
    assert.deepEqual([e2.start, e2.end, e2.current], ['2024-01', '2024-06', false])
    assert.deepEqual(sec('projects').items[0].keywords, ['Next.js', 'TypeScript', 'Tailwind CSS'])
    assert.equal(sec('projects').items[0].url, 'sabzee.vercel.app')
    assert.equal(sec('education').items[0].meta, 'CGPA 8.7 / 10')
    assert.deepEqual(sec('skills').items[0].keywords, ['TypeScript', 'JavaScript', 'Python'])
    assert.equal(sec('certifications').items[0].start, '2025')
  })

  it('survives partial / corrupt legacy data', () => {
    const s = migratePersisted({ resume: { basics: { name: 'X' } }, settings: { template: 'nope', accent: 'red', order: ['bogus', 'skills', 'skills'] } }, 0)
    const doc = s.resumes[0]
    assert.equal(doc.design.template, 'modern')
    assert.equal(doc.design.accent, '#4f46e5')
    assert.equal(doc.data.sections.length, 6)
    assert.equal(doc.data.sections[0].kind, 'skills')
  })

  it('falls back to a fresh state for garbage and normalises v2 data', () => {
    assert.equal(migratePersisted(null, 0).resumes.length, 1)
    assert.equal(migratePersisted('junk', 1).resumes.length, 1)
    const fresh = initialState()
    const v2 = migratePersisted({ ...fresh, activeId: 'missing', theme: 'neon' }, 2)
    assert.equal(v2.activeId, fresh.resumes[0].id)
    assert.equal(v2.theme, 'system')
  })
})

describe('dates', () => {
  it('parses loose legacy dates', () => {
    assert.deepEqual(parseLooseDate('Jul 2024'), { value: '2024-07', present: false })
    assert.deepEqual(parseLooseDate('September 2021'), { value: '2021-09', present: false })
    assert.deepEqual(parseLooseDate('07/2024'), { value: '2024-07', present: false })
    assert.deepEqual(parseLooseDate('Present'), { value: '', present: true })
    assert.deepEqual(parseLooseDate('Summer 2019'), { value: 'Summer 2019', present: false })
  })

  it('formats dates and ranges', () => {
    assert.equal(formatDate('2024-07', 'MMM YYYY'), 'Jul 2024')
    assert.equal(formatDate('2024-07', 'MMMM YYYY'), 'July 2024')
    assert.equal(formatDate('2024-07', 'MM/YYYY'), '07/2024')
    assert.equal(formatDate('2024-07', 'YYYY'), '2024')
    assert.equal(formatDate('2020', 'MMM YYYY'), '2020')
    assert.equal(formatRange('2024-01', '2024-06', false, 'MMM YYYY'), 'Jan 2024 – Jun 2024')
    assert.equal(formatRange('2024-07', '', true, 'MMM YYYY'), 'Jul 2024 – Present')
    assert.equal(monthsBetween('2024-01', '2024-06', false), 6)
  })
})

describe('undo history', () => {
  it('records, undoes and redoes', () => {
    let h = emptyHistory<number>()
    h = record(h, 1, undefined, 0)
    h = record(h, 2, undefined, 10)
    const u = undo(h, 3)!
    assert.equal(u.value, 2)
    const r = redo(u.history, u.value)!
    assert.equal(r.value, 3)
    assert.equal(undo(emptyHistory<number>(), 1), null)
  })

  it('coalesces rapid edits to the same field', () => {
    let h = emptyHistory<string>()
    h = record(h, 'a', 'name', 0)
    h = record(h, 'ab', 'name', 300)
    h = record(h, 'abc', 'name', 600)
    assert.equal(h.past.length, 1)
    h = record(h, 'abcd', 'title', 700)
    assert.equal(h.past.length, 2)
    h = record(h, 'x', 'title', 5000)
    assert.equal(h.past.length, 3)
  })

  it('caps the stack size', () => {
    let h = emptyHistory<number>()
    for (let i = 0; i < 150; i++) h = record(h, i, undefined, i, 100)
    assert.equal(h.past.length, 100)
    assert.equal(h.past[0], 50)
  })
})

describe('pagination', () => {
  it('moves whole blocks to the next page', () => {
    const blocks = [100, 300, 400, 250, 120].map((height) => ({ height, gap: 10 }))
    assert.deepEqual(
      distribute(blocks, (p) => (p === 0 ? 800 : 1000)),
      [[0, 1, 2], [3, 4]],
    )
  })

  it('lets the trailing gap overflow and never leaves a page empty', () => {
    assert.deepEqual(
      distribute([{ height: 505, gap: 10 }, { height: 505, gap: 10 }], () => 1000),
      [[0, 1]],
    )
    assert.deepEqual(distribute([{ height: 2000, gap: 0 }, { height: 10, gap: 0 }], () => 1000), [[0], [1]])
  })

  it('zips columns into pages', () => {
    assert.deepEqual(zipColumns({ main: [[0, 1], [2]], side: [[0]] }), [
      { main: [0, 1], side: [0] },
      { main: [2], side: [] },
    ])
    assert.deepEqual(zipColumns({ main: [[]], side: [[]] }), [{ main: [], side: [] }])
  })
})

describe('print filename', () => {
  it('is filesystem friendly', () => {
    assert.equal(printFilename('Aarav Mehta'), 'Aarav_Mehta_Resume')
    assert.equal(printFilename('Dr. Meera Iyer'), 'Meera_Iyer_Resume')
    assert.equal(printFilename('José  Núñez', 'Cover_Letter'), 'Jose_Nunez_Cover_Letter')
    assert.equal(printFilename(''), 'Resume')
  })
})
