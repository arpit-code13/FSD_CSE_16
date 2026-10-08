# NoteFlow

A modern, offline-first personal notes manager. Capture, organise, search and edit notes in a clean interface that works on phones and desktops. Everything is stored in the browser, so there is no backend and nothing to configure.

**Live demo:** `fsd-cse-16-i7it.vercel.app`

## Project Description

NoteFlow lets you write notes (with Markdown), file them under categories, tag them, colour-code them, pin the important ones, and find anything instantly with combined search, filters and sorting. Notes persist across refreshes and browser restarts using `localStorage`.

## Screenshots
<img width="1904" height="1077" alt="Screenshot 2026-10-09 014235" src="https://github.com/user-attachments/assets/a3e77d87-3393-4244-992e-9b01f17fdb36" />

<img width="1920" height="1200" alt="Screenshot 2026-10-09 014250" src="https://github.com/user-attachments/assets/ec917846-255a-43c1-ba79-d97d235df722" />

<img width="1920" height="1200" alt="Screenshot 2026-10-09 014300" src="https://github.com/user-attachments/assets/0228453a-21d2-4fd0-b189-f86f1c413ae6" />

<img width="717" height="1600" alt="WhatsApp Image 2026-10-09 at 1 46 39 AM" src="https://github.com/user-attachments/assets/c31e3286-cc6c-4757-8cef-7d87054558b5" />




## Features

- Create, edit and delete notes (title, Markdown content, category, tags, colour, created/updated dates)
- Validation with friendly messages; unsaved-changes guard when closing the editor
- Delete confirmation dialog + toast notifications for every action
- Card grid with title, preview, category, tags, relative dates, pin state and colour accent
- Real-time search across title, content, tags and categories
- Filters (All, Pinned, Category, Tag) that combine with search, and 4 sort modes; pinned notes always on top
- Pin / unpin with persistence
- Extensible category list (`src/data/constants.js`)
- Markdown writing with live preview (headings, bold, italic, lists, code blocks, links) rendered safely (no raw HTML)
- Light / dark / system theme, persisted, applied before first paint (no flash)
- JSON export and validated import (merge, never overwrites); clear-all with confirmation
- Keyboard shortcuts: `N` new note, `/` search, `Esc` close, `Ctrl/⌘ + Enter` save
- Installable PWA with service worker; works offline after the first load
- Responsive layout (sidebar becomes a drawer on mobile), accessible dialogs, focus management, reduced-motion support
- Several open tabs stay in sync through the `storage` event

## Technology Stack

React 18 · Vite 5 · Tailwind CSS 3 · JavaScript (ES modules) · Lucide React · react-markdown · vite-plugin-pwa · localStorage · Node's built-in test runner

## Folder Structure

```
NoteFlow/
├── public/                    favicon + PWA icons
├── src/
│   ├── components/
│   │   ├── common/            Modal, ConfirmDialog, EmptyState, ErrorBoundary
│   │   ├── layout/            Sidebar, MobileTopBar, PageHeader, Logo
│   │   ├── notes/             NoteCard, NoteGrid, NoteEditor, Toolbar, TagInput, ColorPicker, MarkdownPreview
│   │   └── settings/          SettingsDialog (theme, storage, import/export, shortcuts)
│   ├── context/               NotesContext, ThemeContext, ToastContext
│   ├── hooks/                 useNotes, useNoteView (search/filter/sort), useShortcuts
│   ├── services/              storageService.js  <- the ONLY file that touches localStorage
│   ├── utils/                 noteUtils.js (sanitise, validate, search, filter, sort, dates)
│   ├── data/                  constants.js, seedNotes.js
│   ├── styles/                index.css (design tokens + Markdown styles)
│   ├── App.jsx
│   └── main.jsx
├── tests/                     storage + logic tests (npm test)
├── index.html, vite.config.js, tailwind.config.js, postcss.config.js
└── package.json
```

## Storage Solution

`localStorage` was chosen because the app must work on Vercel without a backend, and notes only need to persist per browser. It is synchronous, universally supported, and survives refreshes and restarts. Different browsers or devices keep separate notes (no sync, by design).

**Keys:** `noteflow_notes_v1` (notes), `noteflow_theme` (theme), `noteflow_seeded_v1` (demo notes were already created).

**How persistence works**

