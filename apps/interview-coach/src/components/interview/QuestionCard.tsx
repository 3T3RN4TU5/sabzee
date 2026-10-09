import { Sparkles } from "lucide-react";
import type { QuestionKind } from "@/lib/constants";
import { splitInterviewerTurn } from "@/lib/interview";

interface QuestionCardProps {
  text: string;
  streaming: boolean;
  kind: QuestionKind;
}

export function QuestionCard({ text, streaming, kind }: QuestionCardProps) {
  const waiting = streaming && !text;
  const { lead, question } = splitInterviewerTurn(text);

  return (
    <div className="rounded-3xl border border-white/10 bg-linear-to-b from-white/[0.05] to-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
          <Sparkles className="size-5 text-white" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">AI Interviewer</p>
          <p className="text-xs text-zinc-400 capitalize">{kind} question</p>
        </div>
      </div>

      <div className="mt-4 min-h-16" aria-busy={streaming}>
        {waiting ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="flex gap-1" aria-hidden>
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-violet-300"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            Interviewer is thinking…
          </p>
        ) : (
          <p className="text-lg leading-relaxed text-pretty whitespace-pre-line text-zinc-100 sm:text-xl sm:leading-relaxed">
            {lead && <span className="mb-1.5 block text-zinc-400">{lead}</span>}
            {question}
            {streaming && (
              <span aria-hidden className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-caret bg-violet-300" />
            )}
          </p>
        )}
      </div>

      {/* Announce the question once, when it has fully arrived. */}
      <p className="sr-only" aria-live="polite">
        {streaming ? "" : text}
      </p>
    </div>
  );
}
