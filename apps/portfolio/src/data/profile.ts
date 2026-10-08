/**
 * Everything personal lives in this one file — edit it to make the site yours.
 * Leave a field as an empty string to hide it.
 */
export const profile = {
  name: "Jeevan",
  role: "Full-Stack Web Developer",
  tagline: "I build fast, accessible and delightful web apps with React, Next.js and TypeScript.",
  about: [
    "I'm a developer who enjoys turning ideas into polished products — from pixel-perfect interfaces to the data and state management that power them.",
    "My recent work spans e-commerce, productivity, fintech dashboards and developer tools. I care about clean architecture, real-world UX details (loading states, validation, accessibility) and shipping to production with CI/CD on Vercel.",
  ],
  location: "India",
  openToWork: true,
  github: "Jeevan2410",
  linkedin: "",
  email: "",
  resumeBuilderUrl: "https://resumeforge-jeevan.vercel.app",
  siteUrl: "https://jeevan-portfolio.vercel.app",
  repoUrl: "https://github.com/Jeevan2410/sabzee",
};

export const highlights = [
  { value: "5", label: "Production apps shipped" },
  { value: "100%", label: "TypeScript" },
  { value: "CI/CD", label: "Auto-deploys on Vercel" },
];

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "JavaScript (ES2023)", "HTML5", "CSS3", "SQL"] },
  { group: "Frontend", items: ["React 19", "Next.js 16 (App Router)", "Tailwind CSS v4", "Zustand", "Recharts", "dnd-kit"] },
  { group: "Backend & Data", items: ["Node.js", "Route Handlers / REST APIs", "GitHub REST API", "localStorage / sessionStorage", "CSV & JSON pipelines"] },
  { group: "Tooling", items: ["Git & GitHub", "Vite", "ESLint / oxlint", "Playwright", "Vercel", "npm"] },
];

export interface Project {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  highlights: string[];
  stack: string[];
  live: string;
  source: string;
  from: string;
  to: string;
}

const source = (app: string) => `${profile.repoUrl}/tree/main/apps/${app}`;

export const projects: Project[] = [
  {
    slug: "sabzee",
    name: "Sabzee",
    emoji: "🥬",
    tagline: "Quick-commerce grocery storefront",
    description:
      "A Blinkit-style store for fresh vegetables and fruits with URL-driven filters, statically generated product pages, a persistent cart, a coupon engine, validated checkout and live order tracking.",
    highlights: ["36 SSG product pages + REST API", "Coupon & delivery-fee engine", "Hydration-safe persisted cart", "Checkout validation (phone, pincode, UPI)"],
    stack: ["Next.js 16", "TypeScript", "Tailwind CSS", "Zustand"],
    live: "https://sabzee.vercel.app",
    source: source("sabzee"),
    from: "#16a34a",
    to: "#84cc16",
  },
  {
    slug: "taskflow",
    name: "TaskFlow",
    emoji: "⚡",
    tagline: "Trello-style Kanban project manager",
    description:
      "Multi-board Kanban with accessible drag & drop across lists, priorities, colour labels, due-date alerts, checklists, search & filters, analytics and dark mode.",
    highlights: ["Pointer + keyboard drag & drop", "Insights: completion & overdue", "Rich task editor with checklists", "Offline-first persistence"],
    stack: ["React 19", "dnd-kit", "Zustand", "Vite"],
    live: "https://taskflow-kanban-jeevan.vercel.app",
    source: source("taskflow"),
    from: "#6366f1",
    to: "#a855f7",
  },
  {
    slug: "fintrack",
    name: "FinTrack",
    emoji: "💸",
    tagline: "Personal finance dashboard",
    description:
      "Track income and expenses, set category budgets and visualise spending with interactive charts. Includes month-over-month KPIs and CSV import/export.",
    highlights: ["Bar, donut & area charts", "Budget pace tracking & alerts", "CSV import/export (RFC 4180)", "Vendor chunk splitting"],
    stack: ["React 19", "Recharts", "Zustand", "Tailwind CSS"],
    live: "https://fintrack-jeevan.vercel.app",
    source: source("fintrack"),
    from: "#10b981",
    to: "#6366f1",
  },
  {
    slug: "resumeforge",
    name: "ResumeForge",
    emoji: "✨",
    tagline: "ATS-friendly resume builder",
    description:
      "Build a resume with a live A4 preview, three templates and accent colours, a weighted resume-strength score and one-click text-based PDF export.",
    highlights: ["3 print-ready templates", "Resume strength analyser", "Section reordering & hiding", "JSON backup / restore"],
    stack: ["React 19", "TypeScript", "Tailwind CSS", "Print CSS"],
    live: "https://resumeforge-jeevan.vercel.app",
    source: source("resumeforge"),
    from: "#4f46e5",
    to: "#d946ef",
  },
  {
    slug: "gitscope",
    name: "GitScope",
    emoji: "🔭",
    tagline: "GitHub profile analytics",
    description:
      "Analyze any GitHub user: languages, stars, yearly activity, a searchable repo explorer and a recruiter-readiness checklist — powered by the GitHub REST API.",
    highlights: ["Typed API client with pagination", "Rate-limit aware caching", "Shareable ?u= links", "Portfolio health score"],
    stack: ["React 19", "GitHub API", "Recharts", "Vite"],
    live: "https://gitscope-jeevan.vercel.app",
    source: source("gitscope"),
    from: "#34d399",
    to: "#22d3ee",
  },
];
