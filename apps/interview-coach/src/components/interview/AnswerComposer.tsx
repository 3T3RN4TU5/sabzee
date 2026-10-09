"use client";

import { CornerDownLeft, Mic, MicOff, SkipForward } from "lucide-react";
import { useCallback, useId, type Dispatch, type SetStateAction } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { LIMITS, type QuestionKind } from "@/lib/constants";
import { countWords } from "@/lib/interview";

const TIPS: Record<QuestionKind, string> = {
  technical: "Start with a one-line answer, then explain how and why, and mention a trade-off or an example.",
  behavioral: "Use STAR: the Situation, your Task, the Actions you took and the Result — with a number if you can.",
};

interface AnswerComposerProps {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  onSubmit: () => void;
  onSkip: () => void;
  kind: QuestionKind;
}

export function AnswerComposer({ value, onChange, onSubmit, onSkip, kind }: AnswerComposerProps) {
  const id = useId();
  const appendTranscript = useCallback(
    (text: string) =>
      onChange((current) => {
        const separator = current && !/\s$/.test(current) ? " " : "";
        return (current + separator + text).slice(0, LIMITS.answer);
      }),
    [onChange],
  );
  const speech = useSpeechRecognition({ lang: "en-IN", onFinalText: appendTranscript });

  const length = value.length;
  const words = countWords(value);
  const nearLimit = length >= LIMITS.answer * 0.9;
  const canSubmit = value.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    if (speech.listening) speech.stop();
    onSubmit();
  }

  function skip() {
    if (speech.listening) speech.stop();
    onSkip();
  }

  return (
    <div className="animate-fade-up rounded-3xl border border-white/10 bg-ink-900/80 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${id}-answer`} className="text-sm font-medium text-zinc-200">
          Your answer
        </label>
        <span
          id={`${id}-count`}
          className={`text-xs tabular-nums ${nearLimit ? "text-amber-300" : "text-zinc-500"}`}
          aria-live={nearLimit ? "polite" : "off"}
        >
          {words} {words === 1 ? "word" : "words"} · {length.toLocaleString("en-US")} / {LIMITS.answer.toLocaleString("en-US")}
        </span>
      </div>

      <textarea
        id={`${id}-answer`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        maxLength={LIMITS.answer}
        rows={8}
        autoFocus
        placeholder={speech.listening ? "Listening… speak your answer" : "Type your answer here, or use the microphone to dictate it."}
        aria-describedby={`${id}-tip ${id}-count`}
        className="mt-3 block min-h-44 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[15px] leading-relaxed text-white placeholder:text-zinc-500 transition focus:border-violet-400/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-violet-400/25 focus:outline-none focus-visible:outline-none"
      />

      {speech.listening && (
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400" aria-live="polite">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
          </span>
          <span className="truncate italic">{speech.interim || "Listening (English – India)…"}</span>
        </p>
      )}
      {speech.error && (
        <p role="alert" className="mt-2 text-sm text-amber-300">
          {speech.error}
        </p>
      )}

      <p id={`${id}-tip`} className="mt-3 text-xs leading-relaxed text-zinc-500">
        <span className="font-medium text-zinc-400">Tip:</span> {TIPS[kind]}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="group relative">
          <button
            type="button"
            onClick={() => {
              if (!speech.supported) return;
              if (speech.listening) speech.stop();
              else speech.start();
            }}
            aria-disabled={!speech.supported}
            aria-pressed={speech.supported ? speech.listening : undefined}
            aria-describedby={speech.supported ? undefined : `${id}-mic-tip`}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium ring-1 ring-inset transition ${
              !speech.supported
                ? "cursor-not-allowed text-zinc-500 ring-white/10"
                : speech.listening
                  ? "bg-rose-500/15 text-rose-200 ring-rose-400/40 hover:bg-rose-500/25"
                  : "text-zinc-200 ring-white/15 hover:bg-white/5"
            }`}
          >
            {speech.listening ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
            {speech.listening ? "Stop dictation" : "Dictate"}
          </button>
          {!speech.supported && (
            <span
              id={`${id}-mic-tip`}
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-60 rounded-lg bg-ink-700 px-3 py-2 text-xs text-zinc-200 opacity-0 shadow-xl ring-1 ring-white/10 transition group-focus-within:opacity-100 group-hover:opacity-100"
            >
              Voice input isn&apos;t supported in this browser. Try Chrome or Edge.
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={skip}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          <SkipForward className="size-4" aria-hidden />
          Skip
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:h-10 sm:w-auto"
        >
          Submit answer
          <kbd aria-hidden className="hidden items-center gap-0.5 rounded bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline-flex">
            Ctrl
            <CornerDownLeft className="size-3" aria-hidden />
          </kbd>
        </button>
      </div>
    </div>
  );
}
