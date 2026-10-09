"use client";

import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Cloud,
  Compass,
  FileText,
  Layers,
  Monitor,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useLayoutEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  INTERVIEW_TYPES,
  LEVELS,
  LIMITS,
  QUESTION_COUNTS,
  ROLES,
  type InterviewTypeId,
  type LevelId,
  type QuestionCount,
  type RoleId,
} from "@/lib/constants";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InterviewConfigSchema, type InterviewConfig, type Session } from "@/lib/schemas";
import { createSessionId, savePrefs, setActiveSession, useActiveSession, usePrefs } from "@/lib/storage";

const ROLE_ICONS: Record<RoleId, LucideIcon> = {
  frontend: Monitor,
  backend: Server,
  fullstack: Layers,
  data: BarChart3,
  devops: Cloud,
  pm: Compass,
  hr: Users,
};

const DEFAULT_CONFIG: InterviewConfig = {
  name: "",
  role: "frontend",
  level: "junior",
  type: "mixed",
  questionCount: 5,
  jobDescription: "",
};

/**
 * The form is remounted once saved preferences load (key change), so returning
 * users get their last setup without a hydration mismatch.
 */
export function SetupForm() {
  const prefs = usePrefs();
  return <SetupFormInner key={prefs === undefined ? "default" : "hydrated"} initial={prefs ?? DEFAULT_CONFIG} />;
}

