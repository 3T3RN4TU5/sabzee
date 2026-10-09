import "server-only";
import {
  COMPETENCIES,
  levelLabel,
  roleLabel,
  typeLabel,
  type Competency,
  type LevelId,
  type QuestionKind,
  type RoleId,
} from "@/lib/constants";
import { averageScore, countWords, questionKind, readinessForScore } from "@/lib/interview";
import type { Evaluation, HistoryItem, InterviewConfig, Report } from "@/lib/schemas";
import { normalizeEvaluation } from "../normalize";
import { GENERAL_BEHAVIORAL, HR_QUESTIONS, ROLE_BANKS, type BankQuestion, type Tier } from "./questions";

/* ----------------------------------------------------------------------------
 * Question selection
 * ------------------------------------------------------------------------- */

const ALL_QUESTIONS: BankQuestion[] = [
  ...Object.values(ROLE_BANKS).flatMap((bank) => [...bank.technical, ...bank.behavioral]),
  ...GENERAL_BEHAVIORAL,
  ...HR_QUESTIONS,
];

/** Preferred difficulty tiers per level, best fit first. */
const LEVEL_TIERS: Record<LevelId, Tier[]> = {
  intern: [1, 2],
  junior: [1, 2],
  mid: [2, 3],
  senior: [3, 2],
};

function poolFor(role: RoleId, kind: QuestionKind): BankQuestion[] {
  if (role === "hr") return [...HR_QUESTIONS, ...GENERAL_BEHAVIORAL];
  const bank = ROLE_BANKS[role];
  return kind === "technical" ? bank.technical : [...bank.behavioral, ...GENERAL_BEHAVIORAL];
}

export function findBankQuestion(text: string): BankQuestion | undefined {
  return ALL_QUESTIONS.find((question) => text.includes(question.text));
}

const patternCache = new Map<string, RegExp>();

/** Prefix match on a word boundary, so "cach" matches "caching" but "ci" doesn't match "specific". */
function mentions(text: string, keyword: string): boolean {
  let pattern = patternCache.get(keyword);
  if (!pattern) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    pattern = new RegExp(`(^|[^a-z0-9])${escaped}`, "i");
    patternCache.set(keyword, pattern);
  }
  return pattern.test(text);
}

const coversGroup = (text: string, group: string[]) => group.some((keyword) => mentions(text, keyword));

function weightedPick<T>(items: T[], weight: (item: T) => number): T {
  const weights = items.map(weight);
  let roll = Math.random() * weights.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickQuestion(config: InterviewConfig, history: HistoryItem[]): BankQuestion {
  const index = history.length;
  const kind = questionKind(config, index);
  const isUnasked = (question: BankQuestion) => !history.some((item) => item.question.includes(question.text));

  let pool = poolFor(config.role, kind).filter(isUnasked);
  if (pool.length === 0) pool = ALL_QUESTIONS.filter((question) => question.kind === kind && isUnasked(question));
  if (pool.length === 0) pool = ALL_QUESTIONS.filter(isUnasked);

  // Behavioral interviews traditionally open with "tell me about yourself".
  if (index === 0 && kind === "behavioral") {
    const intro = pool.find((question) => question.id === "gb-intro");
    if (intro) return intro;
  }

  const tiers = LEVEL_TIERS[config.level];
  const jobDescription = config.jobDescription.toLowerCase();
  return weightedPick(pool, (question) => {
    const rank = tiers.indexOf(question.tier);
    const levelWeight = rank === 0 ? 6 : rank === 1 ? 3 : 0.3;
    const jdMatches = jobDescription
      ? question.keywords.filter((group) => coversGroup(jobDescription, group)).length
      : 0;
    // Job-description overlap nudges the choice without overriding the level fit.
    return levelWeight + Math.min(jdMatches, 3);
  });
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function acknowledgement(config: InterviewConfig, history: HistoryItem[]): string {
  if (history.length === 0) {
    return config.name ? `Hi ${config.name}, thanks for joining — let's get started.` : "Thanks for joining — let's get started.";
  }
  const last = history[history.length - 1];
  if (last.skipped || !last.answer.trim()) {
    return pickOne(["No problem, let's move on.", "That's okay — let's try something different."]);
  }
  if ((last.score ?? 0) >= 8) {
    return pickOne(["Great answer — thanks for the detail.", "That was a thorough answer, thank you."]);
  }
  if (countWords(last.answer) < 25) return pickOne(["Thanks. Let's switch gears.", "Okay, noted — let's keep going."]);
  return pickOne(["Thanks for walking me through that.", "Thanks, that's helpful context.", "Got it, thank you."]);
}

export function demoQuestionText(config: InterviewConfig, history: HistoryItem[]): string {
  const question = pickQuestion(config, history);
  const isLast = history.length + 1 === config.questionCount && config.questionCount > 1;
  return `${acknowledgement(config, history)}${isLast ? " Final question." : ""}\n\n${question.text}`;
}

/** Streams text word by word with a short "thinking" pause, mimicking the live model. */
export function demoTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const tokens = text.match(/\S+\s*/g) ?? [text];
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = (ms: number) => new Promise<void>((resolve) => (timer = setTimeout(resolve, ms)));

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      await wait(index === 0 ? 650 : 22 + Math.random() * 40);
      controller.enqueue(encoder.encode(tokens[index]));
      index += 1;
      if (index >= tokens.length) controller.close();
    },
    cancel() {
      clearTimeout(timer);
    },
  });
}

