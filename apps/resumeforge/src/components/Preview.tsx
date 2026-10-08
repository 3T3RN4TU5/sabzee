import type { CSSProperties, ReactNode } from 'react'
import type { Resume, SectionId, Settings } from '../lib/types'
import { sectionLabels } from '../lib/types'

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
const dateRange = (start: string, end: string, current?: boolean) => [start, current ? 'Present' : end].filter(Boolean).join(' – ')

function Contact({ resume, separator = ' · ' }: { resume: Resume; separator?: string }) {
  const b = resume.basics
  const parts = [b.email, b.phone, b.location, b.website, b.linkedin, b.github].filter(Boolean)
  return (
    <p className="text-[11px] leading-relaxed text-slate-600">
      {parts.map((p, i) => (
        <span key={p}>
          {i > 0 && <span className="text-slate-300">{separator}</span>}
          {p}
        </span>
      ))}
    </p>
  )
}

function SectionBody({ id, resume, accent }: { id: SectionId; resume: Resume; accent: string }) {
  switch (id) {
    case 'summary':
      return <p className="text-[11.5px] leading-relaxed text-slate-700">{resume.basics.summary}</p>
    case 'experience':
      return (
        <div className="space-y-3">
          {resume.experience.map((e) => (
            <div key={e.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-bold text-slate-900">
                  {e.role}
                  {e.company && <span className="font-semibold" style={{ color: accent }}> · {e.company}</span>}
                </p>
                <p className="shrink-0 text-[10.5px] font-medium text-slate-500">{dateRange(e.start, e.end, e.current)}</p>
              </div>
              {e.location && <p className="text-[10.5px] text-slate-500">{e.location}</p>}
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px] leading-snug text-slate-700 marker:text-slate-400">
                {lines(e.bullets).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )
    case 'projects':
      return (
        <div className="space-y-2.5">
          {resume.projects.map((p) => (
            <div key={p.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-bold text-slate-900">{p.name}</p>
                {p.link && <p className="shrink-0 text-[10.5px] font-medium" style={{ color: accent }}>{p.link}</p>}
              </div>
              {p.tech && <p className="text-[10.5px] font-semibold text-slate-500">{p.tech}</p>}
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-700">{p.description}</p>
            </div>
          ))}
        </div>
      )
    case 'education':
      return (
        <div className="space-y-2">
          {resume.education.map((e) => (
            <div key={e.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] font-bold text-slate-900">{e.degree}</p>
                <p className="shrink-0 text-[10.5px] font-medium text-slate-500">{dateRange(e.start, e.end)}</p>
              </div>
              <p className="text-[11px] text-slate-600">
                {e.school}
                {e.score && <span className="text-slate-400"> · {e.score}</span>}
              </p>
            </div>
          ))}
        </div>
      )
    case 'skills':
      return (
        <div className="space-y-1">
          {resume.skills.map((s) => (
            <p key={s.id} className="text-[11.5px] leading-snug text-slate-700">
              <span className="font-bold text-slate-900">{s.group}: </span>
              {s.items}
            </p>
          ))}
        </div>
      )
    case 'certifications':
      return (
        <ul className="space-y-1">
          {resume.certifications.map((c) => (
            <li key={c.id} className="text-[11.5px] text-slate-700">
              <span className="font-bold text-slate-900">{c.name}</span>
              {c.issuer && ` — ${c.issuer}`}
              {c.year && <span className="text-slate-500"> ({c.year})</span>}
            </li>
          ))}
        </ul>
      )
  }
}

function hasContent(id: SectionId, r: Resume) {
  return id === 'summary' ? Boolean(r.basics.summary.trim()) : r[id].length > 0
}

function SidebarSkills({ resume }: { resume: Resume }) {
  return (
    <div className="space-y-3">
      {resume.skills.map((s) => (
        <div key={s.id}>
          <p className="text-[10.5px] font-bold tracking-wide text-white/70 uppercase">{s.group}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {s.items
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean)
              .map((x) => (
                <span key={x} className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {x}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Preview({ resume, settings }: { resume: Resume; settings: Settings }) {
  const { template, accent, order, hidden } = settings
  const visible = order.filter((id) => !hidden.includes(id) && hasContent(id, resume))
  const b = resume.basics
  const page: CSSProperties = { width: 794, minHeight: 1123 }

  if (template === 'modern') {
    const side: SectionId[] = ['skills', 'education', 'certifications']
    const main = visible.filter((id) => !side.includes(id))
    const aside = visible.filter((id) => side.includes(id))
    return (
      <article className="flex bg-white font-sans text-slate-900 shadow-2xl print:shadow-none" style={page}>
        <aside className="w-[250px] shrink-0 space-y-6 px-6 py-8 text-white" style={{ backgroundColor: accent }}>
          <div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-2xl font-extrabold">
              {b.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'CV'}
            </div>
            <h1 className="mt-4 text-[22px] leading-tight font-extrabold">{b.name || 'Your Name'}</h1>
            <p className="mt-1 text-[12px] font-semibold text-white/80">{b.title}</p>
          </div>
          <div className="space-y-1.5 text-[10.5px] break-all text-white/90">
            {[b.email, b.phone, b.location, b.website, b.linkedin, b.github].filter(Boolean).map((x) => (
              <p key={x}>{x}</p>
            ))}
          </div>
          {aside.map((id) => (
            <section key={id}>
              <h2 className="mb-2 border-b border-white/25 pb-1 text-[11px] font-extrabold tracking-[0.15em] uppercase">{sectionLabels[id]}</h2>
              {id === 'skills' ? (
                <SidebarSkills resume={resume} />
              ) : (
                <div className="[&_*]:!text-white/90 [&_.font-bold]:!text-white">
                  <SectionBody id={id} resume={resume} accent="#fff" />
                </div>
              )}
            </section>
          ))}
        </aside>
        <div className="flex-1 space-y-5 px-8 py-8">
          {main.map((id) => (
            <Section key={id} title={sectionLabels[id]} accent={accent} variant="modern">
              <SectionBody id={id} resume={resume} accent={accent} />
            </Section>
          ))}
        </div>
      </article>
    )
  }

  const classic = template === 'classic'
  return (
    <article className={`bg-white px-12 py-10 text-slate-900 shadow-2xl print:shadow-none ${classic ? 'font-serif' : 'font-sans'}`} style={page}>
      <header className={classic ? 'text-center' : ''}>
        <h1 className={`font-extrabold ${classic ? 'text-[28px] tracking-wide' : 'text-[30px] tracking-tight'}`} style={classic ? undefined : { color: accent }}>
          {b.name || 'Your Name'}
        </h1>
        <p className={`mt-0.5 text-[13px] font-semibold ${classic ? 'tracking-[0.2em] text-slate-600 uppercase' : 'text-slate-700'}`}>{b.title}</p>
        <div className="mt-2">
          <Contact resume={resume} separator={classic ? '  |  ' : ' · '} />
        </div>
      </header>
      <div className="mt-6 space-y-5">
        {visible.map((id) => (
          <Section key={id} title={sectionLabels[id]} accent={accent} variant={template}>
            <SectionBody id={id} resume={resume} accent={classic ? '#334155' : accent} />
          </Section>
        ))}
      </div>
    </article>
  )
}

function Section({ title, accent, variant, children }: { title: string; accent: string; variant: Settings['template']; children: ReactNode }) {
  return (
    <section>
      {variant === 'classic' ? (
        <h2 className="mb-2 border-b-2 border-slate-800 pb-0.5 text-[12px] font-bold tracking-[0.18em] text-slate-800 uppercase">{title}</h2>
      ) : variant === 'modern' ? (
        <h2 className="mb-2 flex items-center gap-2 text-[12px] font-extrabold tracking-[0.15em] uppercase" style={{ color: accent }}>
          {title}
          <span className="h-px flex-1" style={{ backgroundColor: `${accent}40` }} />
        </h2>
      ) : (
        <h2 className="mb-2 text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">{title}</h2>
      )}
      {children}
    </section>
  )
}