function SetupFormInner({ initial }: { initial: InterviewConfig }) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState<RoleId>(initial.role);
  const [level, setLevel] = useState<LevelId>(initial.level);
  const [type, setType] = useState<InterviewTypeId>(initial.type);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(initial.questionCount);
  const [jobDescription, setJobDescription] = useState(initial.jobDescription);
  const [showJd, setShowJd] = useState(initial.jobDescription.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<InterviewConfig | null>(null);
  const active = useActiveSession();

  // Next.js keeps this page alive (hidden) while you're in the interview, so
  // reset the transient submit state when it hides; the inputs stay as entered.
  useLayoutEffect(
    () => () => {
      setStarting(false);
      setPendingConfig(null);
    },
    [],
  );

  const roleIsBehavioralOnly = role === "hr";

  function start(config: InterviewConfig) {
    const session: Session = {
      id: createSessionId(),
      createdAt: Date.now(),
      completedAt: null,
      config,
      stage: "question",
      turns: [],
      report: null,
      reportMode: null,
    };
    setStarting(true);
    savePrefs(config);
    setActiveSession(session);
    router.push("/interview");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = InterviewConfigSchema.safeParse({
      name,
      role,
      level,
      type: roleIsBehavioralOnly ? "behavioral" : type,
      questionCount,
      jobDescription,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your setup.");
      return;
    }
    setError(null);
    // Starting over would replace the unfinished interview, so ask first.
    if (active && active.stage !== "complete") setPendingConfig(parsed.data);
    else start(parsed.data);
  }

  const minutes = questionCount * 2;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-3xl border border-white/10 bg-ink-900/80 p-5 shadow-2xl shadow-violet-950/30 backdrop-blur sm:p-7"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <div className="space-y-7">
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-medium text-zinc-200">
            Your first name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id={`${id}-name`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={LIMITS.name}
            autoComplete="given-name"
            placeholder="e.g. Priya"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 transition focus:border-violet-400/60 focus:bg-white/[0.05] focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-violet-400/30"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-200">Target role</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
            {ROLES.map((option) => {
              const Icon = ROLE_ICONS[option.id];
              const checked = role === option.id;
              return (
                <label
                  key={option.id}
                  className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-400 ${
                    checked
                      ? "border-violet-400/60 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  } ${option.id === "hr" ? "min-[480px]:col-span-2" : ""}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.id}
                    checked={checked}
                    onChange={() => setRole(option.id)}
                    className="sr-only"
                  />
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      checked ? "bg-violet-500 text-white" : "bg-white/5 text-zinc-300 group-hover:text-white"
                    }`}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">{option.label}</span>
                    <span className="block text-xs text-zinc-400">{option.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Segmented
          legend="Experience level"
          name="level"
          value={level}
          onChange={setLevel}
          options={LEVELS.map((option) => ({ value: option.id, label: option.label, hint: option.hint }))}
          columns="grid-cols-2 sm:grid-cols-4"
        />

        <Segmented
          legend="Interview type"
          name="type"
          value={roleIsBehavioralOnly ? "behavioral" : type}
          onChange={setType}
          disabled={roleIsBehavioralOnly}
          note={roleIsBehavioralOnly ? "HR interviews are always behavioral." : undefined}
          options={INTERVIEW_TYPES.map((option) => ({ value: option.id, label: option.label, hint: option.hint }))}
          columns="grid-cols-3"
        />

        <Segmented
          legend="Number of questions"
          name="questionCount"
          value={String(questionCount)}
          onChange={(value) => setQuestionCount(Number(value) as QuestionCount)}
          options={QUESTION_COUNTS.map((count) => ({
            value: String(count),
            label: `${count} questions`,
            hint: `~${count * 2} min`,
          }))}
          columns="grid-cols-3"
        />

        <div>
          <button
            type="button"
            onClick={() => setShowJd((value) => !value)}
            aria-expanded={showJd}
            aria-controls={`${id}-jd-panel`}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 px-4 py-3 text-left text-sm transition hover:border-white/25 hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-2.5">
              <FileText className="size-4 text-violet-300" aria-hidden />
              <span>
                <span className="font-medium text-zinc-100">Tailor to a job description</span>{" "}
                <span className="text-zinc-500">(optional)</span>
              </span>
            </span>
            <ChevronDown className={`size-4 text-zinc-400 transition ${showJd ? "rotate-180" : ""}`} aria-hidden />
          </button>
          <div id={`${id}-jd-panel`} hidden={!showJd} className="mt-3">
            <label htmlFor={`${id}-jd`} className="sr-only">
              Job description
            </label>
            <textarea
              id={`${id}-jd`}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              maxLength={LIMITS.jobDescription}
              rows={6}
              placeholder="Paste the job description here — questions will focus on the skills and responsibilities it mentions."
              aria-describedby={`${id}-jd-count`}
              className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-500 focus:border-violet-400/60 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-violet-400/30"
            />
            <p id={`${id}-jd-count`} className="mt-1.5 text-right text-xs tabular-nums text-zinc-500">
              {jobDescription.length.toLocaleString("en-US")} / {LIMITS.jobDescription.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-5 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-400">
          {questionCount} questions · about {minutes} minutes · type or speak your answers
        </p>
        <button
          type="submit"
          disabled={starting}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {starting ? "Starting…" : "Start interview"}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </button>
      </div>

      <ConfirmDialog
        open={pendingConfig !== null}
        title="Replace your unfinished interview?"
        description="Starting a new interview discards the one you haven't finished. Completed interviews in your history aren't affected."
        confirmLabel="Start new interview"
        destructive
        onCancel={() => setPendingConfig(null)}
        onConfirm={() => {
          if (pendingConfig) start(pendingConfig);
          setPendingConfig(null);
        }}
      />
    </form>
  );
}

interface SegmentedProps<Value extends string> {
  legend: string;
  name: string;
  value: Value;
  onChange: (value: Value) => void;
  options: { value: Value; label: string; hint: string }[];
  columns: string;
  disabled?: boolean;
  note?: ReactNode;
}

function Segmented<Value extends string>({ legend, name, value, onChange, options, columns, disabled, note }: SegmentedProps<Value>) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium text-zinc-200">{legend}</legend>
      <div className={`mt-2 grid gap-2 ${columns}`}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-400 has-[:disabled]:cursor-not-allowed ${
                checked
                  ? "border-violet-400/60 bg-violet-500/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04] has-[:disabled]:opacity-50"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-[11px] text-zinc-400">{option.hint}</span>
            </label>
          );
        })}
      </div>
      {note && <p className="mt-2 text-xs text-zinc-400">{note}</p>}
    </fieldset>
  );
}
