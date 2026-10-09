"use client";

import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { roleLabel } from "@/lib/constants";
import { setActiveSession, useActiveSession } from "@/lib/storage";

/** Offers to resume an interview that was left mid-way (e.g. after closing the tab). */
export function ResumeBanner() {
  const active = useActiveSession();
  const [confirming, setConfirming] = useState(false);

  if (!active || active.stage === "complete") return null;

  const answered = active.turns.filter((turn) => turn.skipped || turn.evaluation).length;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet-400/25 bg-violet-500/[0.08] p-4 sm:flex-row sm:items-center">
      <PlayCircle className="hidden size-6 shrink-0 text-violet-300 sm:block" aria-hidden />
      <p className="flex-1 text-sm text-zinc-200">
        <span className="font-medium text-white">You have an interview in progress</span> — {roleLabel(active.config.role)},{" "}
        {answered} of {active.config.questionCount} questions answered.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5"
        >
          Discard
        </button>
        <Link
          href="/interview"
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          Resume
        </Link>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Discard this interview?"
        description="Your answers and feedback for this unfinished interview will be deleted. Completed interviews in your history aren't affected."
        confirmLabel="Discard interview"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          setActiveSession(null);
        }}
      />
    </div>
  );
}
