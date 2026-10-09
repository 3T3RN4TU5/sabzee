import { ArrowRight, Check, FileText, Gauge, Mic, ShieldCheck, Sparkles, Target } from "lucide-react";
import { ResumeBanner } from "@/components/setup/ResumeBanner";
import { SetupForm } from "@/components/setup/SetupForm";
import { ScoreRing } from "@/components/ui/ScoreRing";

const STEPS = [
  {
    icon: Target,
    title: "Set the scene",
    body: "Choose your target role, seniority and interview style. Paste a job description to get questions tailored to it.",
  },
  {
    icon: Mic,
    title: "Answer out loud or in writing",
    body: "The interviewer asks one question at a time and adapts follow-ups to what you said. Dictate with your voice or type.",
  },
  {
    icon: Gauge,
    title: "Get coached instantly",
    body: "Every answer gets a score out of 10, specific strengths, concrete improvements and a model answer to learn from.",
  },
  {
    icon: FileText,
    title: "Know where you stand",
    body: "Finish with an overall score, a readiness verdict, competency breakdown and a practice plan you can download.",
  },
];

const STATS = [
  { value: "7", label: "target roles" },
  { value: "4", label: "seniority levels" },
  { value: "80+", label: "curated questions" },
  { value: "0–10", label: "score per answer" },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <SetupSection />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-40 -right-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
            <Sparkles className="size-3.5 text-violet-300" aria-hidden />
            AI mock interviews, powered by Claude
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
            Walk into your next interview{" "}
            <span className="bg-linear-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              already prepared.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Practice with an AI interviewer that asks realistic questions for your role and level, listens to your typed or spoken
            answers, and coaches you with honest scores, model answers and a readiness report.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#setup"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200"
            >
              Start a mock interview
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-zinc-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-2xl font-semibold text-white">{stat.value}</span>
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <PreviewCard />
      </div>
    </section>
  );
}

/** Static illustration of the interview experience (not interactive). */
function PreviewCard() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-linear-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent blur-2xl" />
      <div className="rounded-3xl border border-white/10 bg-ink-900/90 p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Question 3 of 5</span>
          <span className="tabular-nums">01:42</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/5 rounded-full bg-linear-to-r from-violet-400 to-fuchsia-400" />
        </div>

        <div className="mt-5 flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500">
            <Sparkles className="size-4 text-white" />
          </span>
          <p className="rounded-2xl rounded-tl-sm bg-white/[0.05] px-4 py-3 text-sm leading-relaxed text-zinc-200">
            You mentioned caching the product list. How would you keep it fresh when prices change every few minutes?
          </p>
        </div>

        <div className="mt-3 ml-11 rounded-2xl rounded-tr-sm bg-violet-500/15 px-4 py-3 text-sm leading-relaxed text-violet-100">
          I&apos;d use stale-while-revalidate with a short TTL, and invalidate the key whenever the pricing service publishes an
          update…
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <ScoreRing score={8} size={76} strokeWidth={7} />
          <div className="min-w-0 space-y-1.5 text-xs">
            <p className="inline-flex rounded-full bg-emerald-400/10 px-2 py-0.5 font-medium text-emerald-300 ring-1 ring-emerald-400/30 ring-inset">
              Strong answer
            </p>
            <p className="flex gap-1.5 text-zinc-300">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              Explained the trade-off between freshness and load
            </p>
            <p className="flex gap-1.5 text-zinc-400">
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
              Mention how you&apos;d monitor cache hit rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-white/[0.06] bg-ink-900/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-violet-300">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">From nervous to interview-ready</h2>
          <p className="mt-3 text-zinc-400">
            A focused practice loop that mirrors a real interview — then tells you exactly what to improve.
          </p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20 ring-inset">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-zinc-600 tabular-nums">0{index + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SetupSection() {
  return (
    <section id="setup" className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-20 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-violet-600/10 blur-3xl" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div className="lg:pt-2">
          <p className="text-sm font-medium text-violet-300">Your interview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Configure your mock interview</h2>
          <p className="mt-3 text-zinc-400">Takes ten seconds. You can stop at any point and pick up where you left off.</p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              "Questions pitched at your exact role and seniority",
              "Follow-ups that build on your previous answers",
              "Voice answers in Indian English (Chrome & Edge)",
              "Downloadable Markdown report and printable summary",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-zinc-300">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
            <ShieldCheck className="size-5 shrink-0 text-zinc-300" aria-hidden />
            No sign-up. Your answers are sent only to generate feedback, and your history is saved in this browser.
          </p>
        </div>
        <div>
          <ResumeBanner />
          <SetupForm />
        </div>
      </div>
    </section>
  );
}
