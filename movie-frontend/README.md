# CineGraph - Movie Recommendation Frontend

A futuristic, fully responsive React frontend for the **movie-rec** Spring Boot backend
(Neo4j knowledge graph + Pinecone vectors + Gemini).

**Stack:** React 18 · TypeScript (strict) · Vite · React Router 6 · Redux Toolkit · Tailwind CSS 3 ·
shadcn/ui-style components (Radix primitives) · Framer Motion · React Hook Form + Zod · Sonner toasts.

> ## Verification status - please read
> This project was written in an environment with **no access to the npm registry**, so
> `npm install`, `tsc` and `vite build` were **never executed**. What *was* checked: every `.ts/.tsx`
> file parses without syntax errors and every internal `@/…` / relative import points at an existing file.
> **Run `npm install && npm run build` first** (see below). If the TypeScript step reports an error,
> it will be a small typing nit - the API layer, store and pages are straightforward.

---

## What the backend actually exposes (read from the uploaded source)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/query` | `{ "query": "..." }` (1-500 chars) → auto-classified answer |
| POST | `/api/v1/query/factual` | force the Neo4j path |
| POST | `/api/v1/query/similar` | force Pinecone recommendations |
| POST | `/api/v1/query/describe` | force Pinecone "tell me about" |
| POST | `/api/v1/index/pdf` | multipart key `file` (.pdf ≤ 50 MB) → 202 + background job |
| POST | `/api/v1/index/json?graph=&vectors=` | index the server's `movies.json` → 202 + background job |
| GET | `/api/v1/index/status` | job status (`IDLE/RUNNING/DONE/FAILED`, stage, batch counters) |
| POST | `/api/v1/index/movies` | `{ "movies": [ExtractedMovie…] }` (≤ 200) → `{received, insertedInGraph, storedInVectorStore}` |
| GET | `/api/v1/graph/stats` | `{nodes, relationships, nodesByLabel}` |
| GET | `/api/v1/health/connections` | Neo4j / Gemini LLM / embeddings / Pinecone (503 + same body when any is down) |

Errors are Spring `ProblemDetail` JSON (`detail` holds the message); the client surfaces it directly.

### Authentication - important
The backend has **no JWT, OAuth2, login or user endpoints**. `SecurityConfig` sets
`/api/v1/**` to `permitAll()` (its comment says JWT is a later step). Following the "no fake auth" rule,
this frontend has **no login screen and no protected routes**. A clear 401/403 message is shown if
the server later starts rejecting requests. When you add JWT to the backend, wrap `<AppShell />` in
`src/App.tsx` with a route guard and attach the token in `src/api/client.ts` (single place).

### CORS - you must configure the backend for deployment
`CorsConfig` only allows `http://localhost:5173` and `http://localhost:3000`. For a deployed frontend,
add its origin to `config.setAllowedOrigins(...)` in the backend, **or** serve the API from the same
origin via a reverse proxy and build with an empty `VITE_API_BASE_URL`.

---

## Features
- **Ask the Graph** - mode selector (Auto / Factual / Similar / Describe), 500-char validation with counter,
  example questions, Ctrl/⌘+Enter, answer cards with routing reasoning, and a *Query internals* panel
  (Cypher, params, plan, result rows) for factual queries. History persists in `localStorage`.
- **Indexing** - PDF drag-and-drop (type/size validated), server JSON indexing with graph/vectors switches,
  manual movie form (field array, tag inputs, validation, ≤ 200 movies) plus raw-JSON mode, and a **live job
  status panel** that polls every 2 s while a job is `RUNNING`.
- **Graph Stats** - node/relationship counts and animated per-label distribution.
- **System Health** - per-service status cards, handles the backend's 503 body correctly.
- Dark neon theme, animated backdrop, mobile drawer navigation, skeleton loaders, error boundary,
  lazy-loaded routes, `prefers-reduced-motion` support, accessible labels/roles.

## Getting started

Requires **Node 18.18+** (Node 20/22 recommended).

```bash
npm install
cp .env.example .env        # set VITE_API_BASE_URL (default http://localhost:8080)
npm run dev                 # http://localhost:5173
```

Start the backend first (`backend/` → `mvn spring-boot:run`, port 8080 with your `.env` keys).

### Scripts
| Command | Description |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run preview` | serve the production build on :4173 |

### Environment variables
| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend base URL, no trailing slash. **Empty string** = same-origin `/api/...` |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:8080` | Used by `dev`/`preview` to proxy `/api` when `VITE_API_BASE_URL` is empty |

Vite inlines `VITE_*` values at **build time** - set them before `npm run build`. Never put secrets in them.

## Deployment
`dist/` is a static SPA; all hosts need a fallback to `index.html`. Configs are included:
- **Vercel** - `vercel.json` · **Netlify** - `netlify.toml` + `public/_redirects`
- **Docker/nginx** -
  `docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t cinegraph .`
  then `docker run -p 8080:80 cinegraph` (an optional same-origin `/api` proxy block is in `nginx.conf`).

## Project structure
```
src/
  api/          client.ts (fetch wrapper, timeouts, ProblemDetail errors) · endpoints.ts · types.ts (DTO mirrors)
  store/        Redux Toolkit store + slices: query (history), index (job status), system (health, graph)
  features/     ask/ (AnswerCard, DebugPanel) · indexing/ (PdfUploader, JsonIndexer, MoviesForm, StatusPanel)
  pages/        Home · Ask · Index · Graph · Health · NotFound   (lazy-loaded)
  components/   ui/ (shadcn-style primitives) · common/ · layout/
  lib/ hooks/   env, formatting, storage, polling hook
```
`components.json` is included so you can add more shadcn/ui components with the CLI.

## Known assumptions
- `POST /index/json` reads `movies.json` from the **server** (`src/main/resources/data/movies.json` in the
  backend); that file was not in the uploaded ZIP, so that call returns the backend's 400 message until it exists.
- LLM-backed endpoints can take several seconds; the client allows up to 3 min per query.
