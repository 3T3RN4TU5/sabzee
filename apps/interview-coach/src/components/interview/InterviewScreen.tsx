"use client";

import { ArrowRight, LoaderCircle, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Session } from "@/lib/schemas";
import { getActiveSession, saveToHistory, useActiveSession } from "@/lib/storage";
import { InterviewRunner } from "./InterviewRunner";

export function InterviewScreen() {
  const active = useActiveSession();

  if (active === undefined) return <CenteredStatus label="Loading your interview…" />;
  if (active === null) return <NoInterview />;
  if (active.stage === "complete") return <FinishInterview session={active} />;
  return <InterviewRunner key={active.id} initial={active} />;
}

/** Saves the finished session to history and opens its report (the report page clears the active session). */
function FinishInterview({ session }: { session: Session }) {
  const router = useRouter();
  useEffect(() => {
    // When Next.js reveals this preserved route later, the props can be stale:
    // only act while this finished session is still the active one.
    const current = getActiveSession();
    if (current?.id !== session.id || current.stage !== "complete") return;
    saveToHistory(current);
    router.replace(`/report?id=${encodeURIComponent(current.id)}`);
  }, [router, session]);
  return <CenteredStatus label="Wrapping up — building your report…" />;
}

function CenteredStatus({ label }: { label: string }) {
  return (
    <div role="status" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center text-zinc-400">
      <LoaderCircle className="size-6 animate-spin text-violet-300" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function NoInterview() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20 ring-inset">
        <MessagesSquare className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-white">No interview in progress</h1>
      <p className="mt-2 text-zinc-400">Set up a mock interview for your target role — it takes about ten seconds.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/#setup"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200"
        >
          Start an interview
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-zinc-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/5"
        >
          View past interviews
        </Link>
      </div>
    </div>
  );
}