/* ----------------------------------------------------------------------------
 * Heuristic evaluation — transparent rules, same output schema as Claude
 * ------------------------------------------------------------------------- */

const STOP_WORDS = new Set(
  "about after again also and are because been before being between both but can could did does doing during each from have having here how into its just more most other our out over same should some such than that the their them then there these they this those through under until very was were what when where which while who why will with would you your tell walk explain describe give time".split(" "),
);

const EXAMPLE = /\b(for example|for instance|e\.g\.|such as|in my (last |previous |current )?(project|role|team|internship|job|company)|at my (last |previous )?(job|company|internship)|we had|i once|once i)\b/i;
const REASONING = /\b(because|so that|therefore|which means|trade-?offs?|on the other hand|however|whereas|instead of|the downside|the benefit|pros|cons)\b/i;
const METRICS = /\d+(\.\d+)?\s?(%|percent|ms|milliseconds|seconds|minutes|hours|days|weeks|months|x\b|k\b|users|customers|people|tickets|crore|lakh)/i;
const SIGNPOSTS = /\b(first(ly)?|second(ly)?|third|then|next|finally|lastly|in short|to summari[sz]e|overall)\b/gi;
const STAR = {
  situation: /\b(situation|context|when i was|at my (previous|last|current)|in my (previous|last|final|current)|during (my|our|a|the)|we were|our team|the project|last (year|semester|quarter))\b/i,
  task: /\b(my (task|goal|job|responsibility|role) was|i was (asked|responsible|tasked|assigned)|i needed to|i had to|we needed to|the goal|objective|was responsible)\b/i,
  action: /\bi (decided|led|built|created|implemented|organi[sz]ed|proposed|spoke|talked|reached|set|wrote|designed|analy[sz]ed|took|worked|started|suggested|scheduled|negotiated|mentored|fixed|refactored|automated|asked|listened|explained|prepared|volunteered|added|investigated|broke|planned|presented|called|met|used|made)\b/i,
  result: /\b(result(ed)?|outcome|as a result|in the end|eventually|ultimately|improved|reduced|increased|saved|delivered|launched|shipped|achieved|won|dropped|grew)\b/i,
};
const REFLECTION = /\b(learn(ed|t)?|lesson|taught me|in hindsight|next time|would do differently|realised|realized)\b/i;

interface Signals {
  words: number;
  sentences: number;
  coverage: number;
  covered: string[];
  missing: string[];
  example: boolean;
  reasoning: boolean;
  metrics: boolean;
  signposting: boolean;
  star: Record<keyof typeof STAR, boolean>;
  reflection: boolean;
}

/**
 * Shows a keyword group the way `source` phrases it ("invalidat" → "invalidation"),
 * keeping acronyms and mixed case ("APM", "B-tree") intact.
 */
function displayKeyword(group: string[], source: string): string {
  for (const keyword of group) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const match = source.match(new RegExp(`(?:^|[^a-z0-9])(${escaped}[a-z0-9-]*)`, "i"));
    if (match) return /^[A-Z]?[a-z][a-z-]*$/.test(match[1]) ? match[1].toLowerCase() : match[1];
  }
  return group[0];
}

