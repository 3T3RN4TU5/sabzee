/**
 * Everything personal lives in this one file — edit it to make the site yours.
 * Leave a field as an empty string to hide it.
 */
export const profile = {
  name: "Jeevan",
  role: "Data, ML & Full-Stack Developer",
  tagline: "I turn data into decisions and models into products — from SQL analytics and explainable machine learning to scientific simulations and fast web apps with Python, React and TypeScript.",
  about: [
    "I'm a developer who enjoys turning ideas into polished products — from pixel-perfect interfaces to the data and state management that power them.",
    "My recent work spans data analysis and machine learning (pandas, scikit-learn, SQL, explainable models), scientific computing, AI-powered apps built on the Claude API, real-time collaboration with Supabase, in-browser developer tools, data dashboards and productivity apps. I care about clean architecture, real-world UX details (loading states, validation, accessibility) and shipping to production with CI/CD on Vercel.",
  ],
  location: "India",
  openToWork: true,
  github: "Jeevan2410",
  linkedin: "",
  email: "",
  resumeBuilderUrl: "https://resumeforge-jeevan.vercel.app",
  siteUrl: "https://jeevan2410-portfolio.vercel.app",
  repoUrl: "https://github.com/Jeevan2410/portfolio.",
};

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "Python", "SQL", "JavaScript (ES2023)", "HTML5 & CSS3"] },
  { group: "Frontend", items: ["React 19", "Next.js 16 (App Router)", "Tailwind CSS v4", "Zustand", "Recharts", "CodeMirror 6", "Web Workers"] },
  { group: "Backend, AI & Data", items: ["Claude API (Anthropic SDK)", "Streaming & structured outputs", "Supabase (Postgres, Realtime, RLS)", "Node.js Route Handlers", "Zod validation", "GitHub REST API"] },
  { group: "Data & ML", items: ["pandas & NumPy", "scikit-learn", "DuckDB (SQL & WASM)", "Statistics & A/B testing", "Forecasting & segmentation", "Numerical methods"] },
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

const source = (repo: string) => `https://github.com/${profile.github}/${repo}`;

