# ResumeForge — ATS-friendly resume builder

**Live demo:** [resumeforge-jeevan.vercel.app](https://resumeforge-jeevan.vercel.app)

Build several tailored resumes and cover letters in the browser, with 13 templates, an ATS checker, a job-description matcher and text-based PDF / Word export. Everything stays in your browser: no account, no server, no tracking.

**Tech:** React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · Zustand (persisted) · dnd-kit · docx · lz-string · Lucide icons · oxlint · `node --test`

## Features

**Resumes and templates**
- **Dashboard** for many resumes: create from a blank outline or a developer / researcher sample, then search, sort, rename, duplicate and delete. Each card has a live thumbnail.
- **13 templates**: Modern, Classic, Minimal, ATS-Plain, Executive, Corporate, Elegant, Creative, Tech, Startup, Timeline, Compact and Academic CV. They include one- and two-column layouts, photo layouts and ATS-safe layouts, and the gallery can be filtered.
- **Real pagination**: entries never split across pages, a side column continues onto later pages, and a running header and page numbers appear where the template uses them. A4 and US Letter are supported.
- **Design controls**: accent presets or a custom hex colour, 10 font pairings (Google Fonts loaded on demand), font size, line height, spacing, margins, heading case, date format, photo shape and contact icons.

**Editor**
- **Section kinds**: 13 of them (summary, experience, education, projects, skills, certifications, languages, awards, publications, volunteering, references, interests and custom). You can rename, hide, duplicate or move any section to the side column.
- **Drag and drop** for sections, entries and bullets, with mouse, touch or keyboard and screen-reader announcements.
- **Inline markdown** (`**bold**`, `*italic*`, links), month pickers with "Present", skill and language levels, and tags.
- **Photo upload** with a crop dialog. Photos are compressed to a small JPEG.
- **Undo / redo** (Ctrl+Z / Ctrl+Shift+Z), named **versions** (snapshots), autosave and keyboard shortcuts (press `?`).
- **Click to edit**: clicking anything in the preview jumps to its field.

**Smart tools**
- **ATS & strength check**: a 0–100 score across five categories, with readability, a 20-point checklist, one-click rewrites and a **Fix** button that jumps to the exact field.
- **Job match**: paste a job description to see the match %, the must-have keywords you are missing, where to place each one, and years of experience.
- **Bullet helper**: action verbs, STAR / XYZ templates and example bullets.
- **Cover letters**: three starters drafted from your resume and three layouts. Letters use the resume template's header, colours and fonts.

**Import / export**
- **PDF**: text-based and ATS-readable, saved through the browser print dialog, with the file name set to `First_Last_Resume`.
- **Word (.docx)**: generated in a lazily loaded chunk.
- **Other formats**: plain text, Markdown, a ResumeForge backup (.json) and [JSON Resume](https://jsonresume.org). These can be imported again, and v1 exports can be imported too.
- **Share links**: the resume is compressed into the URL and opens as a read-only view with a "Make a copy" option.

## Getting started

```bash
npm ci
npm run dev       # http://localhost:5173
npm test          # unit tests for the pure logic in src/lib (node --test)
npm run lint      # oxlint
npm run build     # type-check + production build
```

## Structure

```
src/
├── lib/         # pure, React-free logic + tests: data model, normalisation & migration, undo history,
│                # analysis/ATS, keyword matching, rewrites, pagination, exports (text, DOCX model,
│                # JSON Resume), share links, cover-letter helpers
├── store/       # zustand stores (resumes + UI), routing, "jump to field" focus registry
├── templates/   # shared toolkit (PageLayout, pagination, primitives) + one folder per template
├── features/    # dashboard · editor · design · analysis · cover · io (import/export/share/print)
├── app/         # shell: screens, header, preview pane, print root, lazy module registry
└── ui/          # app UI kit (buttons, menus, dialogs, sliders…) with dark mode
tests/           # node --test suites
```

Heavy modules (editor, analysis, cover letter, import/export, DOCX renderer) are split into lazy chunks, so the dashboard loads quickly.

## Author

Built by **Jeevan** · [github.com/Jeevan2410](https://github.com/Jeevan2410)