function fallbackKeywords(question: string): string[][] {
  const words = question.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [];
  return [...new Set(words.filter((word) => !STOP_WORDS.has(word)))].slice(0, 6).map((word) => [word]);
}

function analyse(answer: string, groups: string[][], ideal: string): Signals {
  const words = countWords(answer);
  const sentences = answer.split(/[.!?]+(?:\s|$)|\n+/).filter((part) => countWords(part) >= 3).length;
  const coveredGroups = groups.filter((group) => coversGroup(answer, group));
  const target = Math.max(3, Math.ceil(groups.length * 0.6));
  return {
    words,
    sentences,
    coverage: groups.length ? Math.min(1, coveredGroups.length / target) : 0.5,
    covered: coveredGroups.map((group) => displayKeyword(group, answer)),
    missing: groups.filter((group) => !coveredGroups.includes(group)).map((group) => displayKeyword(group, ideal)),
    example: EXAMPLE.test(answer),
    reasoning: REASONING.test(answer),
    metrics: METRICS.test(answer),
    signposting: (answer.match(SIGNPOSTS)?.length ?? 0) >= 2,
    star: {
      situation: STAR.situation.test(answer),
      task: STAR.task.test(answer),
      action: STAR.action.test(answer),
      result: STAR.result.test(answer),
    },
    reflection: REFLECTION.test(answer),
  };
}

function lengthPoints(words: number, kind: QuestionKind): number {
  const ideal = kind === "behavioral" ? 60 : 50;
  if (words < 8) return 0;
  if (words < 25) return 0.7;
  if (words < ideal) return 1.3;
  if (words <= 330) return 2;
  return 1.6;
}

function scoreFromSignals(signals: Signals, kind: QuestionKind): number {
  let score = lengthPoints(signals.words, kind);
  if (kind === "technical") {
    score += signals.coverage * 4.5;
    score += (signals.example ? 0.8 : 0) + (signals.reasoning ? 0.9 : 0) + (signals.metrics ? 0.4 : 0) + (signals.signposting ? 0.4 : 0);
    score += signals.sentences >= 3 ? 1 : signals.sentences >= 2 ? 0.5 : 0;
  } else {
    score += Object.values(signals.star).filter(Boolean).length;
    score += signals.coverage * 2;
    score += (signals.metrics ? 0.6 : 0) + (signals.star.action ? 0.5 : 0) + (signals.reflection ? 0.4 : 0);
    score += signals.sentences >= 4 ? 0.5 : 0;
  }

  const starCount = Object.values(signals.star).filter(Boolean).length;
  // Delivery alone can't carry an answer: relevance (and STAR for stories) sets the ceiling.
  const ceiling = kind === "technical" ? 2 + signals.coverage * 9 : 2 + starCount * 1.5 + signals.coverage * 2;
  score = Math.min(score, ceiling);
  if (signals.words < 8) score = Math.min(score, 1);
  else if (signals.words < 20) score = Math.min(score, 4);
  if (signals.covered.length === 0 && (kind === "technical" || starCount === 0)) score = Math.min(score, 3);
  // A keyword heuristic can't verify correctness, so it never awards a perfect 10.
  return Math.min(score, 9);
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function technicalFeedback(s: Signals): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (s.coverage >= 0.6) strengths.push(`Covered the core concepts — ${list(s.covered.slice(0, 3))}.`);
  else if (s.covered.length > 0) strengths.push(`Touched on relevant ideas such as ${list(s.covered.slice(0, 2))}.`);
  if (s.reasoning) strengths.push("Explained the why and the trade-offs, not just the what.");
  if (s.example) strengths.push("Grounded the explanation in a concrete example.");
  if (s.signposting || s.sentences >= 4) strengths.push("Clear structure that is easy to follow out loud.");
  if (s.words >= 50 && s.words <= 330) strengths.push("A good level of detail for a spoken answer.");

  if (s.covered.length === 0) improvements.push("Answer the question directly first — your answer didn't touch its core concepts.");
  if (s.coverage < 1 && s.missing.length) improvements.push(`Bring in ${list(s.missing.slice(0, 3))} — interviewers listen for these.`);
  if (s.words < 50) improvements.push("Expand your answer — aim for about 1–2 minutes (roughly 120–250 words).");
  if (s.words > 330) improvements.push("Tighten it up: lead with a one-line answer, then two or three supporting points.");
  if (!s.reasoning) improvements.push("Explain why: compare alternatives or trade-offs to show depth.");
  if (!s.example) improvements.push("Add a concrete example from a project, internship or coursework.");
  if (!s.signposting && s.sentences >= 3) improvements.push("Signpost your structure (first…, then…, finally…) so it's easy to follow.");
  if (!improvements.length) improvements.push("To push this further, connect it to a real production trade-off or failure you've seen.");

  return { strengths, improvements };
}

