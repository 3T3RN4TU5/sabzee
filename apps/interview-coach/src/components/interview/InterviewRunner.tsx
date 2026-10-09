"use client";

import { Clock, LoaderCircle, LogOut, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { errorMessage, evaluateAnswer, streamQuestion } from "@/lib/api";
import { formatDuration, historyFromTurns, questionKind } from "@/lib/interview";
import type { Evaluation, Session } from "@/lib/schemas";
import { getActiveSession, setActiveSession } from "@/lib/storage";
import { AnswerComposer } from "./AnswerComposer";
import { FeedbackCard } from "./FeedbackCard";
import { QuestionCard } from "./QuestionCard";
import { QuestionTimer } from "./QuestionTimer";
import { SessionProgress } from "./SessionProgress";

type Action =
  | { type: "question-ready"; question: string }
  | { type: "draft"; answer: string }
  | { type: "submit"; answer: string; elapsedSec: number }
  | { type: "edit" }
  | { type: "evaluated"; evaluation: Evaluation }
  | { type: "skip"; elapsedSec: number; at: number }
  | { type: "next"; at: number };

function updateLastTurn(session: Session, patch: Partial<Session["turns"][number]>): Session["turns"] {
  return session.turns.map((turn, index) => (index === session.turns.length - 1 ? { ...turn, ...patch } : turn));
}

/** Moves to the next question, or completes the interview after the last one. */
function advance(session: Session, at: number): Session {
  return session.turns.length >= session.config.questionCount
    ? { ...session, stage: "complete", completedAt: at }
    : { ...session, stage: "question" };
}

function reducer(session: Session, action: Action): Session {
  const last = session.turns[session.turns.length - 1];
  switch (action.type) {
    case "question-ready":
      if (session.stage !== "question") return session;
      return {
        ...session,
        stage: "answer",
        turns: [
          ...session.turns,
          {
            question: action.question,
            kind: questionKind(session.config, session.turns.length),
            answer: "",
            skipped: false,
            durationSec: 0,
            evaluation: null,
          },
        ],
      };
    case "draft":
      if (session.stage !== "answer" || !last || last.answer === action.answer) return session;
      return { ...session, turns: updateLastTurn(session, { answer: action.answer }) };
    case "submit":
      if (session.stage !== "answer" || !last) return session;
      return {
        ...session,
        stage: "evaluate",
        turns: updateLastTurn(session, { answer: action.answer, durationSec: last.durationSec + action.elapsedSec }),
      };
    case "edit":
      return session.stage === "evaluate" ? { ...session, stage: "answer" } : session;
    case "evaluated":
      if (session.stage !== "evaluate") return session;
      return { ...session, stage: "feedback", turns: updateLastTurn(session, { evaluation: action.evaluation }) };
    case "skip":
      if (session.stage !== "answer" || !last) return session;
      return advance(
        { ...session, turns: updateLastTurn(session, { skipped: true, answer: "", durationSec: last.durationSec + action.elapsedSec }) },
        action.at,
      );
    case "next":
      return session.stage === "feedback" ? advance(session, action.at) : session;
  }
}

type RunnerError = { during: "question" | "evaluate"; message: string };

export function InterviewRunner({ initial }: { initial: Session }) {
  const router = useRouter();
  const [session, dispatch] = useReducer(reducer, initial);
  const [streamText, setStreamText] = useState("");
  // A half-written answer is kept on the current turn, so a refresh restores it.
  const [draft, setDraft] = useState(() => (initial.stage === "answer" ? (initial.turns.at(-1)?.answer ?? "") : ""));
  const [error, setError] = useState<RunnerError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const answerStartedAt = useRef<number | null>(null);
  const discardOnLeave = useRef(false);

  const { config, turns, stage } = session;
  const currentTurn = turns[turns.length - 1];
  const questionNumber = stage === "question" ? turns.length + 1 : turns.length;
  const kind = questionKind(config, questionNumber - 1);
  const completed = turns.filter((turn) => turn.skipped || turn.evaluation).length;

  // Persist every change so a refresh or closed tab can resume. Skip stale
  // writes from a preserved route revealed after this session was finished,
  // discarded or replaced.
  useEffect(() => {
    if (discardOnLeave.current || getActiveSession()?.id !== session.id) return;
    setActiveSession(session);
  }, [session]);

  // Clearing in a layout-effect cleanup avoids flashing the "no interview" state while navigating away.
  useLayoutEffect(
    () => () => {
      if (discardOnLeave.current) setActiveSession(null);
    },
    [],
  );

  useEffect(() => {
    if (stage === "answer") answerStartedAt.current = Date.now();
  }, [stage]);

  // Save the draft shortly after typing (or dictation) pauses.
  useEffect(() => {
    if (stage !== "answer") return;
    const timer = window.setTimeout(() => dispatch({ type: "draft", answer: draft }), 400);
    return () => window.clearTimeout(timer);
  }, [stage, draft]);

  // Stream the next question.
  useEffect(() => {
    if (stage !== "question") return;
    const controller = new AbortController();
    streamQuestion(
      { config, history: historyFromTurns(turns) },
      {
        signal: controller.signal,
        onText: (text) => {
          if (!controller.signal.aborted) setStreamText(text);
        },
      },
    )
      .then((question) => dispatch({ type: "question-ready", question }))
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError({ during: "question", message: errorMessage(caught) });
      });
    return () => {
      controller.abort();
      // Also runs when the page is hidden mid-stream; don't show stale partial text on return.
      setStreamText("");
    };
  }, [stage, config, turns, attempt]);

  // Score the submitted answer.
  useEffect(() => {
    if (stage !== "evaluate" || !currentTurn) return;
    const controller = new AbortController();
    evaluateAnswer(
      {
        config,
        question: currentTurn.question,
        answer: currentTurn.answer,
        questionIndex: turns.length - 1,
        history: historyFromTurns(turns.slice(0, -1)),
      },
      controller.signal,
    )
      .then((evaluation) => dispatch({ type: "evaluated", evaluation }))
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError({ during: "evaluate", message: errorMessage(caught) });
      });
    return () => controller.abort();
  }, [stage, config, turns, currentTurn, attempt]);

  const elapsedSeconds = () =>
    answerStartedAt.current === null ? 0 : Math.max(0, Math.round((Date.now() - answerStartedAt.current) / 1000));

  function handleSubmit() {
    const answer = draft.trim();
    if (!answer) return;
    setError(null);
    dispatch({ type: "submit", answer, elapsedSec: elapsedSeconds() });
    setDraft("");
  }

  function handleSkip() {
    setError(null);
    setDraft("");
    dispatch({ type: "skip", elapsedSec: elapsedSeconds(), at: Date.now() });
  }

  function handleNext() {
    dispatch({ type: "next", at: Date.now() });
  }

  function handleRetry() {
    setError(null);
    setAttempt((value) => value + 1);
  }

  function handleEditAnswer() {
    if (!currentTurn) return;
    setError(null);
    setDraft(currentTurn.answer);
    dispatch({ type: "edit" });
  }

  const progress = Math.round((completed / config.questionCount) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setExitOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden />
          Exit
        </button>
        <h1 className="text-sm font-medium text-zinc-200">
          Question <span className="text-white tabular-nums">{questionNumber}</span> of{" "}
          <span className="tabular-nums">{config.questionCount}</span>
        </h1>
        <div className="ml-auto">{stage === "answer" && currentTurn && <QuestionTimer key={turns.length} initialSeconds={currentTurn.durationSec} />}</div>
      </div>

      <div
        role="progressbar"
        aria-label="Interview progress"
        aria-valuemin={0}
        aria-valuemax={config.questionCount}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${config.questionCount} questions completed`}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-500"
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          {error?.during === "question" ? (
            <ErrorNotice title="The interviewer couldn't ask the next question" message={error.message} onRetry={handleRetry} />
          ) : (
            <QuestionCard
              text={stage === "question" ? streamText : (currentTurn?.question ?? "")}
              streaming={stage === "question"}
              kind={kind}
            />
          )}

          {stage === "answer" && (
            <AnswerComposer value={draft} onChange={setDraft} onSubmit={handleSubmit} onSkip={handleSkip} kind={kind} />
          )}

          {(stage === "evaluate" || stage === "feedback") && currentTurn && (
            <div className="ml-auto max-w-[92%] rounded-3xl rounded-tr-md border border-violet-400/20 bg-violet-500/10 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-xs text-violet-200/80">
                <span className="font-medium">Your answer</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="size-3.5" aria-hidden />
                  {formatDuration(currentTurn.durationSec)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">{currentTurn.answer}</p>
            </div>
          )}

          {stage === "evaluate" &&
            (error?.during === "evaluate" ? (
              <ErrorNotice title="We couldn't score your answer" message={error.message} onRetry={handleRetry}>
                <button
                  type="button"
                  onClick={handleEditAnswer}
                  className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-rose-100 ring-1 ring-inset ring-rose-400/30 transition hover:bg-rose-400/10"
                >
                  <PenLine className="size-4" aria-hidden />
                  Edit answer
                </button>
              </ErrorNotice>
            ) : (
              <div role="status" className="rounded-3xl border border-white/10 bg-ink-900/80 p-5 sm:p-6">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <LoaderCircle className="size-5 animate-spin text-violet-300" aria-hidden />
                  Scoring your answer and preparing feedback…
                </div>
                <div className="mt-5 space-y-3" aria-hidden>
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.06]" />
                </div>
              </div>
            ))}

          {stage === "feedback" && currentTurn?.evaluation && (
            <FeedbackCard
              evaluation={currentTurn.evaluation}
              isLast={turns.length >= config.questionCount}
              onNext={handleNext}
            />
          )}
        </div>

        <SessionProgress session={session} />
      </div>

      <ConfirmDialog
        open={exitOpen}
        title="Leave this interview?"
        description="Your progress is saved in this browser, so you can resume from the home page whenever you're ready."
        confirmLabel="Save & exit"
        cancelLabel="Keep going"
        secondary={{
          label: "Discard interview",
          onClick: () => {
            discardOnLeave.current = true;
            setExitOpen(false);
            router.push("/");
          },
        }}
        onCancel={() => setExitOpen(false)}
        onConfirm={() => {
          setExitOpen(false);
          router.push("/");
        }}
      />
    </div>
  );
}
