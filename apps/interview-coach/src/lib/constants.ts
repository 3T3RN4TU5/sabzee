export const ROLES = [
  { id: "frontend", label: "Frontend Developer", hint: "React, browser, CSS, performance" },
  { id: "backend", label: "Backend Developer", hint: "APIs, databases, scalability" },
  { id: "fullstack", label: "Full-Stack Developer", hint: "End-to-end features & trade-offs" },
  { id: "data", label: "Data Analyst", hint: "SQL, statistics, storytelling" },
  { id: "devops", label: "DevOps / Cloud Engineer", hint: "CI/CD, containers, reliability" },
  { id: "pm", label: "Product Manager", hint: "Discovery, prioritisation, metrics" },
  { id: "hr", label: "HR / Behavioral only", hint: "Culture fit, teamwork, motivation" },
] as const;

export const LEVELS = [
  { id: "intern", label: "Intern / Fresher", hint: "Campus or first job" },
  { id: "junior", label: "Junior", hint: "0–2 years" },
  { id: "mid", label: "Mid-level", hint: "2–5 years" },
  { id: "senior", label: "Senior", hint: "5+ years" },
] as const;

export const INTERVIEW_TYPES = [
  { id: "technical", label: "Technical", hint: "Concepts & scenarios" },
  { id: "behavioral", label: "Behavioral", hint: "Real stories, STAR answers" },
  { id: "mixed", label: "Mixed", hint: "A realistic blend of both" },
] as const;

export const QUESTION_COUNTS = [3, 5, 7] as const;

export const COMPETENCIES = [
  "Technical depth",
  "Communication",
  "Problem solving",
  "Structure / STAR",
  "Role knowledge",
] as const;

export const VERDICTS = ["strong", "good", "needs_work", "weak"] as const;
export const READINESS = ["ready", "almost", "not_yet"] as const;

export const LIMITS = {
  name: 40,
  answer: 4000,
  jobDescription: 6000,
  question: 1500,
  history: 10,
} as const;

export type RoleId = (typeof ROLES)[number]["id"];
export type LevelId = (typeof LEVELS)[number]["id"];
export type InterviewTypeId = (typeof INTERVIEW_TYPES)[number]["id"];
export type QuestionCount = (typeof QUESTION_COUNTS)[number];
export type Competency = (typeof COMPETENCIES)[number];
export type Verdict = (typeof VERDICTS)[number];
export type Readiness = (typeof READINESS)[number];
export type QuestionKind = "technical" | "behavioral";
export type AiMode = "live" | "demo";

type Option<Id extends string> = { readonly id: Id; readonly label: string; readonly hint: string };

function labelOf<Id extends string>(options: readonly Option<Id>[], id: Id): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

export const roleLabel = (id: RoleId) => labelOf(ROLES, id);
/** Role name for headings ("HR / Behavioral only" reads oddly as a title). */
export const roleTitle = (id: RoleId) => (id === "hr" ? "HR & Behavioral" : labelOf(ROLES, id));
export const levelLabel = (id: LevelId) => labelOf(LEVELS, id);
export const typeLabel = (id: InterviewTypeId) => labelOf(INTERVIEW_TYPES, id);

export const VERDICT_LABEL: Record<Verdict, string> = {
  strong: "Strong answer",
  good: "Good answer",
  needs_work: "Needs work",
  weak: "Weak answer",
};

export const READINESS_LABEL: Record<Readiness, string> = {
  ready: "Ready",
  almost: "Almost there",
  not_yet: "Not yet",
};