function behavioralFeedback(s: Signals): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const starCount = Object.values(s.star).filter(Boolean).length;

  if (starCount === 4) strengths.push("Followed the STAR structure: situation, task, action and result.");
  if (s.star.action) strengths.push("Made your own actions clear by speaking in the first person.");
  if (s.star.result && s.metrics) strengths.push("Quantified the result — numbers make impact memorable.");
  else if (s.star.result) strengths.push("Closed the loop by explaining the outcome.");
  if (s.reflection) strengths.push("Reflected on what you learned, which shows self-awareness.");
  if (s.coverage >= 0.5) strengths.push(`Hit points interviewers look for, such as ${list(s.covered.slice(0, 2))}.`);

  if (s.words < 60) improvements.push("Give more detail — a strong story usually takes 1.5–2 minutes to tell.");
  if (!s.star.situation) improvements.push("Set the scene briefly: when and where did this happen, and what was at stake?");
  if (!s.star.task) improvements.push("State your specific responsibility or goal in that situation.");
  if (!s.star.action) improvements.push("Focus on what you did — use “I” and describe concrete steps.");
  if (!s.star.result) improvements.push("Finish with the result, ideally measurable (time saved, % improvement, feedback).");
  else if (!s.metrics) improvements.push("Quantify the outcome with a number if you can.");
  if (s.coverage < 0.4 && s.missing.length) improvements.push(`Weave in ${list(s.missing.slice(0, 2))} to make the story land.`);
  if (!s.reflection) improvements.push("End with a one-line lesson learned.");
  if (s.words > 400) improvements.push("Trim the backstory and spend more time on your actions and the result.");
  if (!improvements.length) improvements.push("To stand out further, link the lesson to how you'd apply it in this role.");

  return { strengths, improvements };
}

const GENERIC_IDEAL: Record<QuestionKind, string> = {
  technical:
    "A strong answer starts with a one-sentence direct answer, then explains how it works and why, compares it with at least one alternative and its trade-offs, and finishes with a concrete example from a project — for instance, where you applied it, what went wrong and what you would do differently.",
  behavioral:
    "A strong answer uses STAR: one or two sentences of Situation and Task to set the scene, most of the time on the specific Actions you personally took, and a Result with a number or concrete outcome, closing with what you learned and would repeat next time.",
};

interface DemoEvaluation {
  evaluation: Evaluation;
  signals: Signals;
}

function evaluateWithSignals(question: string, answer: string, kind: QuestionKind): DemoEvaluation {
  const bank = findBankQuestion(question);
  const effectiveKind = bank?.kind ?? kind;
  const ideal = bank?.ideal ?? GENERIC_IDEAL[effectiveKind];
  const signals = analyse(answer, bank?.keywords ?? fallbackKeywords(question), ideal);
  const score = scoreFromSignals(signals, effectiveKind);
  const feedback = effectiveKind === "technical" ? technicalFeedback(signals) : behavioralFeedback(signals);

  const evaluation = normalizeEvaluation({
    score,
    strengths: feedback.strengths.length ? feedback.strengths : ["You attempted the question — that's the first step."],
    improvements: feedback.improvements,
    idealAnswer: ideal,
    competency: bank?.competency ?? (effectiveKind === "technical" ? "Technical depth" : "Structure / STAR"),
  });
  return { evaluation, signals };
}

export function demoEvaluate(config: InterviewConfig, question: string, answer: string, index: number): Evaluation {
  return evaluateWithSignals(question, answer, questionKind(config, index)).evaluation;
}

/* ----------------------------------------------------------------------------
 * Heuristic report
 * ------------------------------------------------------------------------- */