export const projects: Project[] = [
  {
    slug: "interview-coach",
    name: "AI Interview Coach",
    emoji: "🤖",
    tagline: "AI mock interviews powered by Claude",
    description:
      "Practice realistic technical and behavioral interviews for your target role and level. The AI interviewer streams one question at a time, scores every answer against a rubric and builds a final readiness report.",
    highlights: ["Streaming Claude responses", "Structured, schema-validated scoring", "Voice answers via Web Speech API", "Demo mode, rate limiting & refusal fallbacks"],
    stack: ["Next.js 16", "Claude API", "Zod", "Tailwind CSS"],
    live: "https://ai-interview-coach-jeevan.vercel.app",
    source: source("ai-interview-coach"),
    from: "#7c3aed",
    to: "#06b6d4",
  },
  {
    slug: "churn-predictor",
    name: "Churn Predictor ML",
    emoji: "🎯",
    tagline: "Explainable machine learning",
    description:
      "End-to-end ML on the real IBM Telco dataset: a leakage-safe scikit-learn pipeline, cross-validated model selection, calibration and a profit-optimal threshold. The model is exported to JSON and served in the browser with exact SHAP explanations, matching sklearn to 1e-16.",
    highlights: ["Test ROC-AUC 0.847 with bootstrap CIs", "TreeSHAP & linear SHAP from scratch", "Profit curve & cost-based threshold", "Model card & fairness slices"],
    stack: ["Python", "scikit-learn", "TypeScript", "React 19"],
    live: "https://churn-predictor-ml-jeevan.vercel.app",
    source: source("churn-predictor-ml"),
    from: "#f43f5e",
    to: "#8b5cf6",
  },
  {
    slug: "retail-analytics",
    name: "Retail Sales Analytics",
    emoji: "📈",
    tagline: "Analytics case study · 541k orders",
    description:
      "Python ETL with 31 data-quality checks into a DuckDB star schema, 15 analytical SQL queries, RFM + k-means segmentation, Holt-Winters forecasting, A/B test analysis with power, and BG/NBD customer lifetime value — presented in an interactive dashboard and a stakeholder memo.",
    highlights: ["Star schema + window-function SQL", "Cohort retention & basket lift", "Forecast vs baselines (MAPE)", "A/B test: CIs, SRM, power"],
    stack: ["Python", "pandas", "DuckDB SQL", "React 19"],
    live: "https://retail-sales-analytics-jeevan.vercel.app",
    source: source("retail-sales-analytics"),
    from: "#0ea5e9",
    to: "#14b8a6",
  },
  {
    slug: "datalens",
    name: "DataLens",
    emoji: "🔍",
    tagline: "In-browser SQL & automated EDA",
    description:
      "Drop in CSV, JSON or Parquet and query it with DuckDB-WASM in a Web Worker — no server, data never leaves the browser. Automatic profiling, outlier and data-quality warnings, a chart and pivot builder that write the SQL for you, and a virtualized grid that scrolls 1M rows at 60 fps.",
    highlights: ["DuckDB-WASM in a Web Worker", "SQL-based profiling & outliers", "Chart / pivot builders → SQL", "1M-row virtualized grid"],
    stack: ["DuckDB-WASM", "CodeMirror 6", "TypeScript", "React 19"],
    live: "https://datalens-eda-jeevan.vercel.app",
    source: source("datalens-eda"),
    from: "#06b6d4",
    to: "#6366f1",
  },
  {
    slug: "ml-playground",
    name: "ML Playground",
    emoji: "🧠",
    tagline: "Machine learning from first principles",
    description:
      "An autograd engine and every algorithm written from scratch in TypeScript: neural networks trained live in a Web Worker, optimizer races on loss surfaces, SVM, trees, forests, k-means, DBSCAN, PCA and t-SNE — with 89 tests including gradient checks and scikit-learn cross-checks.",
    highlights: ["Reverse-mode autograd engine", "SGD / Momentum / Adam / AdamW", "SVM (SMO), forests, t-SNE", "Gradient checks vs finite differences"],
    stack: ["TypeScript", "Web Workers", "Canvas", "KaTeX"],
    live: "https://ml-playground-jeevan.vercel.app",
    source: source("ml-playground"),
    from: "#22d3ee",
    to: "#f59e0b",
  },
  {
    slug: "sci-sim-lab",
    name: "SciSim Lab",
    emoji: "🔬",
    tagline: "Verified scientific computing",
    description:
      "Adaptive RK45, symplectic integrators, Barnes–Hut N-body, PDE solvers, Ising model, Lyapunov exponents, FFT and epidemic model fitting — each with a verification suite that measures convergence orders and cross-checks against SciPy and exact solutions.",
    highlights: ["Measured convergence orders (RK4 ≈ 4.0)", "Barnes–Hut vs direct O(N²)", "Ising phase transition vs Onsager", "Cross-checked against SciPy"],
    stack: ["TypeScript", "Numerical methods", "Web Workers", "Canvas"],
    live: "https://sci-sim-lab-jeevan.vercel.app",
    source: source("sci-sim-lab"),
    from: "#a855f7",
    to: "#06b6d4",
  },
  {
    slug: "codearena",
    name: "CodeArena",
    emoji: "🧑‍💻",
    tagline: "LeetCode-style coding practice in the browser",
    description:
      "Solve classic interview problems in a CodeMirror editor and run your JavaScript against sample and hidden tests in a sandboxed Web Worker, with timeouts, hints, solutions and progress tracking.",
    highlights: ["Sandboxed Web Worker test runner", "Hidden tests & time-limit detection", "Hints, solutions & submissions history", "Progress dashboard & daily streak"],
    stack: ["React 19", "CodeMirror 6", "Web Workers", "Vite"],
    live: "https://codearena-jeevan.vercel.app",
    source: source("codearena"),
    from: "#f59e0b",
    to: "#ef4444",
  },
  {
    slug: "algoviz",
    name: "AlgoViz",
    emoji: "📊",
    tagline: "Interactive algorithm visualizer",
    description:
      "Watch sorting algorithms and graph searches run step by step: scrub through every comparison and swap, or draw walls and mazes and race BFS, Dijkstra and A* to the target.",
    highlights: ["7 sorting algorithms with step-back & scrubbing", "BFS, DFS, Dijkstra, A*, Greedy, Bidirectional", "Maze generation & weighted nodes", "Smooth animation without full re-renders"],
    stack: ["React 19", "TypeScript", "Tailwind CSS", "Vite"],
    live: "https://algoviz-jeevan.vercel.app",
    source: source("algoviz"),
    from: "#0ea5e9",
    to: "#22c55e",
  },
  {
    slug: "devchat",
    name: "DevChat",
    emoji: "💬",
    tagline: "Real-time chat rooms for developers",
    description:
      "Join rooms and chat live with presence, typing indicators and unread counts. Messages stream over Supabase Realtime, with Postgres Row Level Security and database-level rate limiting.",
    highlights: ["Supabase Realtime + Presence + Broadcast", "Row Level Security & rate-limit triggers", "Pagination & optimistic sending", "Dark / light themes, mobile drawer"],
    stack: ["React 19", "Supabase", "PostgreSQL", "Vite"],
    live: "https://devchat-jeevan.vercel.app",
    source: source("devchat"),
    from: "#ec4899",
    to: "#8b5cf6",
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
    source: source("taskflow-kanban"),
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
    source: source("fintrack-dashboard"),
    from: "#10b981",
    to: "#6366f1",
  },
  {
    slug: "resumeforge",
    name: "ResumeForge",
    emoji: "✨",
    tagline: "Resume builder · 13 templates",
    description:
      "A full resume builder: 13 print-perfect templates with true multi-page pagination, a multi-resume dashboard, drag-and-drop editor with undo and versions, ATS checker with one-click fixes, job-description keyword matching, cover letters, and PDF / Word / Markdown / JSON Resume export — all in the browser.",
    highlights: ["13 templates, A4 & US Letter, Fit-to-pages", "ATS check + job-description matcher", "Cover letters, DOCX & JSON Resume export", "279 tests, XSS-safe, ReDoS-audited"],
    stack: ["React 19", "TypeScript", "Zustand", "dnd-kit"],
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
    source: source("sabzee-store"),
    from: "#16a34a",
    to: "#84cc16",
  },
];

export const highlights = [
  { value: String(projects.length), label: "Live projects" },
  { value: "Py · SQL · TS", label: "Data to production" },
  { value: "CI/CD", label: "Auto-deploys on Vercel" },
];
