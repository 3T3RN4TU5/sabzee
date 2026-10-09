"use client";

import { ArrowRight, Check, Download, History, ListChecks, Plus, Printer, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Chip, ReadinessBadge } from "@/components/ui/badges";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { levelLabel, roleTitle, typeLabel } from "@/lib/constants";
import { downloadTextFile, formatDate, reportFilename, reportToMarkdown } from "@/lib/markdown";
import type { Report, Session } from "@/lib/schemas";
import { CompetencyBars } from "./CompetencyBars";
import { QuestionBreakdown } from "./QuestionBreakdown";

export function ReportView({ session, report }: { session: Session; report: Report }) {
  const { config } = session;
  const answered = session.turns.filter((turn) => !turn.skipped).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-violet-300">Interview report</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {config.name ? `${config.name}'s ` : ""}
            {roleTitle(config.role)} interview
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{formatDate(session.createdAt)}</Chip>
            <Chip>{levelLabel(config.level)}</Chip>
            <Chip>{typeLabel(config.type)}</Chip>
            <Chip>
              {answered}/{session.turns.length} answered
            </Chip>
            <Chip>
              <Sparkles className="size-3" aria-hidden />
              {session.reportMode === "live" ? "Scored by Claude" : "Demo mode scoring"}
            </Chip>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap print:hidden">
          <ActionButton onClick={() => downloadTextFile(reportFilename(session), reportToMarkdown(session, report))} icon={<Download className="size-4" aria-hidden />}>
            Download .md
          </ActionButton>
          <ActionButton onClick={() => window.print()} icon={<Printer className="size-4" aria-hidden />}>
            Print
          </ActionButton>
          <Link
            href="/#setup"
            className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200"
          >
            <Plus className="size-4" aria-hidden />
            New interview
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section
          aria-labelledby="overview-heading"
          className="print-avoid-break relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-500/[0.12] via-white/[0.02] to-transparent p-6 sm:p-7"
        >
          <h2 id="overview-heading" className="sr-only">
            Overview
          </h2>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-5 sm:gap-x-7">
            <div className="sm:row-span-2 sm:self-center">
              <ScoreRing score={report.overallScore} max={100} size={136} strokeWidth={11} label="Overall score" />
            </div>
            <div className="sm:self-end">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Readiness</p>
              <div className="mt-2">
                <ReadinessBadge readiness={report.readiness} large />
              </div>
            </div>
            <p className="col-span-2 leading-relaxed text-zinc-300 sm:col-span-1 sm:col-start-2 sm:self-start">{report.summary}</p>
          </div>
        </section>

        <section aria-labelledby="competency-heading" className="print-avoid-break rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
          <h2 id="competency-heading" className="font-semibold text-white">
            Competencies
          </h2>
          <p className="mt-1 text-xs text-zinc-500">Scored 0–10 from the evidence in your answers</p>
          <div className="mt-5">
            <CompetencyBars competencies={report.competencies} />
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ListCard title="Top strengths" icon={<Check className="size-4 text-emerald-300" aria-hidden />} items={report.topStrengths} empty="Answer a few questions to surface your strengths." />
        <ListCard title="Focus areas" icon={<Target className="size-4 text-amber-300" aria-hidden />} items={report.focusAreas} empty="No major gaps found — keep practicing harder questions." />
        <ListCard title="Next steps" icon={<ListChecks className="size-4 text-violet-300" aria-hidden />} items={report.nextSteps} ordered empty="Retake the interview to track your progress." />
      </div>

      <section aria-labelledby="breakdown-heading" className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="breakdown-heading" className="text-xl font-semibold text-white">
              Question by question
            </h2>
            <p className="mt-1 text-sm text-zinc-400 print:hidden">Open a question to see your answer, feedback and a model answer.</p>
          </div>
        </div>
        <div className="mt-4">
          <QuestionBreakdown turns={session.turns} />
        </div>
      </section>

      <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center sm:flex-row sm:text-left print:hidden">
        <div className="flex-1">
          <p className="font-semibold text-white">Ready for another round?</p>
          <p className="mt-1 text-sm text-zinc-400">Practice compounds — retake the interview in a few days and compare your scores.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/history"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-zinc-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/5"
          >
            <History className="size-4" aria-hidden />
            History
          </Link>
          <Link
            href="/#setup"
            className="group inline-flex h-10 items-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Practice again
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-zinc-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/5"
    >
      {icon}
      {children}
    </button>
  );
}

function ListCard({
  title,
  icon,
  items,
  ordered = false,
  empty,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  ordered?: boolean;
  empty: string;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className="print-avoid-break rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-white">
        {icon}
        {title}
      </h2>
      {items.length ? (
        <List className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-400 tabular-nums" aria-hidden>
                {ordered ? index + 1 : "•"}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </List>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">{empty}</p>
      )}
    </section>
  );
}