const FOCUS_TEXT: Record<Competency, string> = {
  "Technical depth": "Technical depth — go one level deeper than definitions: explain how things work internally and when you'd choose one approach over another.",
  Communication: "Communication — lead with a one-sentence answer, then support it with two or three clearly signposted points.",
  "Problem solving": "Problem solving — talk through your approach step by step: clarify, measure, form hypotheses, then fix and verify.",
  "Structure / STAR": "Story structure — use STAR (Situation, Task, Action, Result) and finish with a measurable result.",
  "Role knowledge": "Role knowledge — revise the core fundamentals of the role so you can answer them crisply and confidently.",
};

const ROLE_NEXT_STEPS: Record<RoleId, string[]> = {
  frontend: [
    "Rebuild one small feature (for example a searchable list) and explain its rendering, state and accessibility choices out loud.",
    "Revise browser fundamentals: the event loop, the rendering pipeline and Core Web Vitals.",
  ],
  backend: [
    "Design a small API end to end (schema, endpoints, auth, caching) and narrate the trade-offs as if to an interviewer.",
    "Revise databases: indexing, transactions and isolation levels, and when to choose SQL or NoSQL.",
  ],
  fullstack: [
    "Ship a tiny full-stack feature (for example comments) and explain each layer from database to UI in under three minutes.",
    "Revise web fundamentals: HTTP, CORS, caching layers and authentication versus authorization.",
  ],
  data: [
    "Solve two SQL problems a day using joins, window functions and CTEs, explaining your logic out loud.",
    "Practise a metric-investigation framework: validate the data, segment, check seasonality, then form hypotheses.",
  ],
  devops: [
    "Build a small CI/CD pipeline that tests, containerises and deploys an app, and be ready to explain each stage.",
    "Revise Kubernetes debugging, safe rollout strategies and SLO-based alerting.",
  ],
  pm: [
    "Practise one product-sense question a day: clarify the user, the problem, the solution and the success metric.",
    "Prepare a prioritisation example using a framework such as RICE with real numbers.",
  ],
  hr: [
    "Write five STAR stories (conflict, failure, leadership, pressure, initiative) and rehearse each in under two minutes.",
    "Research the company's mission, products and values so your motivation answers are specific.",
  ],
};

