"use client";

import { ArrowRight, Check, ChevronDown, Flag, Lightbulb, TrendingUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Chip, VerdictBadge } from "@/components/ui/badges";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { Evaluation } from "@/lib/schemas";

interface FeedbackCardProps {
  evaluation: Evaluation;
  isLast: boolean;
  onNext: () => void;
}

export function FeedbackCard({ evaluation, isLast, onNext }: FeedbackCardProps) {
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [showIdeal, setShowIdeal] = useState(false);

  // Move focus to the feedback so keyboard and screen-reader users land on it.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="animate-fade-up scroll-mt-24 rounded-3xl border border-white/10 bg-ink-900/80 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing score={evaluation.score} label="Answer score" />
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-heading`} ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-white focus:outline-none">
            Feedback on your answer
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <VerdictBadge verdict={evaluation.verdict} />
            <Chip>
              <Flag className="size-3" aria-hidden />
              {evaluation.competency}
            </Chip>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <Check className="size-4" aria-hidden />
            What worked
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
            {evaluation.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <TrendingUp className="size-4" aria-hidden />
            How to improve
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
            {evaluation.improvements.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => setShowIdeal((value) => !value)}
          aria-expanded={showIdeal}
          aria-controls={`${id}-ideal`}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-zinc-200 transition hover:bg-white/[0.03]"
        >
          <span className="flex items-center gap-2">
            <Lightbulb className="size-4 text-violet-300" aria-hidden />
            {showIdeal ? "Hide model answer" : "Show a model answer"}
          </span>
          <ChevronDown className={`size-4 text-zinc-400 transition ${showIdeal ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <div id={`${id}-ideal`} hidden={!showIdeal} className="border-t border-white/10 px-4 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-300">{evaluation.idealAnswer}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="group inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200"
        >
          {isLast ? "Finish & see report" : "Next question"}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