1. `NotesContext` loads notes once through `storageService.initializeNotes()`.
2. Every create / edit / delete / pin / import / clear builds the next list, updates the UI and writes it through `storageService`.
3. If a write fails (quota, private mode), the UI keeps working and shows a friendly error toast.
4. On reload the same service reads, parses and validates the data.

**Demo data:** seeded only when no notes key exists *and* the seeded flag is missing, so refreshes never recreate them, deleted demo notes never return, and existing notes are never overwritten.

**Recovery:** invalid JSON or a non-array value is backed up to `noteflow_notes_v1_corrupted_backup` and the app starts clean with a notice. Individual malformed notes are skipped; missing optional fields get safe defaults.

## Installation

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build      # outputs dist/
npm run preview    # serve the production build locally
npm test           # run storage + logic tests
```

## Deployment (Vercel)

1. Push the project to GitHub (see below).
2. Go to vercel.com → **Add New… → Project** → import the repository.
3. Vercel detects Vite automatically (Build: `npm run build`, Output: `dist`). No environment variables are needed.
4. Click **Deploy**, then paste the URL into **Live demo** above.

CLI alternative: `npm i -g vercel`, then `vercel --prod`.

## GitHub

```bash
git init
git add .
git commit -m "Build NoteFlow notes application"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Create the empty repository on github.com first and use its URL in place of `YOUR_GITHUB_REPO_URL`.

## How to Test Persistence

1. Create a note titled "Test Note" with content → Save. Refresh: it is still there.
2. Edit it, refresh: the edit remains. Pin it, refresh: still pinned.
3. Delete it (confirm the dialog), refresh: it stays deleted.
4. Create another note, close the browser, reopen the app: the note exists.

## Known Limitations

- Notes live in one browser on one device; clearing site data removes them (use Export for backups).
- `localStorage` holds roughly 5 MB; a clear error appears if it is full.
- Markdown support is basic (no tables/task-lists extensions, no image uploads).
- The service worker caches the app shell; after a deploy, the new version is picked up on the next load.

## Challenges and Solutions

| Challenge | Solution |
|---|---|
| Scalable notes state | `NotesContext` owns data, `useNoteView` owns search/filter/sort UI state, `storageService` owns persistence. |
| Reliable persistence | All writes go through one service that returns `{ ok, error }`; the UI never loses data when a save fails. |
| Corrupted localStorage | Safe parse, array check, per-note sanitising, backup of unreadable data, no crashes. |
| Demo data vs user data | Seed only on a truly first launch, guarded by a flag. |
| Search + filter + sort together | Three pure functions composed in one memoised pipeline (`searchNotes → filterNotes → sortNotes`). |
| Responsive UI | Drawer sidebar, single-column cards on mobile, touch-sized controls, full-screen editor on small screens. |
| Theme without flash | Inline script in `index.html` applies the saved theme before React renders. |
| Safe import | Size limit, JSON validation, per-note sanitising, merge that keeps existing notes. |
| Offline support | `vite-plugin-pwa` precaches the app; no external fonts or CDNs. |

## Evaluation Criteria Mapping

**Functionality** – Full CRUD, confirmation before delete, real-time search over title/content/tags/category, category and tag filters, four sorts, pinning, validation, import/export, clear-all with confirmation. No placeholder buttons.

**UI/UX** – Original design system (tokens in `index.css`), spacious cards with colour accents, greeting dashboard with quiet stats, designed empty states, subtle motion that respects `prefers-reduced-motion`, responsive from 320 px up, accessible dialogs, labelled controls, visible focus rings.

**Code Quality** – Clear separation: components / context / hooks / services / utils / data. Pure, tested logic functions. Reusable `Modal`, `ConfirmDialog`, `EmptyState`. Single source of constants. No unused dependencies.

**Data Persistence** – Centralised, versioned `localStorage` service, validated reads, graceful failure on quota/unavailable storage, corruption recovery with backup, first-launch-only seeding, cross-tab sync.

**Problem-Solving** – See the challenges table; each problem has a specific, tested solution (`npm test` covers persistence, corruption, import and the search/filter/sort pipeline).

**Creativity** – Markdown with safe live preview, PWA/offline, light/dark/system themes, JSON import/export, keyboard shortcuts, tags + colours, unsaved-changes protection.
