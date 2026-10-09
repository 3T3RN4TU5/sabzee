"use client";

import { ChevronDown, Clock } from "lucide-react";
import { useId, useState } from "react";
import { VerdictBadge } from "@/components/ui/badges";
import { formatDuration, scoreTone, splitInterviewerTurn } from "@/lib/interview";
import type { Turn } from "@/lib/schemas";

const TONE_STYLE = {
  great: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/30",
  good: "bg-sky-400/10 text-sky-200 ring-sky-400/30",
  fair: "bg-amber-400/10 text-amber-200 ring-amber-400/30",
  poor: "bg-rose-400/10 text-rose-200 ring-rose-400/30",
} as const;

export function QuestionBreakdown({ turns }: { turns: Turn[] }) {
  return (
    <ol className="space-y-3">
      {turns.map((turn, index) => (
        <QuestionItem key={index} turn={turn} number={index + 1} />
      ))}
    </ol>
  );
}

function QuestionItem({ turn, number }: { turn: Turn; number: number }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const evaluation = turn.evaluation;
  const { question } = splitInterviewerTurn(turn.question);

  return (
    <li className="print-avoid-break rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`${id}-details`}
        className="flex w-full items-start gap-4 rounded-2xl p-4 text-left transition hover:bg-white/[0.03] sm:p-5"
      >
        <span
          className={`grid h-11 w-14 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular-nums ring-1 ring-inset ${
            turn.skipped || !evaluation ? "bg-white/5 text-zinc-400 ring-white/10" : TONE_STYLE[scoreTone(evaluation.score)]
          }`}
        >
          {turn.skipped || !evaluation ? "—" : `${evaluation.score}/10`}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-400">Q{number}</span>
            <span className="capitalize">{turn.kind}</span>
            {!turn.skipped && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="size-3" aria-hidden />
                {formatDuration(turn.durationSec)}
              </span>
            )}
            {turn.skipped ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-400">Skipped</span>
            ) : (
              evaluation && <VerdictBadge verdict={evaluation.verdict} />
            )}
          </span>
          <span className="mt-1.5 block text-sm leading-relaxed whitespace-pre-line text-zinc-100">{question}</span>
        </span>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-zinc-500 transition print:hidden ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      <div id={`${id}-details`} className={`${open ? "block" : "hidden"} border-t border-white/10 px-4 pt-4 pb-5 sm:px-5 print:block`}>
        {turn.skipped ? (
          <p className="text-sm text-zinc-400">You skipped this question. Try answering it in your next practice round.</p>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed">
            <div>
              <h4 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Your answer</h4>
              <p className="mt-1.5 whitespace-pre-wrap text-zinc-300">{turn.answer}</p>
            </div>
            {evaluation && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-emerald-300/90 uppercase">What worked</h4>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-zinc-300 marker:text-emerald-400">
                      {evaluation.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-amber-300/90 uppercase">How to improve</h4>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-zinc-300 marker:text-amber-400">
                      {evaluation.improvements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <h4 className="text-xs font-semibold tracking-wide text-violet-300 uppercase">Model answer</h4>
                  <p className="mt-1.5 whitespace-pre-line text-zinc-300">{evaluation.idealAnswer}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
