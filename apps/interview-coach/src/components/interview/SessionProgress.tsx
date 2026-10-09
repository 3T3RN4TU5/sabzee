import { Check, Minus } from "lucide-react";
import { levelLabel, roleLabel, typeLabel } from "@/lib/constants";
import { formatDuration, questionKind, scoreTone } from "@/lib/interview";
import type { Session } from "@/lib/schemas";

const TONE_TEXT = {
  great: "text-emerald-300",
  good: "text-sky-300",
  fair: "text-amber-300",
  poor: "text-rose-300",
} as const;

/** Sidebar overview: setup summary, per-question status and running average. */
export function SessionProgress({ session }: { session: Session }) {
  const { config, turns } = session;
  const scored = turns.filter((turn) => turn.skipped || turn.evaluation);
  // Turns complete in order, so the active question follows the completed ones.
  const activeIndex = session.stage === "feedback" ? scored.length - 1 : session.stage === "complete" ? -1 : scored.length;
  const average = scored.length
    ? scored.reduce((sum, turn) => sum + (turn.skipped ? 0 : (turn.evaluation?.score ?? 0)), 0) / scored.length
    : null;

  return (
    <aside aria-label="Interview progress" className="space-y-4 lg:sticky lg:top-24">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Interview</p>
        <p className="mt-1.5 font-semibold text-white">{roleLabel(config.role)}</p>
        <p className="text-sm text-zinc-400">
          {levelLabel(config.level)} · {typeLabel(config.type)}
        </p>
        {config.jobDescription && <p className="mt-2 text-xs text-violet-300">Tailored to your job description</p>}
        <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
          <span className="text-xs text-zinc-500">Running average</span>
          <span className="text-lg font-semibold text-white tabular-nums">
            {average === null ? "—" : `${average.toFixed(1)}`}
            <span className="text-xs font-normal text-zinc-500"> / 10</span>
          </span>
        </div>
      </div>

      <ol className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
        {Array.from({ length: config.questionCount }, (_, index) => {
          const turn = turns[index];
          const skipped = Boolean(turn?.skipped);
          const score = turn?.evaluation?.score;
          const done = skipped || score !== undefined;
          const current = index === activeIndex;
          const kind = turn?.kind ?? questionKind(config, index);
          return (
            <li
              key={index}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm ${current ? "bg-violet-500/10 ring-1 ring-violet-400/30 ring-inset" : ""}`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  current ? "bg-violet-500 text-white" : done ? "bg-white/10 text-zinc-200" : "bg-white/5 text-zinc-500"
                }`}
              >
                {skipped ? (
                  <Minus className="size-3.5" aria-label="Skipped" />
                ) : done ? (
                  <Check className="size-3.5" aria-label="Answered" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${current ? "text-white" : done ? "text-zinc-300" : "text-zinc-500"}`}>Question {index + 1}</span>
                <span className="block text-xs text-zinc-500 capitalize">
                  {kind}
                  {turn && score !== undefined ? ` · ${formatDuration(turn.durationSec)}` : ""}
                </span>
              </span>
              {skipped && <span className="text-sm text-zinc-500">Skipped</span>}
              {score !== undefined && (
                <span className={`text-sm font-semibold tabular-nums ${TONE_TEXT[scoreTone(score)]}`}>{score}/10</span>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
