# CineGraph - Movie Recommendation Frontend

A React + TypeScript web application that is the user interface for a **movie recommendation backend**
(Spring Boot + Neo4j knowledge graph + Pinecone vector index + Google Gemini). You can ask questions about
movies in plain English, load movie data into the system, and check that every service is healthy.

This README was written by reading the actual source code in this repository. Where something can only be
confirmed by looking at the backend (which is **not** part of this repository), it is clearly marked.

> **Quick start**
> ```bash
> npm install
> npm run dev        # opens on http://localhost:5173
> ```
> The backend must be running on `http://localhost:8080` (or set `VITE_API_BASE_URL`, see section B).

---

## Table of contents

- [A. Project overview](#a-project-overview)
- [B. Installation and setup](#b-installation-and-setup)
- [C. Complete folder structure](#c-complete-folder-structure)
- [D. Page-by-page explanation](#d-page-by-page-explanation)
- [E. Component-to-component flow](#e-component-to-component-flow)
- [F. Function and method-level explanation](#f-function-and-method-level-explanation)
- [G. API integration and request-to-response flow](#g-api-integration-and-request-to-response-flow)
- [H. State management and data flow](#h-state-management-and-data-flow)
- [I. Styling and theme implementation](#i-styling-and-theme-implementation)
- [J. Dependencies](#j-dependencies)
- [K. Error handling and edge cases](#k-error-handling-and-edge-cases)
- [L. Running, building and testing](#l-running-building-and-testing)
- [M. Complete user journeys](#m-complete-user-journeys)
- [N. Technical interview and project explanation](#n-technical-interview-and-project-explanation)

---

## A. Project overview

### Project name and purpose
**CineGraph** is the frontend of a *GraphRAG* movie recommendation system. "GraphRAG" means the answers come
from two places that are combined with a large language model (Gemini):

1. a **graph database (Neo4j)** that stores movies, directors, actors, genres and so on as connected nodes, and
2. a **vector database (Pinecone)** that stores embeddings of movies so that "similar movies" can be found.

This repository contains **only the browser application**. It never talks to Neo4j, Pinecone or Gemini directly.
It sends HTTP requests to the backend's REST API (`/api/v1/...`) and shows what comes back.

### Problem it solves
Without a UI, using the backend means writing `curl` commands, uploading PDFs by hand and reading raw JSON.
This frontend gives a person a simple way to:

- ask questions such as *"Movies directed by Nolan"*, *"Movies like Inception"*, *"Tell me about Inception"*,
- put movie data into the graph and vector index (from a PDF, from the server's JSON file, or typed by hand),
- watch the progress of a long indexing job,
- see how big the graph is, and
- check whether Neo4j, Gemini and Pinecone are reachable.

### Main features

| Feature | Where | Short description |
|---|---|---|
| Ask questions | `/ask` | Four modes: Auto, Factual, Similar, Describe. Shows the answer, the routing reason and (for factual questions) the Cypher query, parameters, plan and result rows. History is kept in the browser. |
| Index movies | `/index` | Three ways: upload a PDF, index the server's `movies.json`, or add movies with a form / raw JSON. A live status panel polls the job. |
| Graph statistics | `/graph` | Total nodes, total relationships, and a bar for every node label. |
| System health | `/health` | One card per backend dependency (Neo4j, Gemini LLM, Gemini embeddings, Pinecone). |
| Dashboard | `/` | Quick question box, three graph numbers and links to the other pages. |
| Light / Dark mode | header button | Black-and-white theme in both modes. The choice is saved in the browser. |

### Technology stack and the real role of each technology

| Technology | Role in this project |
|---|---|
| **React 18** | Builds the UI out of components. |
| **TypeScript (strict)** | Types for API data (`src/api/types.ts`), the Redux store and component props. |
| **Vite 5** | Dev server, production build, and the `/api` proxy used in development. |
| **React Router 6** | Client-side routing (`/`, `/ask`, `/index`, `/graph`, `/health`, `*`). Pages are lazy-loaded. |
| **Redux Toolkit + react-redux** | Shared state: query history, indexing job status, graph stats and health results. Async thunks call the API. |
| **Tailwind CSS 3** | All styling. Colours come from CSS variables so light and dark mode are one switch. |
| **Radix UI primitives** | Accessible building blocks: Tabs, Switch, Progress, Label, Slot (used by `Button asChild`). |
| **class-variance-authority, clsx, tailwind-merge** | Small helpers to build class names and button/badge variants (`cn()` in `src/lib/utils.ts`). |
| **React Hook Form + Zod** | Forms and validation on the Ask page and the manual "Add movies" form. |
| **Sonner** | Toast notifications after indexing actions. |
| **lucide-react** | Icons. |
| **fetch API** | HTTP calls, wrapped in one function (`request()` in `src/api/client.ts`). |

### Frontend-to-backend architecture

```
Browser (this React app)
   |  fetch()  JSON or multipart over HTTP
   v
Spring Boot backend  (default http://localhost:8080, path prefix /api/v1)
   |--> Neo4j   (graph queries, graph writes)
   |--> Pinecone (vector search, vector writes)
   '--> Gemini  (classify question, plan Cypher, write answers, create embeddings)
```

Everything to the right of the browser is described in comments inside the frontend source
(`src/api/endpoints.ts`, `src/api/types.ts`, `src/lib/env.ts`). The frontend itself can only confirm *what it
sends* and *what it expects back*.

---

## B. Installation and setup

### Prerequisites
- **Node.js 18.18 or newer** (`engines` in `package.json`). Node 22 was used to verify this project.
- **npm** (comes with Node).
- The **backend** running somewhere the browser can reach. Without it the pages load but every API call shows
  an error such as *"Cannot reach the API at http://localhost:8080 ..."*.

### Install

```bash
unzip movie-frontend.zip     # or clone the repository
cd <project-folder>
npm install
```

### Environment variables

Only two variables are used. Both are optional. A template is provided in `.env.example`.

| Variable | Read in | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `src/lib/env.ts` | Base URL of the backend. **Not set** -> `http://localhost:8080`. **Set to an empty string** -> the app calls same-origin paths like `/api/v1/query`. A trailing `/` is removed automatically. |
| `VITE_DEV_PROXY_TARGET` | `vite.config.ts` | Used by `npm run dev` / `npm run preview` only. Where Vite forwards `/api/*` requests. Default `http://localhost:8080`. It matters only when `VITE_API_BASE_URL` is empty. |

Create a `.env` file (it is not committed) if you need to change them:

```bash
cp .env.example .env
```

> Vite copies `VITE_*` values into the built JavaScript at **build time**. Changing them later requires a
> new build. **Never put API keys, passwords or tokens in them** - anyone can read them in the browser.

### Configure the backend API base URL

| Situation | What to do |
|---|---|
| Backend on `localhost:8080` | Nothing. This is the default. |
| Backend on another host/port | `VITE_API_BASE_URL=https://api.example.com` |
| Same origin through a reverse proxy | `VITE_API_BASE_URL=` (empty) and proxy `/api/` to the backend. |
| Local dev without CORS setup | `VITE_API_BASE_URL=` (empty) and `VITE_DEV_PROXY_TARGET=http://localhost:8080`; Vite then forwards `/api`. |

The current base URL is displayed at the bottom of the sidebar (and in the mobile menu).

### Start the development server

```bash
npm run dev
```
Opens on **http://localhost:5173** (port set in `vite.config.ts`).

### Production build

```bash
npm run build      # runs "tsc --noEmit" first, then "vite build" -> output in dist/
npm run preview    # serves dist/ locally on http://localhost:4173
```

### Run and test locally
1. Start the backend.
2. `npm run dev`, open http://localhost:5173.
3. Open **System Health** and press *Run checks*. Every card should say *Online*.
4. Open **Ask the Graph** and try *"Movies directed by Nolan"* (needs indexed data).

### Deployment (only what exists in the repository)

| File | What it does |
|---|---|
| `netlify.toml` | Build command `npm run build`, publish folder `dist`, and a catch-all redirect to `/index.html` so deep links such as `/graph` work. |
| `vercel.json` | Rewrites every path except `/assets/...` to `/index.html` (same reason). |
| `Dockerfile` + `nginx.conf` | Multi-stage build: Node 22 builds the app, nginx 1.27 serves `dist/`. nginx falls back to `/index.html`, caches `/assets/` for a year and sets a few security headers. |

Things to know before deploying (found by reading these files, **not executed**):

1. **CORS.** If the frontend and backend have different origins, the backend must allow the frontend's origin.
   The earlier version of this README noted that the backend's `CorsConfig` only allowed `http://localhost:5173`
   and `http://localhost:3000`. That is backend code and could not be re-checked here.
2. **Docker and the API URL.** The Dockerfile declares `ARG VITE_API_BASE_URL` and sets it as an `ENV`. If you build
   without `--build-arg`, the value is empty, which means *same-origin* calls. The `/api/` proxy block in
   `nginx.conf` is commented out, so you either build with
   `docker build --build-arg VITE_API_BASE_URL=https://your-backend .` or uncomment that block and point it at your backend.
3. On Netlify/Vercel, set `VITE_API_BASE_URL` in the project settings **before** the build.

---
## C. Complete folder structure

```
.
├── index.html                    HTML shell + tiny script that applies the saved theme before first paint
├── package.json / package-lock.json
├── vite.config.ts                Vite: React plugin, "@" alias, dev/preview proxy, chunk splitting
├── tailwind.config.ts            Tailwind: maps colour names to CSS variables, fonts, radius
├── postcss.config.js             Runs Tailwind and Autoprefixer
├── tsconfig.json                 TypeScript strict settings and the "@/..." path alias
├── eslint.config.js              ESLint rules (typescript-eslint + react-hooks)
├── components.json               shadcn/ui settings (only used if you add more shadcn components)
├── .env.example                  Names of the environment variables (no secrets)
├── Dockerfile, nginx.conf        Container build and static serving
├── netlify.toml, vercel.json     Hosting configuration (SPA fallback)
├── public/favicon.svg            Browser tab icon
└── src/
    ├── main.tsx                  Entry point
    ├── App.tsx                   Route table
    ├── index.css                 Theme colours (light + dark) and base styles
    ├── api/                      Everything that talks to the backend
    ├── context/                  ThemeContext (light/dark)
    ├── store/                    Redux store and slices
    ├── hooks/                    useIndexStatusPolling
    ├── lib/                      Small helpers (env, format, storage, errors, cn)
    ├── pages/                    One file per route
    ├── features/                 Bigger feature components used by pages (ask, indexing)
    └── components/               Reusable components (layout, common, ui)
```

"Used by" below was produced by scanning the real `import` statements. "(lazy)" means loaded with `React.lazy`.

### C.1 Root files

| File | Responsibility |
|---|---|
| `index.html` | The only HTML page. Contains `<div id="root">`, loads `/src/main.tsx`, links `/favicon.svg`. An inline `<script>` in `<head>` reads `localStorage["cinegraph.theme"]` and adds the `dark` class to `<html>` before the page is painted, which avoids a white flash for dark-mode users. |
| `vite.config.ts` | Loads env with `loadEnv`, defines `@` -> `src`, sets dev port 5173 / preview port 4173, proxies `/api` to `VITE_DEV_PROXY_TARGET`, and splits the build into `react` (react, react-dom, react-router-dom) and `state` (Redux Toolkit, react-redux) chunks. |
| `tailwind.config.ts` | `darkMode: ["class"]`, scans `index.html` and `src/**/*.{ts,tsx}`, defines colour names (`background`, `foreground`, `card`, `muted`, `primary`, `destructive`, `border`, `input`, `ring`) from CSS variables, border radii and system font stacks. |
| `package.json` | Scripts: `dev`, `typecheck`, `lint`, `build`, `preview`. There is **no** `test` script. |
| `Dockerfile`, `nginx.conf` | See section B. |

### C.2 `src/main.tsx` and `src/App.tsx`

| File | Contents | Used by | Why it is needed |
|---|---|---|---|
| `src/main.tsx` | `ThemedToaster` component; creates the React root and wraps the app in `StrictMode` > redux `Provider` > `ThemeProvider` > `BrowserRouter` > `<App />` + toaster. | Loaded by `index.html` | Application entry point. |
| `src/App.tsx` | `App` component with the route table. Six pages are loaded with `lazy()`. All routes sit inside the `AppShell` layout route. A comment explains there is intentionally no login because the backend currently has no authentication. | `main.tsx` | Defines every URL of the app. |

### C.3 `src/api/` - talking to the backend

| File | Contents | Used by | Why |
|---|---|---|---|
| `api/client.ts` | `ApiError` class; `RequestOptions` interface; helpers `buildUrl`, `parseBody`, `extractMessage`; the exported `request<T>()` function (fetch + timeout + error conversion). | `api/endpoints.ts`, `lib/errors.ts` | The single place where `fetch` is called. To add an auth header later, change only this file. |
| `api/endpoints.ts` | `QUERY_PATH` (mode -> URL) and the `api` object: `ask`, `indexPdf`, `indexJson`, `indexStatus`, `indexMovies`, `graphStats`, `health`. | the three Redux slices | One named function per backend endpoint, so no component writes URLs. |
| `api/types.ts` | TypeScript types that mirror the backend DTOs: `QueryResponse`, `IndexStatus`, `IndexState`, `IndexMoviesResult`, `GraphStats`, `ConnectionStatus`, `ServiceStatus`, `ExtractedMovie`, `QueryMode`, `ProblemDetail`. | endpoints, slices, `MoviesForm`, `Ask` | Compile-time safety for API data. |

### C.4 `src/context/` - theme

| File | Contents | Used by | Why |
|---|---|---|---|
| `context/ThemeContext.tsx` | `Theme` type, `THEME_KEY`, `ThemeProvider`, `useTheme`, internal `readInitialTheme`. | `main.tsx`, `components/layout/ThemeToggle.tsx` | The one place that owns the light/dark state, the `dark` class on `<html>` and the saved preference. |

### C.5 `src/store/` - Redux

| File | Contents | Used by | Why |
|---|---|---|---|
| `store/index.ts` | `configureStore` with reducers `query`, `index`, `system`; types `RootState`, `AppDispatch`; a `store.subscribe` that saves query history to `localStorage`. | `main.tsx`, `store/hooks.ts` | Creates the global store. |
| `store/hooks.ts` | `useAppDispatch`, `useAppSelector` (typed versions of the react-redux hooks). | all components that use Redux | Avoids repeating types in every component. |
| `store/slices/querySlice.ts` | `askQuestion` thunk, `clearHistory`, `removeItem`, `HISTORY_KEY`, `QueryHistoryItem`, `loadHistory()`. | `pages/Ask.tsx`, `features/ask/AnswerCard.tsx`, `store/index.ts` | Question history and the state of each question (pending / done / error). |
| `store/slices/indexSlice.ts` | Thunks `fetchIndexStatus`, `startPdfIndexing`, `startJsonIndexing`, `submitMovies`; state `status`, `statusError`, `submitting`, `moviesResult`. | the three indexing forms, `StatusPanel`, `useIndexStatusPolling`, `store/index.ts` | Everything about indexing jobs. |
| `store/slices/systemSlice.ts` | Thunks `fetchHealth`, `fetchGraphStats`; a generic `Remote<T>` shape (`data`, `status`, `error`, `fetchedAt`). | `pages/Home.tsx`, `Graph.tsx`, `Health.tsx`, `store/index.ts` | Graph stats and health results, shared so Home and Graph show the same numbers. |

### C.6 `src/hooks/`, `src/lib/`

| File | Contents | Used by | Why |
|---|---|---|---|
| `hooks/useIndexStatusPolling.ts` | Hook that loads the job status once and then repeats every 2 s while the state is `RUNNING`. | `pages/Index.tsx` | Live progress without a manual refresh button. |
| `lib/env.ts` | `API_BASE_URL`, `API_DISPLAY_URL`, `LIMITS` (`queryMaxLength` 500, `moviesMaxPerRequest` 200, `pdfMaxBytes` 50 MB). | `api/client.ts`, `AppShell`, `Ask`, `Home`, `MoviesForm`, `PdfUploader` | One place for configuration and for limits that the backend also enforces. |
| `lib/errors.ts` | `errorMessage(err)` -> readable string. | the three slices | Turns any thrown value into text for the UI. |
| `lib/format.ts` | `formatNumber`, `formatDateTime`, `formatDuration`, `formatBytes`, `formatRelative`. | `AnswerCard`, `PdfUploader`, `StatusPanel`, `Graph`, `Home` | Consistent number/date/size text. |
| `lib/storage.ts` | `readJson`, `writeJson` - `localStorage` wrappers that never throw. | `store/index.ts`, `querySlice.ts` | Safe browser storage (private mode, quota). |
| `lib/utils.ts` | `cn()` = `twMerge(clsx(...))`. | most UI components | Merge Tailwind classes without conflicts. |

### C.7 `src/pages/` - one file per route

| File | Route | Used by |
|---|---|---|
| `pages/Home.tsx` | `/` | `App.tsx` (lazy) |
| `pages/Ask.tsx` | `/ask` | `App.tsx` (lazy) |
| `pages/Index.tsx` | `/index` | `App.tsx` (lazy) |
| `pages/Graph.tsx` | `/graph` | `App.tsx` (lazy) |
| `pages/Health.tsx` | `/health` | `App.tsx` (lazy) |
| `pages/NotFound.tsx` | any other path (`*`) | `App.tsx` (lazy) |

Details of each page are in section D.

### C.8 `src/features/` - larger pieces used by pages

| File | Contents | Used by |
|---|---|---|
| `features/ask/AnswerCard.tsx` | One card per question: question text, badges, pending skeleton, error with retry, answer, debug panel, delete button. | `pages/Ask.tsx` |
| `features/ask/DebugPanel.tsx` | Collapsible "Query internals" with tabs Cypher / Params / Plan / Rows. | `AnswerCard.tsx` |
| `features/indexing/PdfUploader.tsx` | Drag-and-drop PDF upload with validation. | `pages/Index.tsx` |
| `features/indexing/JsonIndexer.tsx` | Two switches (graph, vectors) and a start button for the server's JSON file. | `pages/Index.tsx` |
| `features/indexing/MoviesForm.tsx` | `MoviesForm` (form tab + raw JSON tab), `RawJsonForm`, Zod schemas, `toExtracted`. | `pages/Index.tsx` |
| `features/indexing/StatusPanel.tsx` | Job state badge, stage list, progress bar, counters, started/finished/elapsed. | `pages/Index.tsx` |

### C.9 `src/components/` - reusable components

| File | Contents | Used by |
|---|---|---|
| `layout/AppShell.tsx` | Page frame: desktop sidebar, top bar with the theme toggle, mobile drawer menu, error boundary, `Suspense` loader, `<Outlet />`. | `App.tsx` |
| `layout/ThemeToggle.tsx` | The Light/Dark button. | `AppShell.tsx` |
| `layout/Logo.tsx` | Black-and-white SVG logo that follows the theme. | `AppShell.tsx` |
| `common/PageHeader.tsx` | Title + description + optional action buttons at the top of a page. | Ask, Graph, Health, Index |
| `common/StatTile.tsx` | A bordered number box (label, value, icon, loading skeleton). | Graph, Home |
| `common/ErrorState.tsx` | Bordered error message with optional Retry button. | `ErrorBoundary`, `AnswerCard`, `StatusPanel`, Graph, Health |
| `common/ErrorBoundary.tsx` | Class component that catches render crashes of a page and offers "Try again". | `AppShell.tsx` |
| `common/PageLoader.tsx` | Spinner shown while a lazy page loads. | `AppShell.tsx` |
| `common/RichText.tsx` | Safe mini-renderer for LLM answers: paragraphs, `-`/`*` and `1.` lists, `**bold**`. Does not use `dangerouslySetInnerHTML`. | `AnswerCard.tsx` |
| `common/CodeBlock.tsx` | Monospace block with a Copy button. | `DebugPanel.tsx` |
| `common/TagInput.tsx` | Type + Enter/comma to add chips; Backspace removes the last chip. | `MoviesForm.tsx` |
| `ui/button.tsx` | `Button` with variants `default`, `outline`, `ghost`, `destructive`, `link` and sizes `default`, `sm`, `lg`, `icon`; supports `asChild`. | almost everywhere |
| `ui/card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` - the basic bordered box. | pages and features |
| `ui/input.tsx`, `ui/textarea.tsx`, `ui/label.tsx` | Form controls. | Home, Ask, MoviesForm, JsonIndexer |
| `ui/badge.tsx` | Small status label; variants `default`, `outline`, `success` (filled), `warning` (dashed), `destructive`. | AnswerCard, StatusPanel, Health |
| `ui/tabs.tsx`, `ui/switch.tsx`, `ui/progress.tsx`, `ui/skeleton.tsx` | Tabs, on/off switch, progress bar, loading placeholder. | Index, MoviesForm, DebugPanel, JsonIndexer, StatusPanel, several pages |

---

## D. Page-by-page explanation

All pages render **inside `AppShell`**, so each has the sidebar (desktop) / drawer (mobile) and the top bar with
the theme toggle around it.

### D.1 Dashboard - `/` - `src/pages/Home.tsx`
- **Child components:** `Input`, `Button`, `StatTile` (x3), `Card`, `Link`.
- **Shows:** a hero box with a question field, three numbers (Nodes, Relationships, Node labels) and four link cards
  (Ask, Indexing, Graph Stats, System Health).
- **API:** `GET /api/v1/graph/stats` through `fetchGraphStats()` on mount.
- **State:** local `q` (text) and `error`; Redux `system.graph`.
- **Interaction:** submitting checks the text (not empty, at most 500 characters). If valid it navigates to
  `/ask?q=<text>`; the question is **not** sent from this page - the Ask page receives it as a starting value.
- **Loading / error / empty:** `StatTile` shows a skeleton while loading the first time; numbers show `-` until data
  exists; if the request failed a red line says *"Could not reach the graph: ..."*.

### D.2 Ask the Graph - `/ask` - `src/pages/Ask.tsx`
- **Child components:** `PageHeader`, `Card`, `Textarea`, `Button`, `AnswerCard` (and inside it `RichText`,
  `DebugPanel`, `Badge`, `ErrorState`, `Skeleton`).
- **Shows:** four mode buttons, a question box with a character counter, five example chips, the Ask button and the
  list of past answers.
- **API:** `POST` to one of four paths chosen by the mode (see section G).
- **State:** local `mode`; React Hook Form state for the text (validated by a Zod schema); Redux `query.items`.
- **Interactions:**
  - Mode buttons (`role="radio"`) choose `auto`, `factual`, `similarity` or `descriptive`.
  - Example chips fill the text box.
  - Submit by button or **Ctrl/Cmd + Enter**.
  - *Clear history* appears when at least one finished item exists; the trash icon removes one item.
  - A starting question can come from `?q=` in the URL (set by the Dashboard).
- **Loading:** the new card appears immediately with a *Thinking* badge and three skeleton lines. The Ask button is
  disabled and shows *Working...* while **any** question is pending.
- **Error:** the card shows an `ErrorState` ("Query failed") with **Retry**, which removes the failed card and sends
  the same question and mode again.
- **Success:** shows the routing reason (if any), the answer through `RichText`, and, only when the backend sent a
  `debug` object, a *Query internals* panel.
- **Empty:** dashed box *"Ask your first question above..."*.
- **Validation messages:** *"Type a question first"* and *"At most 500 characters"*.

### D.3 Indexing - `/index` - `src/pages/Index.tsx`
- **Child components:** `PageHeader`, `Tabs` (PDF / JSON file / Manual), `PdfUploader`, `JsonIndexer`, `MoviesForm`,
  `StatusPanel`.
- **Calls `useIndexStatusPolling(2000)`:** loads the job status once on open and every 2 seconds while the job is
  `RUNNING`.
- **Layout:** the tabs on the left and the status panel on the right (it sits under the tabs on screens narrower
  than the `xl` breakpoint, and is sticky on wide screens).

**PDF tab - `PdfUploader.tsx`**
- Local state: `file`, `error`, `dragging`; Redux: `index.submitting === "pdf"` and whether a job is `RUNNING`.
- Accepts a drop or a file chooser. `validate()` rejects non-`.pdf` names, empty files and files over 50 MB.
- *Upload & start indexing* dispatches `startPdfIndexing(file)`. Success -> toast *"PDF indexing started"* and the
  file is cleared. Failure -> error toast with the message.
- The button is disabled while uploading or while another job is running (a hint text explains why).
- API: `POST /api/v1/index/pdf` (multipart field `file`).

**JSON tab - `JsonIndexer.tsx`**
- Two switches, *Build Neo4j graph* and *Store Pinecone vectors* (both on by default).
- If both are off an alert says *"Enable at least one of graph or vectors."* and the button is disabled.
- API: `POST /api/v1/index/json?graph=<bool>&vectors=<bool>`. The file read on the server is configured **in the
  backend** (the UI text mentions `app.indexing.json-path`; that setting could not be verified here).

**Manual tab - `MoviesForm.tsx`**
- Two sub-tabs: **Form** and **Raw JSON**.
- *Form:* a repeating block per movie (title, year, director, and tag inputs for actors, genres, themes, awards),
  *Add another movie*, *Remove movie*, validated with Zod (title required, 4-digit year 1888-2100, at most 50
  entries per list, 1-200 movies).
- *Raw JSON:* paste an array of movies, or an object `{ "movies": [...] }`. It is parsed with `JSON.parse` and then
  validated with a Zod schema; the first problem is shown as text (for example `0.movie.title: movie.title is required`).
- Success -> toast with the counts, form reset, and a box *"Last request: received N, inserted in graph N, stored in vector store N"*.
- API: `POST /api/v1/index/movies` with body `{ "movies": [...] }`.

**Status panel - `StatusPanel.tsx`**
- State badge (Idle / Running / Done / Failed), a six-step stage list (Parse PDF, Load JSON, Extract entities, Neo4j
  graph, Pinecone vectors, Finished), an extraction progress bar (`batchesDone / batchesTotal`) or an indeterminate
  bar while running without batch totals, four counters, the backend message, and Started / Finished / Elapsed.
- A local one-second timer updates *Elapsed* while the job runs.
- States: loading text, `ErrorState` (*Could not load status*) if the status request failed.
- API: `GET /api/v1/index/status`.

### D.4 Graph Stats - `/graph` - `src/pages/Graph.tsx`
- **Child components:** `PageHeader`, `StatTile` x3, `Card`, `Skeleton`, `ErrorState`, `Button`.
- **API:** `GET /api/v1/graph/stats` on mount and on **Refresh**.
- **State:** Redux `system.graph`.
- **Shows:** Nodes, Relationships, number of labels, and one horizontal bar per label sorted from largest to
  smallest (bar width = count / maximum count, at least 2%).
- **States:** skeletons while first loading; `ErrorState` with Retry on failure; if `nodes === 0` a dashed box
  *"The graph is empty."* with a link to `/index`.

### D.5 System Health - `/health` - `src/pages/Health.tsx`
- **Child components:** `PageHeader`, `ErrorState`, `Card`, `Badge`, `Skeleton`, `Button`.
- **API:** `GET /api/v1/health/connections` on mount and on **Run checks**.
- **Shows:** a banner (*All systems operational* or *Some services are failing*, plus the check time) and one card
  per service in `data.services`. Known keys (`neo4j`, `geminiLlm`, `geminiEmbeddings`, `pinecone`) get a friendly
  name, description and icon; an unknown key still renders with its raw name. The `detail` text from the backend is
  shown in a monospace box.
- **503 handling:** the backend answers HTTP 503 with the same JSON body when something is down, so the client treats
  503 as a normal result (see `acceptStatuses` in section G).
- **Error:** `ErrorState` titled *Health endpoint unreachable*.

### D.6 Not found - `*` - `src/pages/NotFound.tsx`
Shows `404` and a button back to `/`.

---

## E. Component-to-component flow

### E.1 Application start

```
index.html
  inline script: if localStorage["cinegraph.theme"] === "dark" -> <html class="dark">   (before first paint)
  -> /src/main.tsx
       StrictMode
        -> Provider (Redux store from src/store/index.ts)
            -> ThemeProvider (src/context/ThemeContext.tsx)
                -> BrowserRouter
                    -> App (src/App.tsx)   <Routes>
                         -> AppShell (layout route)
                              sidebar / top bar (ThemeToggle) / mobile drawer
                              ErrorBoundary -> Suspense -> <Outlet />
                                   -> one lazy page: Home | Ask | IndexPage | Graph | Health | NotFound
                    -> ThemedToaster (Sonner, follows the theme)
```

### E.2 A typical data request (example: Graph Stats page)

```
Graph.tsx (useEffect on mount)
  -> dispatch(fetchGraphStats())                       store/slices/systemSlice.ts
      pending reducer:   graph.status = "loading"
  -> api.graphStats(signal)                            api/endpoints.ts
  -> request("/api/v1/graph/stats", {...})             api/client.ts   (fetch + timeout)
  -> Backend (GET /api/v1/graph/stats)
  <- JSON { nodes, relationships, nodesByLabel }
      fulfilled reducer: graph = { data, status: "succeeded", fetchedAt }
      (on failure: errorMessage() -> rejectWithValue -> graph.status = "failed", graph.error = text)
  -> useAppSelector((s) => s.system.graph) in Graph.tsx re-renders
  -> StatTile / bars / ErrorState show the new state
```

### E.3 Ask flow (the longest chain)

```
Ask.tsx  (form submit)
  -> handleSubmit(onSubmit)  [Zod validation]
  -> dispatch(askQuestion({ query, mode }))            querySlice.ts
  -> api.ask(mode, query, signal)                      endpoints.ts  (chooses the URL from QUERY_PATH)
  -> request(path, { method:"POST", json:{query} })    client.ts
  -> Backend -> Neo4j / Pinecone / Gemini
  <- QueryResponse { question, type, reasoning, answer, debug }
  -> fulfilled reducer marks the history item "done"
  -> store.subscribe in store/index.ts saves history to localStorage
  -> Ask.tsx maps items -> <AnswerCard> -> <RichText> and <DebugPanel>
```

---

## F. Function and method-level explanation

### F.1 API layer

**`request<T>(path, opts)`** - `src/api/client.ts`
- *Purpose:* the only function that calls `fetch`.
- *Parameters:* `path` (e.g. `"/api/v1/query"`) and `opts`: `method` (`GET` default or `POST`), `json` (object sent as
  JSON), `form` (`FormData` for uploads), `query` (URL parameters), `signal` (an outside `AbortSignal`), `timeoutMs`
  (default 120 000), `acceptStatuses` (error codes whose body should be returned).
- *Returns:* a `Promise<T>` with the parsed JSON body.
- *Steps:* (1) create an `AbortController` and a timer that aborts after `timeoutMs`; (2) link the optional outside
  signal; (3) set the `Accept` header, and `Content-Type: application/json` only for `json` bodies (for `FormData` the
  browser sets the multipart boundary itself); (4) `fetch(buildUrl(...))`; (5) if `fetch` itself throws, throw a
  readable `ApiError` (timeout message, or *"Cannot reach the API at ... CORS ..."*); an abort caused by the caller is
  re-thrown unchanged; (6) `parseBody`; (7) return the body if `res.ok` or the status is in `acceptStatuses`, otherwise
  throw `ApiError(extractMessage(...), status, body)`; (8) in `finally`, clear the timer and listener.
- *Called by:* every method of `api` in `endpoints.ts`.

**`buildUrl(path, query)`** - joins `API_BASE_URL + path` and appends `?a=b` for every defined value in `query`.
**`parseBody(res)`** - reads the response as text; empty -> `null`; tries `JSON.parse`; otherwise returns the raw text.
**`extractMessage(body, res)`** - picks the error text: for 401/403 a fixed "authentication may have been enabled"
message; else the first non-empty string among `detail`, `message`, `title`, `error`; else the text body (first 300
characters); else `Request failed (status statusText).`
**`ApiError`** - an `Error` with `status` and `body` fields.

**`api` object** - `src/api/endpoints.ts`

| Method | Parameters | Returns | Timeout |
|---|---|---|---|
| `ask(mode, query, signal?)` | `QueryMode`, string | `QueryResponse` | 180 s |
| `indexPdf(file)` | `File` (sent as form field `file`) | `IndexStatus` | 300 s |
| `indexJson(graph, vectors)` | two booleans (URL parameters) | `IndexStatus` | 120 s (default) |
| `indexStatus(signal?)` | - | `IndexStatus` | 30 s |
| `indexMovies(movies)` | `ExtractedMovie[]` (sent as `{ movies }`) | `IndexMoviesResult` | 600 s |
| `graphStats(signal?)` | - | `GraphStats` | 30 s |
| `health(signal?)` | - | `ConnectionStatus` (accepts 503; throws if the body has no `services`) | 60 s |

**`errorMessage(err)`** - `src/lib/errors.ts`: `ApiError`/`Error` -> `.message`; string -> itself; anything else ->
*"Something went wrong."* Used in every thunk's `catch`.

**`API_BASE_URL`, `API_DISPLAY_URL`, `LIMITS`** - `src/lib/env.ts`: computed once at load (see section B).

### F.2 Redux thunks

| Thunk (file) | Argument | What it does | Reducer result |
|---|---|---|---|
| `askQuestion` (`querySlice`) | `{ query, mode }` | calls `api.ask` | `pending`: adds a card at the top (max 50 kept); `fulfilled`: status `done` + response; `rejected`: status `error` + message |
| `fetchIndexStatus` (`indexSlice`) | none | calls `api.indexStatus` | stores `status`, or `statusError` (ignored if aborted) |
| `startPdfIndexing` | `File` | calls `api.indexPdf` | `submitting="pdf"` while waiting; then stores the returned status |
| `startJsonIndexing` | `{ graph, vectors }` | calls `api.indexJson` | same pattern with `"json"` |
| `submitMovies` | `ExtractedMovie[]` | calls `api.indexMovies` | `submitting="movies"`; stores `moviesResult` |
| `fetchHealth`, `fetchGraphStats` (`systemSlice`) | none | call `api.health` / `api.graphStats` | `Remote<T>` object: `loading` / `succeeded` / `failed` |

Every thunk wraps the call in `try/catch` and uses `rejectWithValue(errorMessage(err))`, so components get a plain
string from `.unwrap()` or from `state.error`.

**Reducers:** `clearHistory()` keeps only pending items; `removeItem(id)` removes one.
**`loadHistory()`** (`querySlice`) runs once when the slice is created: reads `localStorage["cinegraph.history.v1"]`,
checks it is an array, drops entries without a string `id` or that were `pending`, keeps at most 50.
**`store.subscribe` callback** (`store/index.ts`): when `query.items` changes, saves every non-pending item to
`localStorage` with `response.debug` set to `null` (debug rows can be large).

### F.3 Hook

**`useIndexStatusPolling(intervalMs = 2000)`** - `src/hooks/useIndexStatusPolling.ts`
- Effect 1 (runs once): `dispatch(fetchIndexStatus())`.
- Effect 2 (depends on the job state): if the state is `RUNNING`, starts `setInterval` that dispatches
  `fetchIndexStatus()`; the cleanup clears it. When the job becomes `DONE`/`FAILED` the effect re-runs and no new
  timer is created, so polling stops by itself.
- Called by `pages/Index.tsx`. Returns nothing.

### F.4 Theme

**`readInitialTheme()`** - `ThemeContext.tsx`: returns `"dark"` only if `localStorage["cinegraph.theme"]` is `"dark"`;
otherwise `"light"`; any storage error -> `"light"`.
**`ThemeProvider`** - keeps `theme` in `useState`. A `useEffect` on `theme` toggles the `dark` class on
`document.documentElement`, sets `style.colorScheme` (so scrollbars and form controls match), and writes the value to
`localStorage`. Provides `{ theme, toggleTheme }`.
**`toggleTheme()`** - switches `light` <-> `dark` with `setTheme`.
**`useTheme()`** - returns the context; throws a clear error if used outside `ThemeProvider`.
**`ThemeToggle`** - shows a Moon (when light) or Sun (when dark) icon; `aria-label` says which mode you will switch to.
**`ThemedToaster`** (`main.tsx`) - reads `theme` and passes it to Sonner's `<Toaster theme=...>`.

### F.5 Page and feature functions

| Function (file) | Purpose and steps | Called by | After it runs |
|---|---|---|---|
| `Home.onSubmit` | trims text; empty -> error; longer than 500 -> error; else `navigate("/ask?q=...")` | Home form | Ask page opens with the text prefilled |
| `Ask.onSubmit(values)` | `dispatch(askQuestion({ query, mode }))`, then `reset({ query: "" })` | `handleSubmit` | card appears in `pending` state |
| `Ask.onKeyDown` | Ctrl/Cmd+Enter -> `handleSubmit(onSubmit)()` | textarea | same as submit |
| `PdfUploader.validate(file)` | returns an error string or `null` (extension, empty, size) | `pick` | decides `file` / `error` state |
| `PdfUploader.pick`, `onDrop` | take the first file, validate, store | file input, drop zone | selected-file row appears |
| `PdfUploader.start` | `dispatch(startPdfIndexing(file)).unwrap()`, success toast, clear file | button | status panel starts showing `RUNNING` |
| `JsonIndexer.start` | `dispatch(startJsonIndexing({graph, vectors})).unwrap()` + toast | button | status updates |
| `MoviesForm.toExtracted(m)` | converts form values to the backend shape: `year` string -> number or `null`, empty director -> `null` | form submit | array sent by `send` |
| `RawJsonForm.submit` | `JSON.parse` -> unwrap optional `{movies}` -> Zod `safeParse` -> `onSubmit` | button | error text or request |
| `MoviesForm.send(movies)` | `dispatch(submitMovies(movies)).unwrap()`, toast with counts, reset form; catch -> error toast | both sub-tabs | `moviesResult` box shows the counts |
| `TagInput.commit(raw)` | split on commas, trim, ignore duplicates (case-insensitive) and respect `maxItems` | Enter, comma, blur | calls `onChange(next)` |
| `RichText` | splits text into lines and builds `<p>`, `<ul>`, `<ol>`; `inline()` turns `**x**` into `<strong>` | `AnswerCard` | formatted answer (all as React elements, no HTML injection) |
| `DebugPanel` helpers | `isRecord`, `cell` (value -> string), `pretty` (JSON.stringify with indent); builds table columns from the union of row keys | `DebugPanel` | tables and code blocks |
| `StatusPanel` calculations | `stageIndex` from `status.stage`; stage is *done* if state is `DONE` or its index is before the current one; `percent = round(done/total*100)`; `elapsed = (finished ?? now) - started` | render | stage chips, bar, timer |
| `AppShell` effects | close the drawer when the route changes and when Escape is pressed | React | mobile menu closes |

### F.6 Small helpers

`formatNumber` (thousand separators), `formatDateTime` (`-` if missing/invalid), `formatDuration` (`1h 2m 3s`),
`formatBytes` (B/KB/MB), `formatRelative` (`just now`, `5m ago`, `3h ago`, or a date) - all in `src/lib/format.ts`.
`readJson`/`writeJson` in `src/lib/storage.ts`. `cn` in `src/lib/utils.ts`.

---
## G. API integration and request-to-response flow

All paths are relative to `API_BASE_URL`. Every request sends `Accept: application/json, application/problem+json`.
There are no authentication headers (the app has no login; see the comment in `src/App.tsx`).

### G.1 Endpoints used by the frontend

| # | Method | Path | Called from (file -> function) | Request | Response type the frontend expects |
|---|---|---|---|---|---|
| 1 | POST | `/api/v1/query` | `endpoints.ts -> api.ask("auto", ...)` via `askQuestion` | JSON `{ "query": "<text>" }` | `QueryResponse` |
| 2 | POST | `/api/v1/query/factual` | `api.ask("factual", ...)` | same | `QueryResponse` |
| 3 | POST | `/api/v1/query/similar` | `api.ask("similarity", ...)` | same | `QueryResponse` |
| 4 | POST | `/api/v1/query/describe` | `api.ask("descriptive", ...)` | same | `QueryResponse` |
| 5 | POST | `/api/v1/index/pdf` | `api.indexPdf` via `startPdfIndexing` | `multipart/form-data`, field `file` | `IndexStatus` |
| 6 | POST | `/api/v1/index/json?graph=<bool>&vectors=<bool>` | `api.indexJson` via `startJsonIndexing` | URL parameters only, no body | `IndexStatus` |
| 7 | GET | `/api/v1/index/status` | `api.indexStatus` via `fetchIndexStatus` | none | `IndexStatus` |
| 8 | POST | `/api/v1/index/movies` | `api.indexMovies` via `submitMovies` | JSON `{ "movies": ExtractedMovie[] }` | `IndexMoviesResult` |
| 9 | GET | `/api/v1/graph/stats` | `api.graphStats` via `fetchGraphStats` | none | `GraphStats` |
| 10 | GET | `/api/v1/health/connections` | `api.health` via `fetchHealth` | none | `ConnectionStatus` (HTTP 200 or 503) |

### G.2 Response shapes (from `src/api/types.ts`)

```ts
QueryResponse    { question: string; type: string; reasoning: string|null; answer: string; debug: Record<string,unknown>|null }
IndexStatus      { state: "IDLE"|"RUNNING"|"DONE"|"FAILED"; stage: string|null; pdfMovieBlocks: number;
                   batchesDone: number; batchesTotal: number; failedBatches: number; extractedMovies: number;
                   message: string|null; startedAt: string|null; finishedAt: string|null }
IndexMoviesResult{ received: number; insertedInGraph: number; storedInVectorStore: number }
GraphStats       { nodes: number; relationships: number; nodesByLabel: Record<string, number> }
ConnectionStatus { allOk: boolean; services: Record<string, { ok: boolean; detail: string|null }> }
ExtractedMovie   { movie: { title: string; year?: number|null }; director?: { name: string }|null;
                   actors?: string[]; genres?: string[]; themes?: string[]; awards?: string[] }
```

`QueryResponse.debug` is read defensively by `DebugPanel`: it looks for `cypher` (string), `params`, `plan`,
`rows` (array of objects) and `rowCount` (number). A comment in `types.ts` says it is only filled for factual queries.

### G.3 How each response is processed

| Endpoint | Processing | UI change |
|---|---|---|
| query | `fulfilled` reducer stores the response in the history item; history is saved to `localStorage` | The card changes from *Thinking* to the answer. `type` (lower-cased) selects the badge (Factual / Similarity / Descriptive); an unknown type shows its raw text. |
| index/pdf, index/json | The returned `IndexStatus` replaces `index.status` | Success toast; status panel shows the new job; polling begins because `state` becomes `RUNNING`. |
| index/status | Replaces `index.status`, clears `statusError` | Stages, progress bar, counters and timer update. |
| index/movies | Stores `moviesResult` | Toast and the *Last request* summary box. |
| graph/stats | Stores `{data, status:"succeeded", fetchedAt}` | Numbers and bars. |
| health/connections | `api.health` accepts status 503 and checks that the body has a `services` key; otherwise throws `ApiError("Unexpected response from the health endpoint.")` | Banner and service cards. |

### G.4 How errors are handled
1. `request()` converts a failed `fetch` into an `ApiError` (timeout or *cannot reach API / CORS* message).
2. A non-2xx status becomes `ApiError(extractMessage(body, res), status, body)`. The message prefers the backend's
   `detail` (Spring `ProblemDetail`), then `message`, `title`, `error`, then plain text, then a generic sentence.
3. 401/403 give a fixed message saying authentication may have been enabled on the server.
4. The thunk catches it, converts it with `errorMessage()`, and rejects with that string.
5. The UI shows it in an `ErrorState` (query, health, graph, status) or in an error toast (indexing actions).

### G.5 Traced user actions

**1. Asking a question**
1. User types *"Movies like Inception"* and presses **Ask** on `/ask`.
2. React Hook Form runs the Zod schema (trim, 1-500 characters). Invalid -> message under the box, nothing is sent.
3. `onSubmit` dispatches `askQuestion({ query, mode })` and clears the box.
4. The `pending` reducer inserts a history item with the thunk's `requestId`; `AnswerCard` renders *Thinking*.
5. The thunk calls `api.ask(mode, query, signal)` -> `request("/api/v1/query" or the mode's path, { method: "POST", json: { query }, timeoutMs: 180000 })`.
6. The backend answers with `QueryResponse` JSON.
7. `fulfilled` finds the item by `requestId`, sets `status = "done"` and `response`.
8. `store.subscribe` saves the history (without `debug`) to `localStorage`.
9. `Ask` re-renders; `AnswerCard` shows routing, answer and (if present) the debug panel.
10. If anything failed in steps 5-6, `rejected` sets `status = "error"` and `AnswerCard` shows *Query failed* with Retry.

**2. Uploading a PDF**
1. User drops `movies.pdf`; `validate()` accepts it; the file row appears.
2. **Upload & start indexing** -> `startPdfIndexing(file)` -> `FormData.append("file", file)` -> `POST /api/v1/index/pdf`.
3. `pending`: `submitting = "pdf"` (button shows *Uploading...*). Response `IndexStatus` -> stored, `submitting = null`.
4. Toast *PDF indexing started*. Because `status.state` is now `RUNNING`, `useIndexStatusPolling` starts requesting
   `GET /api/v1/index/status` every 2 s; `StatusPanel` shows the stage and progress.
5. When the state becomes `DONE` or `FAILED` polling stops and the panel shows the final message and elapsed time.

**3. Checking system health**
`Health` mounts -> `fetchHealth()` -> `GET /api/v1/health/connections` -> 200 or 503 -> `services` map -> one card
per service; any `ok: false` makes the banner red and the card border red with the backend's `detail`.

### G.6 What the frontend confirms and what needs backend verification

| Confirmed by this repository | Needs the backend source or a running backend |
|---|---|
| The paths, methods, bodies, timeouts and headers listed above. | That every path really exists and behaves as described (comments in `endpoints.ts` say they match the backend controllers). |
| The response **shapes the UI expects** (types) and how they are displayed. | That the backend really returns exactly these shapes and that nullable fields are `null` and not missing. |
| The limits used for client-side validation (500 characters, 200 movies, 50 MB). | That the backend enforces the same limits (the comments in `lib/env.ts` say they mirror it). |
| Error messages shown for network errors, timeouts, 401/403 and error bodies. | CORS configuration, authentication, and what `app.indexing.json-path` points to. |

---

## H. State management and data flow

This project uses four kinds of state. Each has a clear job.

| Kind | Where | What it holds |
|---|---|---|
| **Redux Toolkit store** (global) | `src/store/` | `query.items` (history), `index` (`status`, `statusError`, `submitting`, `moviesResult`), `system` (`health`, `graph`). |
| **React Context** | `src/context/ThemeContext.tsx` | The current theme and `toggleTheme`. It is a UI preference, not server data, so it does not need Redux. |
| **Local component state** (`useState`, React Hook Form) | pages / features | Things only one component cares about: selected Ask `mode`, text of the Home field, selected PDF file, drag state, open/closed panels, the one-second `now` timer. |
| **Browser storage and URL** | `localStorage`, `?q=` | `cinegraph.history.v1` (question history), `cinegraph.theme` (theme), and the `q` query parameter that carries a question from Home to Ask. |

### Data flow rules used everywhere
1. A component **reads** with `useAppSelector`.
2. A component **writes** by dispatching an action or thunk with `useAppDispatch`.
3. Thunks call `api.*`; reducers update the store; subscribed components re-render. No component calls `fetch` itself.
4. `.unwrap()` is used in event handlers that need to know success/failure to show a toast.
5. Props only carry data down (for example `AnswerCard item={...}`, `DebugPanel debug={...}`, `StatTile value={...}`).

### Props examples
`Ask` -> `AnswerCard item` -> `DebugPanel debug` and `RichText text`;
`Index` -> `StatusPanel` (no props: reads Redux itself);
`Graph`/`Home` -> `StatTile label value icon loading`.

---

## I. Styling and theme implementation

### I.1 Styling system already used by the project
**Tailwind CSS 3** utility classes in the JSX, with a small shadcn/ui-style set of components in
`src/components/ui/` (Button, Card, Input, Badge, Tabs, Switch, Progress, ...). Colours are **not** written inside the
components; they are Tailwind names (such as `bg-background`, `text-muted-foreground`, `border`) that point to CSS
variables defined in `src/index.css`.

### I.2 The black-and-white design
- **Light mode:** white background, near-black text, light-grey borders, very light-grey surfaces for tiles and code.
- **Dark mode:** near-black background (`#121212`), off-white text, dark-grey surfaces and borders.
- **Primary button / active menu item:** black on white in light mode, white on black in dark mode (`--primary`).
- **Boxes:** every group of content is a `Card` or a bordered `div` with a 1 px border and a small corner radius
  (`--radius: 0.5rem`). No shadows, gradients, blur, glow, background effects or page animations remain.
- **Status without colour:** badges and stage chips use fill and border style instead of green/yellow:
  *filled* = done/online, *dashed border* = in progress, *plain grey* = idle.
- **One exception:** errors use a single muted red (`--destructive`) so that failures are still easy to notice.
  To make the app strictly black-and-white, set `--destructive` to the same grey as `--foreground` in `index.css`.
- **Fonts:** the operating system's default sans-serif and monospace fonts. No web fonts are downloaded.

### I.3 Colour tokens (`src/index.css`)

| Token (Tailwind name) | Light | Dark | Used for |
|---|---|---|---|
| `--background` (`bg-background`) | white | `#121212` | page background |
| `--foreground` | `#171717` | `#f5f5f5` | main text |
| `--card` | white | `#1a1a1a` | sidebar, cards |
| `--muted` | `#f5f5f5` | `#262626` | light surfaces, hover, code |
| `--muted-foreground` | `#616161` | `#a8a8a8` | secondary text |
| `--primary` / `--primary-foreground` | `#171717` / white | `#f5f5f5` / `#121212` | main buttons, active nav, progress bar |
| `--border` | `#d9d9d9` | `#3d3d3d` | card and divider lines |
| `--input` | `#8c8c8c` | `#757575` | form-field borders (darker so they stay visible) |
| `--ring` | `#171717` | `#e6e6e6` | keyboard focus outline |
| `--destructive` | dark red | light red | errors only |

**Contrast (calculated with the WCAG formula from the values above, not measured on screen):**
all normal text pairs are at least 5.7 : 1 in both themes (limit for body text is 4.5 : 1); the secondary grey text
is 6.2 : 1 (light) and 7.9 : 1 (dark) on the page background; error text is 6.9 : 1 (light) and 6.3 : 1 (dark);
form-field borders are 3.4 : 1 (light) and 4.1 : 1 (dark) (limit for UI outlines is 3 : 1). Card and divider borders
are deliberately subtle (about 1.4-1.7 : 1) because they only separate areas; they do not carry information.

### I.4 How Light / Dark switching works
1. `tailwind.config.ts` has `darkMode: ["class"]`, and `index.css` defines the dark values under a `.dark` selector.
   Adding or removing the class `dark` on `<html>` therefore swaps **all** colours at once.
2. `ThemeProvider` (`src/context/ThemeContext.tsx`) owns the theme. Its `useEffect` adds/removes `dark` on
   `document.documentElement`, sets `colorScheme`, and saves the value.
3. `ThemeToggle` (in the top bar, visible on every page and every screen size) calls `toggleTheme()`.
4. Because components only use the colour names, **no component needs theme logic**. Sonner toasts read the theme
   from the context in `ThemedToaster`.

### I.5 Where the theme is stored and how it is restored
- **Stored in:** `localStorage`, key **`cinegraph.theme`**, value `"light"` or `"dark"`.
- **On a fresh visit** (nothing saved): **light** theme.
- **On reload:** two steps. (1) The inline script in `index.html` runs before the first paint and adds `dark` to
  `<html>` if `"dark"` is saved - this prevents a white flash. (2) `ThemeProvider` reads the same key in
  `readInitialTheme()` so React's state matches.
- If `localStorage` is blocked, the theme still toggles for the current visit and falls back to light on the next one.
- The key is written in two places (`index.html` and `THEME_KEY` in `ThemeContext.tsx`); a comment in each file
  reminds you to keep them equal.

### I.6 Responsive behaviour

| Screen | Behaviour |
|---|---|
| Below `lg` (1024 px) | Sidebar hidden. Top bar shows the logo, the theme toggle and a menu button that opens a right-side drawer. The drawer closes on navigation and on Escape. |
| `lg` and up | Fixed 16 rem sidebar; the top bar shows only the theme toggle on the right. |
| Below `sm` (640 px) | Forms and cards become one column; buttons such as *Ask* become full width; the stat tiles stack. |
| `xl` (1280 px) | The Indexing page puts the status panel beside the tabs. |
| Wide content | The debug rows table and code blocks scroll **inside** their own box (`overflow-auto`); tab lists scroll horizontally inside themselves; long text uses `break-words`/`break-all`/`truncate`. `body` also has `overflow-x: hidden` as a safety net. |

---

## J. Dependencies

### Runtime (`dependencies`)

| Package | Purpose here |
|---|---|
| `react`, `react-dom` | UI library. |
| `react-router-dom` | Routes, `NavLink`, `useNavigate`, `useSearchParams`. |
| `@reduxjs/toolkit`, `react-redux` | Store, slices, async thunks, hooks. |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Form state and validation (Ask page, manual movie form); `zod` also validates the raw-JSON box. |
| `@radix-ui/react-tabs`, `-switch`, `-progress`, `-label`, `-slot` | Accessible primitives behind `Tabs`, `Switch`, `Progress`, `Label` and `Button asChild`. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Button/badge variants and the `cn()` helper. |
| `lucide-react` | Icons (including Moon and Sun for the theme button). |
| `sonner` | Toast notifications. |

### Development (`devDependencies`)
`vite`, `@vitejs/plugin-react` (build/dev server), `typescript` and `@types/*`, `tailwindcss`, `postcss`,
`autoprefixer`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`.

### Changes made in this redesign
- **Added:** none. The theme uses plain React Context and icons that were already installed.
- **Removed:** `framer-motion` (it was only used for page/hover/entrance animations, which the plain design does not
  want) and `tailwindcss-animate` (no longer needed). The Google Fonts `<link>` tags were removed from `index.html`.
  `package-lock.json` was regenerated by `npm install`.

---

## K. Error handling and edge cases

| Situation | What happens | Where |
|---|---|---|
| Backend down / wrong URL / CORS blocked | Error text *"Cannot reach the API at ... Make sure the backend is running and that CORS allows this origin (...)."* | `request()` |
| Request too slow | *"The request timed out after N s."* Limits: 180 s ask, 300 s PDF, 600 s movies, 120 s JSON, 60 s health, 30 s status and graph. | `request()` |
| HTTP 401/403 | Message that authentication may have been enabled | `extractMessage` |
| HTTP error with JSON body | The backend's `detail` / `message` / `title` / `error` text | `extractMessage` |
| Health returns 503 | Treated as a result, not an error | `api.health` |
| Health returns something without `services` | `ApiError("Unexpected response from the health endpoint.")` | `api.health` |
| A page crashes while rendering | `ErrorBoundary` shows *This page crashed*, the message and **Try again** (it resets on route change) | `AppShell` |
| Empty question / more than 500 characters | Message under the field; nothing sent | Ask, Home |
| Not a PDF / empty file / over 50 MB | Message under the drop zone | `PdfUploader.validate` |
| Both JSON switches off | Alert and disabled button | `JsonIndexer` |
| Manual form: no title, bad year, too many items | Field messages | `MoviesForm` (Zod) |
| Raw JSON invalid / wrong shape | *"That is not valid JSON."* or the first Zod message | `RawJsonForm` |
| A job is already running | Start buttons are disabled with an explanation | PDF and JSON tabs |
| Empty graph | *"The graph is empty."* with link to Indexing | `Graph` |
| No history yet | Dashed *Ask your first question* box | `Ask` |
| Unknown URL | 404 page | `NotFound` |
| Corrupt saved history | `loadHistory()` ignores anything that is not a valid array of items | `querySlice` |
| `localStorage` unavailable | Wrappers swallow the error; history/theme just do not persist | `storage.ts`, `ThemeContext` |
| Browser has no clipboard permission | Copy button silently does nothing | `CodeBlock` |

### Known limitations (honest list)
1. **No automated tests** are part of the project (`package.json` has no `test` script).
2. **Not checked against a real backend.** API behaviour was checked only against a mocked `fetch` (section L).
3. **Not checked in a real browser.** The sandbox used for this work had no browser, so the appearance of the pages,
   responsive layout and the toggle were not looked at with human eyes. The toggle's logic was tested (section L).
4. **CORS / auth / Docker URL** items in section B depend on your backend and hosting.
5. A question that is still **pending when the page is reloaded is lost** (`loadHistory()` drops `pending` items).
6. Only one question can be pending at a time from the UI (the Ask button is disabled while any is pending).
7. History is stored per browser (max 50 items) and is not synchronised anywhere.
8. The first visit always uses the light theme; the operating-system setting is not consulted (a deliberate
   simplification matching the "light is default" requirement).
9. ESLint reports one **warning** that existed before this redesign: `cfg` in `src/store/slices/indexSlice.ts` is
   only used as a type. It was left alone because it is outside the scope of the UI work.

---

## L. Running, building and testing

### Commands (from `package.json`)

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies. |
| `npm run dev` | Dev server on port 5173. |
| `npm run typecheck` | `tsc --noEmit` (strict TypeScript check). |
| `npm run lint` | `eslint .` |
| `npm run build` | `tsc --noEmit && vite build` -> `dist/`. |
| `npm run preview` | Serves `dist/` on port 4173. |
| *(tests)* | None are defined. |

### Real results of the checks run on this version (Node 22.22.2, npm 10.9.7)

| Check | Result |
|---|---|
| `npm install` | Succeeded. |
| `npx tsc --noEmit` | **0 errors.** |
| `npx eslint .` | **0 errors, 1 warning** (the old `cfg` warning in `indexSlice.ts`). |
| `npm run build` | **Succeeded.** 1681 modules transformed, about 5.6 s; `dist/` is about 540 KB (CSS about 20 KB, 4.9 KB gzipped). |
| Dev server (`vite`) | Started; `/`, `/favicon.svg` and `/src/main.tsx` answered **HTTP 200**; the served `index.html` contains the theme init script. |
| Preview server (`vite preview`) | Started; `/health` answered **HTTP 200** (single-page-app fallback works). |
| Before the redesign (same commands, original code) | typecheck 0 errors, lint the same 1 warning, build succeeded. |

### Extra verification (temporary tests, not included in the project)
Using temporary dev tools (`vitest`, `jsdom`, `@testing-library/react`, installed with `--no-save` and removed afterwards):

- **Theme (6 tests, all passed):** starts light when nothing is saved; clicking the toggle adds/removes `dark` on
  `<html>` and writes `cinegraph.theme`; after unmount + remount (a "reload") the saved dark theme is restored; the
  page body and all five navigation links still render; the pre-paint script in `index.html` adds `dark` when `"dark"`
  is saved and does nothing when `"light"` is saved.
- **Pages with a mocked `fetch` (8 tests, all passed):** Home loads graph stats; Graph shows counts and one bar per
  label; Health handles the 503 body and shows an error when the network fails; Index loads the job status; Ask sends
  `POST /api/v1/query` with `{ "query": "Movies by Nolan" }` and shows the answer and *Query internals*; Ask refuses an
  empty question without sending anything; the 404 page renders.

### Could **not** be verified
A real backend (all calls were mocked), CORS, a real browser rendering at desktop/tablet/phone sizes, the Docker
image build, and Netlify/Vercel deployment.

---

## M. Complete user journeys

**1. First visit and a question**
Open `/` -> `AppShell` + `Home` render -> `fetchGraphStats` fills the three numbers -> type a question -> `Home.onSubmit`
-> `/ask?q=...` -> `Ask` prefills the box -> press Ask -> `askQuestion` -> `api.ask` -> `request` -> `POST /api/v1/query`
-> response -> `AnswerCard` with `RichText` (+ `DebugPanel` for factual answers).

**2. Choosing a mode**
Pick *Factual* / *Similar* / *Describe* -> `askQuestion` uses `/api/v1/query/factual`, `/query/similar` or
`/query/describe`; the card says *forced: <mode>* instead of *auto-routed*.

**3. Putting data in the system**
`/index` -> choose a tab:
- *PDF:* `PdfUploader` -> `startPdfIndexing` -> `POST /api/v1/index/pdf` -> polling -> `StatusPanel`.
- *JSON file:* `JsonIndexer` -> `startJsonIndexing` -> `POST /api/v1/index/json` -> polling -> `StatusPanel`.
- *Manual:* `MoviesForm` -> `submitMovies` -> `POST /api/v1/index/movies` -> toast + result box (synchronous, no polling).

**4. Checking the result**
`/graph` -> `fetchGraphStats` -> bars per label. If anything looks wrong, `/health` -> `fetchHealth` -> per-service cards.

**5. Switching theme**
Click the Moon/Sun button in the top bar -> `toggleTheme` -> `ThemeProvider` effect -> `dark` class on `<html>` +
`localStorage` -> all colours change; reload the page and the same theme is applied before first paint.

**6. Coming back later**
Open `/ask` -> Redux starts with `loadHistory()` (from `localStorage`) -> earlier answers are visible (without their
debug rows) -> trash icon or *Clear history* removes them.

---

## N. Technical interview and project explanation

### 30-second introduction
"CineGraph is the React and TypeScript frontend for a GraphRAG movie recommendation system. The backend, built with
Spring Boot, uses Neo4j for graph questions, Pinecone for similarity search and Gemini for language understanding.
My frontend lets a user ask questions in four modes, index movies from a PDF, a JSON file or a form with live job
progress, view graph statistics, and check the health of every dependency. It has a black-and-white UI with a
persistent light and dark theme."

### Architecture in one minute
Single-page app. `main.tsx` mounts providers (Redux, Theme, Router). `App.tsx` defines lazy-loaded routes inside an
`AppShell` layout. Pages dispatch Redux Toolkit thunks. Thunks call a small `api` object, which calls one `request()`
function wrapping `fetch`. Reducers store results, components read them with typed selectors. Nothing outside
`src/api` knows a URL.

### Important technical decisions and why
| Decision | Reason |
|---|---|
| One `request()` wrapper | Timeouts, error messages, headers and a future auth token live in one place. |
| Per-endpoint timeouts | LLM answers and indexing take far longer than a health check. |
| Redux thunks with `rejectWithValue(string)` | Components receive plain text errors and need no `try/catch` of their own except for toasts. |
| Types mirror the backend DTOs | Compile-time safety when reading responses. |
| Zod limits match backend limits (500 / 200 / 50 MB) | Reject bad input before a slow request. |
| Background indexing + polling hook | A PDF job takes long; the backend returns a status and the UI polls every 2 s only while `RUNNING`. |
| `acceptStatuses: [503]` for health | The backend sends its report with 503 when a service is down; the UI should display it, not treat it as a crash. |
| `RichText` instead of `dangerouslySetInnerHTML` | LLM output is untrusted text; rendering it as React elements avoids HTML injection. |
| History saved without `debug` rows | Keeps `localStorage` small. |
| Lazy routes | Each page's code downloads only when visited. |
| Theme in Context, not Redux | It is a pure UI preference with a tiny API (`theme`, `toggleTheme`). |
| CSS-variable colours + Tailwind `dark` class | One class switch recolours the whole app; components stay free of theme code. |

### How the theme toggle works (say this in the interview)
"Colours are CSS variables defined twice in `index.css`: once for light, once under a `.dark` selector. Tailwind maps
names like `bg-background` to those variables. A `ThemeProvider` holds the theme in state; when it changes, an effect
toggles the `dark` class on the `<html>` element and saves the value in `localStorage`. To avoid a white flash, a
small inline script in `index.html` applies the saved class before React loads. The button is in the top bar and just
calls `toggleTheme()`."

### Main request/response flows to be ready to draw
1. Ask: form -> Zod -> `askQuestion` -> `api.ask` -> `request` -> backend -> reducer -> `AnswerCard`.
2. PDF index: file -> `validate` -> `startPdfIndexing` -> multipart POST -> status `RUNNING` -> polling -> `StatusPanel`.
3. Health: `fetchHealth` -> GET (200 or 503) -> `services` map -> cards.

### Challenges visible in the code and how they were solved
- **Slow, multi-stage jobs:** background job + polling hook that stops itself when the job is no longer `RUNNING`.
- **Misleading network errors:** a clear message that names the API URL and the CORS origin.
- **Double submissions:** buttons are disabled while a request or job is active.
- **Untrusted LLM text:** custom safe renderer.
- **Inspecting what the AI did:** a *Query internals* panel with Cypher, parameters, plan and rows, so a factual
  answer can be checked against the real query.

### Questions you may be asked
- *Why Redux when this is small?* Several pages share the same server data (graph stats on Home and Graph; indexing
  status on one page but triggered from three components), and thunks give consistent loading and error states.
  Local `useState` is still used for purely local UI.
- *How would you add login?* Wrap `AppShell` in a route guard in `App.tsx` and add the token header in `request()`;
  the code already shows a clear message for 401/403.
- *How would you test it?* Component tests with Testing Library and a mocked `fetch` (like the temporary checks in
  section L), plus an end-to-end test against a running backend.
- *What would you improve?* Respect the OS colour-scheme on first visit, add automated tests, add retry/cancel for
  long requests, and let the history survive a page reload while a question is pending.