const COMPETENCY_STEP: Record<Competency, string> = {
  "Technical depth": "For every concept you revise, prepare the 'why' and one trade-off, not just the definition.",
  Communication: "Record yourself answering three questions and check that each answer starts with a clear one-line summary.",
  "Problem solving": "Practise thinking aloud on two open-ended scenario questions this week, using a clarify → measure → fix → verify structure.",
  "Structure / STAR": "Turn your three best experiences into STAR stories with a measurable result for each.",
  "Role knowledge": "Make a one-page cheat sheet of the role's fundamentals and quiz yourself on it daily.",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/**
 * 0–10 signal estimates per competency, derived from how an answer was given.
 * They let the report assess competencies that no question was explicitly
 * tagged with; each is capped a few points above the answer's own score, so a
 * fluent but off-topic answer can't rate as excellent communication.
 */
function competencySignals(signals: Signals, kind: QuestionKind, score: number): Partial<Record<Competency, number>> {
  const cap = (value: number) => Math.min(value, score + 3);
  const length = lengthPoints(signals.words, kind) / 2; // 0–1
  const structure =
    (signals.signposting ? 0.35 : 0) + (signals.sentences >= 3 ? 0.35 : signals.sentences >= 2 ? 0.15 : 0) + (signals.example ? 0.3 : 0);
  const result: Partial<Record<Competency, number>> = { Communication: cap(length * 5 + structure * 5) };
  if (kind === "behavioral") {
    const star = Object.values(signals.star).filter(Boolean).length / 4;
    result["Structure / STAR"] = cap(star * 7 + (signals.metrics ? 1.5 : 0) + (signals.reflection ? 1.5 : 0));
  } else {
    result["Technical depth"] = cap(signals.coverage * 7 + (signals.reasoning ? 1.5 : 0) + (signals.example ? 1.5 : 0));
  }
  return result;
}

export function demoReport(config: InterviewConfig, history: HistoryItem[]): Report {
  const turns = history.map((item, index) => {
    const answered = !item.skipped && item.answer.trim().length > 0;
    const kind = findBankQuestion(item.question)?.kind ?? questionKind(config, index);
    const result = answered ? evaluateWithSignals(item.question, item.answer, kind) : null;
    return {
      index,
      item,
      kind,
      result,
      score: answered ? (item.score ?? result?.evaluation.score ?? 0) : 0,
      competency: item.competency ?? result?.evaluation.competency,
    };
  });
  const answered = turns.filter((turn) => turn.result);

  const overallScore = averageScore(turns.map((turn) => turn.score));
  const fallback = overallScore / 10;

  const signalsByTurn = answered.map((turn) => competencySignals(turn.result!.signals, turn.kind, turn.score));
  const assessed = new Set<Competency>();
  const competencies = COMPETENCIES.map((name) => {
    const tagged = mean(answered.filter((turn) => turn.competency === name).map((turn) => turn.score));
    const signal = mean(signalsByTurn.flatMap((signals) => (signals[name] === undefined ? [] : [signals[name]])));
    if (tagged !== null || signal !== null) assessed.add(name);
    const score = tagged !== null && signal !== null ? (tagged + signal) / 2 : (tagged ?? signal ?? fallback);
    return { name, score: round1(Math.min(10, Math.max(0, score))) };
  });

  // Prefer competencies the interview actually tested when naming strengths and gaps.
  const evidenced = competencies.filter((competency) => assessed.has(competency.name));
  const ranked = [...(evidenced.length >= 2 ? evidenced : competencies)].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const weakest = ranked.slice(-2).reverse();
  const readiness = readinessForScore(overallScore);
  const skipped = turns.length - answered.length;

  const who = config.name ? `${config.name}, you` : "You";
  const skippedNote = skipped ? ` (${skipped} skipped)` : "";
  const readinessSentence = {
    ready: "You're interview-ready at this level — keep sharpening with harder questions and new scenarios.",
    almost: "You're close — a week of focused practice on the areas below should get you over the line.",
    not_yet: "Strengthen the fundamentals below and retake this interview in a week to track your progress.",
  }[readiness];
  const summary =
    `${who} scored ${overallScore}/100 across ${turns.length} ${typeLabel(config.type).toLowerCase()} question${turns.length === 1 ? "" : "s"}${skippedNote}${config.role === "hr" ? " in an HR & behavioral round" : ` for the ${roleLabel(config.role)} role`} (${levelLabel(config.level)}). ` +
    (answered.length
      ? `Your strongest area was ${best.name.toLowerCase()} (${best.score}/10)` +
        (weakest[0].name !== best.name ? `, and the biggest opportunity is ${weakest[0].name.toLowerCase()} (${weakest[0].score}/10). ` : ". ")
      : "You skipped every question, so there wasn't enough to assess yet. ") +
    readinessSentence;

  const topStrengths: string[] = [];
  const bestTurn = [...answered].sort((a, b) => b.score - a.score)[0];
  if (bestTurn && bestTurn.score >= 5) {
    topStrengths.push(`Your best answer was Q${bestTurn.index + 1} (${bestTurn.score}/10) — reuse its depth and structure in other answers.`);
  }
  for (const turn of [...answered].sort((a, b) => b.score - a.score)) {
    topStrengths.push(...turn.result!.evaluation.strengths);
  }
  if (answered.length && skipped === 0) topStrengths.push("You attempted every question instead of skipping under pressure.");

  const focusAreas = weakest.map((competency) => FOCUS_TEXT[competency.name]);
  if (skipped) {
    focusAreas.push(`You skipped ${skipped} question${skipped === 1 ? "" : "s"} — a partial, honest attempt almost always scores better than silence.`);
  }
  const commonImprovement = answered
    .flatMap((turn) => turn.result!.evaluation.improvements)
    .find((text) => !text.startsWith("Bring in") && !text.startsWith("Weave in"));
  if (commonImprovement) focusAreas.push(commonImprovement);

  const nextSteps = [
    ...ROLE_NEXT_STEPS[config.role],
    COMPETENCY_STEP[weakest[0].name],
    "Retake this interview in a week with the same settings and compare your scores in History.",
  ];

  return {
    overallScore,
    readiness,
    summary,
    topStrengths: [...new Set(topStrengths)].slice(0, 4),
    focusAreas: [...new Set(focusAreas)].slice(0, 4),
    nextSteps,
    competencies,
  };
}
