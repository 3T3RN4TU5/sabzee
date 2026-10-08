import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, Code2, Mail, MapPin, Rocket, Sparkles } from "lucide-react";
import { highlights, profile, projects, skills } from "@/data/profile";
import { Nav } from "@/components/Nav";
import { ContactForm } from "@/components/ContactForm";
import { GitHubActivity, GitHubActivitySkeleton } from "@/components/GitHubActivity";
import { GithubIcon, LinkedinIcon } from "@/components/icons";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="top" className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />

        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-5 pt-36 pb-24 sm:pt-44">
          {profile.openToWork && (
            <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Open to full-time roles &amp; internships
            </p>
          )}
          <h1 className="animate-rise mt-6 max-w-4xl text-5xl leading-[1.05] font-bold tracking-tight text-white sm:text-7xl" style={{ animationDelay: "80ms" }}>
            Hi, I&apos;m {profile.name}.
            <span className="block bg-linear-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{profile.role}.</span>
          </h1>
          <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-slate-400" style={{ animationDelay: "160ms" }}>
            {profile.tagline}
          </p>
          <div className="animate-rise mt-10 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <a href="#projects" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-200">
              View my work <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={`https://github.com/${profile.github}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              <GithubIcon className="h-4 w-4" /> GitHub
            </a>
            {profile.linkedin && (
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                <LinkedinIcon className="h-4 w-4" /> LinkedIn
              </a>
            )}
          </div>
          <dl className="animate-rise mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8" style={{ animationDelay: "320ms" }}>
            {highlights.map((h) => (
              <div key={h.label}>
                <dt className="text-3xl font-bold text-white">{h.value}</dt>
                <dd className="mt-1 text-sm text-slate-500">{h.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* About */}
        <Section id="about" eyebrow="About" title="Building products people actually enjoy using">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5 text-lg leading-relaxed text-slate-400">
              {profile.about.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {profile.location && (
                <p className="flex items-center gap-2 text-base text-slate-500">
                  <MapPin className="h-4 w-4" /> Based in {profile.location} · open to remote &amp; relocation
                </p>
              )}
            </div>
            <ul className="space-y-3">
              {[
                { icon: Code2, title: "Clean, typed code", text: "Strict TypeScript, small focused components and predictable state." },
                { icon: Sparkles, title: "UX in the details", text: "Loading & empty states, validation, keyboard support and responsive layouts." },
                { icon: Rocket, title: "Shipped, not just built", text: "Every project is live on Vercel with automatic deploys from GitHub." },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-400">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Projects */}
        <Section id="projects" eyebrow="Projects" title="Selected work" subtitle="Five production-ready apps — each one live, open-source and auto-deployed.">
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((p, i) => (
              <article
                key={p.slug}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] transition hover:border-white/20 ${i === 0 ? "md:col-span-2" : ""}`}
              >
                <div className="relative h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                  <div className="bg-grid absolute inset-0 opacity-60" />
                  <span className="absolute right-8 -bottom-6 text-[7rem] drop-shadow-2xl transition duration-500 group-hover:-translate-y-2 group-hover:rotate-6">{p.emoji}</span>
                  <div className="absolute bottom-5 left-6">
                    <p className="text-xs font-semibold tracking-widest text-white/80 uppercase">{p.tagline}</p>
                    <h3 className="text-3xl font-bold text-white">{p.name}</h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="leading-relaxed text-slate-400">{p.description}</p>
                  <ul className="mt-5 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.to }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.stack.map((s) => (
                      <span key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-slate-300">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-3 pt-6">
                    <a
                      href={p.live}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-200"
                    >
                      Live demo <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <a
                      href={p.source}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                    >
                      <GithubIcon className="h-4 w-4" /> Source
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* Skills */}
        <Section id="skills" eyebrow="Skills" title="My toolkit">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {skills.map((s) => (
              <div key={s.group} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-mono text-sm font-semibold text-violet-300">{s.group}</h3>
                <ul className="mt-4 space-y-2.5">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-violet-400">▹</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* GitHub */}
        <Section id="github" eyebrow="Open source" title="Live from GitHub" subtitle="Fetched from the GitHub API and cached on the server.">
          <Suspense fallback={<GitHubActivitySkeleton />}>
            <GitHubActivity />
          </Suspense>
        </Section>

        {/* Contact */}
        <Section id="contact" eyebrow="Contact" title="Let's build something together">
          <div className="grid gap-10 rounded-3xl border border-white/10 bg-linear-to-br from-violet-500/10 via-transparent to-cyan-500/10 p-8 lg:grid-cols-[1fr_1.2fr] lg:p-12">
            <div>
              <p className="text-lg leading-relaxed text-slate-300">
                I&apos;m currently looking for frontend / full-stack developer roles. Whether you have an opening, a project or just want to say hi, I&apos;d love to hear from you.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                <li>
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-slate-300 hover:text-white">
                    <GithubIcon className="h-5 w-5" /> github.com/{profile.github}
                  </a>
                </li>
                {profile.linkedin && (
                  <li>
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-slate-300 hover:text-white">
                      <LinkedinIcon className="h-5 w-5" /> LinkedIn
                    </a>
                  </li>
                )}
                {profile.email && (
                  <li>
                    <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-3 text-slate-300 hover:text-white">
                      <Mail className="h-5 w-5" /> {profile.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
            {profile.email ? (
              <ContactForm email={profile.email} />
            ) : (
              <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="font-semibold text-white">The fastest way to reach me is on GitHub.</p>
                <p className="mt-2 text-sm text-slate-400">Open an issue on any of my repositories or follow me to see what I&apos;m building next.</p>
                <a
                  href={`https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-violet-200"
                >
                  <GithubIcon className="h-4 w-4" /> Follow @{profile.github}
                </a>
              </div>
            )}
          </div>
        </Section>
      </main>

      <footer className="border-t border-white/5 py-10 text-center text-sm text-slate-500">
        <p>
          Designed &amp; built by {profile.name} with Next.js, TypeScript &amp; Tailwind CSS ·{" "}
          <a href={profile.repoUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
            View source
          </a>
        </p>
      </footer>
    </>
  );
}

function Section({ id, eyebrow, title, subtitle, children }: { id: string; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative mx-auto max-w-6xl px-5 py-20">
      <p className="font-mono text-sm text-violet-400">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-slate-400">{subtitle}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}
