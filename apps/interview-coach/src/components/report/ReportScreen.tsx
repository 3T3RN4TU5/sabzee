"use client";

import { FileQuestion, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAiStatus } from "@/components/layout/StatusProvider";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { errorMessage, generateReport } from "@/lib/api";
import { historyFromTurns } from "@/lib/interview";
import type { Session } from "@/lib/schemas";
import { attachReport, releaseFinishedSession, useHistory } from "@/lib/storage";
import { ReportView } from "./ReportView";

export function ReportScreen() {
  const id = useSearchParams().get("id");
  const history = useHistory();

  // The finished interview now lives in history; release the "active" slot.
  useEffect(() => {
    if (id) releaseFinishedSession(id);
  }, [id]);

  if (history === undefined) return <ReportSkeleton label="Loading report…" />;

  const session = id ? history.find((item) => item.id === id) : undefined;
  if (!session) return <ReportNotFound />;
  if (!session.report) return <ReportGenerator key={session.id} session={session} />;
  return <ReportView session={session} report={session.report} />;
}

function ReportGenerator({ session }: { session: Session }) {
  const status = useAiStatus();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    generateReport({ config: session.config, history: historyFromTurns(session.turns) }, controller.signal)
      .then(({ report, mode }) => attachReport(session.id, report, mode))
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(caught));
      });
    return () => controller.abort();
  }, [session, attempt]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <ErrorNotice
          title="We couldn't build your report"
          message={`${error} Your answers and per-question feedback are saved.`}
          onRetry={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
        >
          <Link href="/history" className="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-rose-100 ring-1 ring-inset ring-rose-400/30 transition hover:bg-rose-400/10">
            Go to history
          </Link>
        </ErrorNotice>
      </div>
    );
  }

  const live = status.state === "ready" && status.mode === "live";
  return <ReportSkeleton label={live ? "Claude is reviewing your whole interview…" : "Analysing your answers and building your report…"} />;
}

export function ReportSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div role="status" className="flex items-center gap-3 text-sm text-zinc-300">
        <LoaderCircle className="size-5 animate-spin text-violet-300" aria-hidden />
        {label}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]" aria-hidden>
        <div className="h-56 animate-pulse rounded-3xl bg-white/[0.04]" />
        <div className="h-56 animate-pulse rounded-3xl bg-white/[0.04]" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-3xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

function ReportNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-white/5 text-zinc-300 ring-1 ring-white/10 ring-inset">
        <FileQuestion className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-white">Report not found</h1>
      <p className="mt-2 text-zinc-400">
        Reports are stored in the browser where the interview was taken. It may have been deleted, or you&apos;re on a different device.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/history" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200">
          View history
        </Link>
        <Link href="/#setup" className="rounded-xl px-5 py-3 text-sm font-semibold text-zinc-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/5">
          Start an interview
        </Link>
      </div>
    </div>
  );
}

