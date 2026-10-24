# ResumeForge

**An ATS-friendly resume builder that runs entirely in your browser.**

**Live demo:** [resumeforge-jeevan.vercel.app](https://resumeforge-jeevan.vercel.app)

Write one resume, then tailor a copy for every application. ResumeForge has 13 templates, real page-by-page pagination, an ATS checker, a job-description matcher and cover letters, and it exports text-based PDF and Word files. You don't need an account and nothing is uploaded: your data stays in your browser.

![Editor with live preview](docs/editor.png)

## Template gallery

All 13 templates below show the built-in developer sample on one A4 page.

| | | | |
|:-:|:-:|:-:|:-:|
| <img src="docs/templates/modern.png" width="200" alt="Modern template"><br>**Modern** | <img src="docs/templates/classic.png" width="200" alt="Classic template"><br>**Classic** | <img src="docs/templates/minimal.png" width="200" alt="Minimal template"><br>**Minimal** | <img src="docs/templates/ats.png" width="200" alt="ATS-Plain template"><br>**ATS-Plain** |
| <img src="docs/templates/executive.png" width="200" alt="Executive template"><br>**Executive** | <img src="docs/templates/corporate.png" width="200" alt="Corporate template"><br>**Corporate** | <img src="docs/templates/elegant.png" width="200" alt="Elegant template"><br>**Elegant** | <img src="docs/templates/creative.png" width="200" alt="Creative template"><br>**Creative** |
| <img src="docs/templates/tech.png" width="200" alt="Tech template"><br>**Tech** | <img src="docs/templates/startup.png" width="200" alt="Startup template"><br>**Startup** | <img src="docs/templates/timeline.png" width="200" alt="Timeline template"><br>**Timeline** | <img src="docs/templates/compact.png" width="200" alt="Compact template"><br>**Compact** |
| <img src="docs/templates/academic.png" width="200" alt="Academic CV template"><br>**Academic CV** | | | |

## Features

### Templates & design
- **13 templates** covering one- and two-column layouts, photo layouts, ATS-safe single-column layouts and an academic CV. The gallery can be filtered by *ATS-friendly*, *Two-column*, *Photo*, *Creative* and *One-page*.
- **Real pagination.** Entries are never split across pages, headings stay with their first entry, and side columns continue onto the next page. Running headers and page numbers appear where the template uses them. Both A4 and US Letter are supported.
- **Fit to pages.** If the last page is nearly empty, one click tightens spacing, then line height, font size and margins, changing as little as possible. You can undo it.
- **Design controls.** Choose an accent preset or a custom colour, one of 10 font pairings (Google Fonts loaded on demand), font size, line height, spacing, margins, heading case, date format, photo shape and contact icons.

![Template gallery and design controls](docs/gallery.png)

### Editor
- **Dashboard** for many resumes. Start from a blank outline or a developer or researcher sample, then search, sort, rename, duplicate or delete. Each card shows a live thumbnail.
- **13 section kinds**, including experience, education, projects, skills, publications, volunteering, references and custom sections. You can rename or hide any section, or move it to the side column.
- **Drag and drop** for sections, entries and bullets, using a mouse, touch or the keyboard, with screen-reader announcements.
- **Inline formatting** (`**bold**`, `*italic*`, links), month pickers with "Present", skill and language levels, and photo upload with cropping.
- **Undo / redo**, named versions (snapshots), autosave, keyboard shortcuts (`?`), and click-to-edit: clicking anything in the preview jumps to its field.
- **Dark mode** and a **mobile layout** with Edit / Preview tabs.

| Dark mode | Mobile |
|:-:|:-:|
| <img src="docs/editor-dark.png" width="560" alt="Editor in dark mode"> | <img src="docs/mobile.png" width="200" alt="Mobile preview"> |

### Smart analysis
- **ATS & strength check.** Gives a 0–100 score across contact, content, impact, language and format, plus readability (Flesch), quantification and action-verb stats. Issues come with one-click rewrites, and a **Fix** button jumps to the exact field.
- **Job match.** Paste a job posting to see your match %, which must-have and nice-to-have keywords are missing, where to add each one, and the required years of experience compared with yours. Hyphenated phrases like "React-based" are recognised, and "nice to have" items are not counted as requirements.
- **Bullet helper.** Gives categorised action verbs, STAR / XYZ templates and example bullets, and rewrites weak openers ("Responsible for…").

| ATS check | Job match |
|:-:|:-:|
| <img src="docs/ats.png" width="420" alt="ATS check"> | <img src="docs/job-match.png" width="420" alt="Job match"> |

### Cover letters
- **Three starters** drafted from your resume (your strongest bullet, top skills and current role). They can be autofilled with the company and role from the job description.
- **Three layouts** that reuse the resume template's header, colours and fonts. Export to PDF, Word or text.

![Cover letter editor](docs/cover-letter.png)

### Import, export & sharing
- **PDF:** text-based and ATS-readable, printed through the browser, with the file name set to `First_Last_Resume`.
- **Word (.docx):** editable in Word and Google Docs, generated in a lazily loaded chunk.
- **Plain text, Markdown, ResumeForge backup (.json) and [JSON Resume](https://jsonresume.org)**. Backup and JSON Resume files can be imported again, and the import preview warns about anything it could not carry over.
- **Share links:** the resume is compressed into the URL and opens as a read-only view with "Make a copy".

### Privacy: everything stays in the browser
There is no backend, no account and no analytics. Resumes are saved in `localStorage`. Share links hold the data in the URL fragment, which is never sent to a server. The only network requests are for static assets and the optional web fonts.

![Dashboard](docs/dashboard.png)

## Architecture

```mermaid
flowchart LR
  subgraph Store["store/ (zustand)"]
    RS[resumeStore<br/>docs · undo history · snapshots]
    UI[uiStore<br/>panel · zoom · theme]
    ST[throttled localStorage]
  end
  subgraph Lib["lib/ (pure TypeScript, unit tested)"]
    M[types · normalize · migrate]
    A[analysis · atsReport · jobMatch · keywords · rewrite]
    X[exportText · docxModel · jsonresume · share · importer]
    P[paginate · fit · design]
  end
  subgraph Templates["templates/"]
    REG[registry<br/>auto-discovers 13 templates]
    PD[PagedDocument<br/>measure → paginate → pages]
  end
  subgraph Features["features/ + app/"]
    ED[editor · design]
    AN[analysis · cover letter]
    IO[import · export · share · print]
  end
  RS <--> ST
  RS --> M
  ED -- actions --> RS
  RS -- resume data --> PD
  REG --> PD
  PD --> P
  AN --> A
  IO --> X
  IO --> PD
  ED --> PD
```

- **`lib/`** holds all business logic as plain functions with no React or DOM, so it is easy to test with `node --test`.
- **The template registry** finds every `templates/<id>/index.tsx` through `import.meta.glob`. To add a template, create a folder.
- **`PagedDocument`** measures each block off-screen and splits blocks into pages. The editor preview, thumbnails, the share view and print all use this same component, so the PDF matches the preview.
- **Code splitting:** the editor, analysis, cover letter, import/export and the DOCX renderer load lazily. The dashboard needs only the main chunk (about 102 kB gzip), and the DOCX library (about 122 kB gzip) loads only when you export to Word.

## Testing

- **279 tests in 22 test files** (`node --test` with native TypeScript stripping, no test framework). They cover normalisation and migration of old or corrupt data, undo history, the store and throttled storage, ATS scoring, keyword extraction and job matching, rewrites, pagination and fit-to-pages, DOCX / Markdown / text / JSON Resume export and import round-trips, share links, and template helpers. They include regression tests for ReDoS-style slow inputs.
- **Strict TypeScript** (`tsc -b`) and **oxlint** run on every build.
- **CI** (GitHub Actions on Node 22) runs `npm ci`, lint, tests and build.
- Each template was also checked by hand in Chromium (through Playwright) at A4 and US Letter, in light and dark mode, and at 390 px phone width.

## Tech stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · Zustand · dnd-kit · docx · lz-string · Lucide icons · oxlint · `node --test`

## Getting started

Requires Node 22 or later.

```bash
npm ci
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run lint      # oxlint
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build
```

## Project structure

```
src/
├── lib/         # pure logic: data model, normalisation & migration, undo history, ATS analysis,
│                # keyword matching, rewrites, pagination, exports (text, Markdown, DOCX model,
│                # JSON Resume), import, share links, cover-letter helpers
├── store/       # zustand stores (resumes + UI), throttled storage, hash router, focus registry
├── templates/   # shared toolkit (PagedDocument, primitives, keep-together rules) + one folder per template
├── features/    # dashboard · editor · design · analysis · cover · io (import/export/share/print)
├── app/         # shell: screens, header, preview pane, print root, lazy module registry
└── ui/          # UI kit (buttons, menus, dialogs, sliders, toasts) with dark mode
tests/           # node --test suites + job-description fixtures
docs/            # screenshots used in this README
```

## Author

Built by **Jeevan** · [GitHub: Jeevan2410](https://github.com/Jeevan2410)
