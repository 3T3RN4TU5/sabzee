"use client";

import { ArrowRight, ClipboardList, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReadinessBadge } from "@/components/ui/badges";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { levelLabel, roleTitle, typeLabel } from "@/lib/constants";
import { averageScore, scoreTone } from "@/lib/interview";
import { formatDate } from "@/lib/markdown";
import type { Session } from "@/lib/schemas";
import { clearHistory, deleteFromHistory, useHistory } from "@/lib/storage";

const TONE_TEXT = {
  great: "text-emerald-300",
  good: "text-sky-300",
  fair: "text-amber-300",
  poor: "text-rose-300",
} as const;

/** The report's score when it exists, otherwise the average of per-question scores. */
function sessionScore(session: Session): number {
  if (session.report) return session.report.overallScore;
  return averageScore(session.turns.map((turn) => (turn.skipped ? 0 : (turn.evaluation?.score ?? 0))));
}

type PendingDelete = { kind: "one"; session: Session } | { kind: "all" } | null;

export function HistoryScreen() {
  const history = useHistory();
  const [pending, setPending] = useState<PendingDelete>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-violet-300">History</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Your past interviews</h1>
          <p className="mt-2 text-sm text-zinc-400">Saved in this browser only. Reopen a report or clear old sessions anytime.</p>
        </div>
        {history && history.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPending({ kind: "all" })}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5 hover:text-white"
            >
              <Trash2 className="size-4" aria-hidden />
              Clear all
            </button>
            <Link
              href="/#setup"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200"
            >
              <Plus className="size-4" aria-hidden />
              New interview
            </Link>
          </div>
        )}
      </div>

      {history === undefined ? (
        <div className="mt-8 space-y-3" role="status" aria-label="Loading history">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <EmptyHistory />
      ) : (
        <>
          <Stats sessions={history} />
          <ul className="mt-6 space-y-3">
            {history.map((session) => (
              <HistoryRow key={session.id} session={session} onDelete={() => setPending({ kind: "one", session })} />
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === "all" ? "Clear all interviews?" : "Delete this interview?"}
        description={
          pending?.kind === "one"
            ? `The ${roleTitle(pending.session.config.role)} interview from ${formatDate(pending.session.createdAt)} and its report will be permanently removed from this browser.`
            : "Every saved interview and report will be permanently removed from this browser."
        }
        confirmLabel={pending?.kind === "all" ? "Clear all" : "Delete"}
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind === "one") deleteFromHistory(pending.session.id);
          if (pending?.kind === "all") clearHistory();
          setPending(null);
        }}
      />
    </div>
  );
}

function Stats({ sessions }: { sessions: Session[] }) {
  const scores = sessions.map(sessionScore);
  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const best = Math.max(...scores);
  const latest = scores[0];
  const previous = scores[1];
  const delta = previous === undefined ? null : latest - previous;

  const items = [
    { label: "Interviews", value: String(sessions.length) },
    { label: "Average score", value: `${average}` },
    { label: "Best score", value: `${best}` },
    {
      label: "Latest vs previous",
      value: delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`,
      tone: delta === null || delta === 0 ? "" : delta > 0 ? "text-emerald-300" : "text-rose-300",
    },
  ];

  return (
    <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <dt className="text-xs text-zinc-500">{item.label}</dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums ${item.tone || "text-white"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HistoryRow({ session, onDelete }: { session: Session; onDelete: () => void }) {
  const { config } = session;
  const score = sessionScore(session);
  const href = `/report?id=${encodeURIComponent(session.id)}`;

  return (
    <li className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-center gap-4 sm:contents">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10 ring-inset">
          <span className={`text-lg font-semibold tabular-nums ${TONE_TEXT[scoreTone(score, 100)]}`}>{score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={href} className="font-semibold text-white after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet-400">
              {roleTitle(config.role)}
            </Link>
            {session.report ? (
              <ReadinessBadge readiness={session.report.readiness} />
            ) : (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-400 ring-1 ring-white/10 ring-inset">Report pending</span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {levelLabel(config.level)} · {typeLabel(config.type)} · {session.turns.length} questions
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{formatDate(session.createdAt)}</p>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-2 sm:ml-auto">
        <Link
          href={href}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/5 sm:flex-none"
        >
          <FileText className="size-4" aria-hidden />
          Open report
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${roleTitle(config.role)} interview from ${formatDate(session.createdAt)}`}
          className="grid size-9 place-items-center rounded-lg text-zinc-400 ring-1 ring-inset ring-white/10 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function EmptyHistory() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20 ring-inset">
        <ClipboardList className="size-7" aria-hidden />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-white">No interviews yet</h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        Finish your first mock interview and its report will appear here, so you can track your progress over time.
      </p>
      <Link
        href="/#setup"
        className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Start your first interview
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
