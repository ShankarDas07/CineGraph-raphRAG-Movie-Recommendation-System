# CineGraph - GraphRAG Movie Recommendation System

A full-stack movie intelligence platform. Ask questions about movies in natural language - directors,
actors, genres, themes, awards, "movies like X" - and get answers built from a **Neo4j knowledge graph**
and a **Pinecone vector index**, orchestrated by **Google Gemini**.

```
┌──────────────────────┐   HTTP/JSON    ┌──────────────────────────────────────────┐
│  frontend/           │ ─────────────► │  backend/  (Spring Boot, port 8080)      │
│  React + TypeScript  │ ◄───────────── │  /api/v1/query | index | graph | health  │
│  (Vite, port 5173)   │                └───────┬───────────────┬───────────┬──────┘
└──────────────────────┘                        │               │           │
                                           Neo4j (graph)   Pinecone     Gemini
                                           factual queries (vectors)   (LLM + embeddings)
```

## Table of contents
1. [Repository layout](#repository-layout)
2. [How it works](#how-it-works)
3. [Tech stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Quick start](#quick-start)
6. [Backend](#backend)
7. [Frontend](#frontend)
8. [API reference](#api-reference)
9. [Data model](#data-model)
10. [Deployment](#deployment)
11. [Security notes](#security-notes)
12. [Verification status](#verification-status)
13. [Troubleshooting](#troubleshooting)

---

## Repository layout

```
.
├── .gitignore            # single ignore file for backend + frontend
├── README.md             # this file
├── backend/              # Spring Boot 4 / Java 25 service
│   ├── pom.xml
│   ├── .env.example      # copy to .env and fill in your keys
│   └── src/main/
│       ├── java/com/shankar/movierec/
│       │   ├── controller/   # REST endpoints (Query, Index, Graph, Health)
│       │   ├── service/      # classification, planning, Cypher, Pinecone, indexing pipeline
│       │   ├── dto/          # request / response / internal records
│       │   ├── config/       # Security, CORS, AI configuration
│       │   ├── exception/    # global ProblemDetail error handling
│       │   └── entity/       # ExtractedMovie record
│       └── resources/application.yml
└── frontend/             # React 18 + TypeScript SPA
    ├── package.json
    ├── .env.example
    └── src/
        ├── api/          # typed fetch client + endpoint functions + DTO types
        ├── store/        # Redux Toolkit slices (query, index, system)
        ├── features/     # ask/ and indexing/ feature components
        ├── pages/        # Home, Ask, Index, Graph, Health, NotFound
        └── components/   # ui/ (shadcn-style), common/, layout/
```

## How it works

**Indexing pipeline** (turn raw movie data into searchable knowledge):

1. **Input** - a movies PDF, a JSON file on the server, or structured movie JSON sent directly.
2. **Extraction** - for PDFs, Apache PDFBox splits the text into movie blocks and Gemini extracts
   structured entities (title, year, director, actors, genres, themes, awards) in parallel batches.
3. **Graph build** - entities are written to Neo4j with `MERGE` (no duplicates).
4. **Vector build** - each movie is embedded (Gemini `gemini-embedding-001`, 3072 dimensions) and stored in Pinecone.
5. PDF/JSON jobs run in the background; the UI polls `GET /api/v1/index/status`.

**Query pipeline** (answer a question):

1. **Classify** - Gemini labels the question as `factual`, `similarity` or `descriptive`
   (falls back to `factual` if classification fails).
2. **Route**
   - *factual* (lists, counts, relationships) → Gemini builds a JSON query plan → a Cypher template service
     turns it into safe Cypher → Neo4j runs it → Gemini phrases the answer. The Cypher, params, plan and rows
     are returned in `debug`.
   - *similarity* ("movies like Inception") → Pinecone returns the top 50 candidates, Gemini picks the best 10.
   - *descriptive* ("tell me about X") → Pinecone retrieval + Gemini summary.
3. You can also force a route using the dedicated endpoints.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 25, Spring Boot 4.1.1, Spring MVC, Spring Validation, Spring Actuator, Spring Security (open API, see [Security notes](#security-notes)) |
| AI | Spring AI 2.0.1 - Google GenAI chat (`gemini-2.5-flash`) and embeddings (`gemini-embedding-001`, 3072-dim) |
| Data | Neo4j (Spring Data Neo4j / Java driver), Pinecone vector store, Apache PDFBox 3.0.5 |
| Frontend | React 18, TypeScript (strict), Vite, React Router 6, Redux Toolkit, Tailwind CSS 3, shadcn/ui-style components (Radix), Framer Motion, React Hook Form + Zod, Sonner |

## Prerequisites

- **JDK 25** and **Maven 3.9+** (backend)
- **Node.js 18.18+** (20 or 22 recommended) and npm (frontend)
- A **Neo4j** database (AuraDB free tier works) - URI, username, password
- A **Pinecone** index with **dimension 3072** (must match the embedding model) - API key and index name
- A **Google Gemini API key**

## Quick start

```bash
# 1) Backend
cd backend
cp .env.example .env          # fill in all values (see table below)
mvn spring-boot:run           # http://localhost:8080

# 2) Frontend (new terminal)
cd frontend
npm install
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:8080
npm run dev                   # http://localhost:5173
```

Then open http://localhost:5173, check **System Health** (all four services should be green), go to
**Indexing** to load movies, and start asking questions on **Ask the Graph**.

> Run the backend **from the `backend/` folder** - `application.yml` loads `.env` from the working directory.

## Backend

### Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (used for chat and embeddings) |
| `NEO4J_URI` | e.g. `neo4j+s://xxxx.databases.neo4j.io` |
| `NEO4J_USERNAME` | usually `neo4j` |
| `NEO4J_PASSWORD` | your Neo4j password |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_NAME` | Pinecone index (dimension **3072**) |
| `PINECONE_NAMESPACE` | optional namespace, e.g. `movies` |

### Useful configuration (`application.yml`)

| Key | Default | Meaning |
|---|---|---|
| `server.port` | `8080` | HTTP port |
| `spring.servlet.multipart.max-file-size` | `50MB` | PDF upload limit |
| `app.indexing.batch-size` | `20` | movie blocks per Gemini call |
| `app.indexing.concurrency` | `4` | parallel Gemini calls |
| `app.indexing.max-retries` | `3` | retries per failed batch |
| `app.indexing.json-path` | `classpath:data/movies.json` | file used by `POST /index/json` (or `file:/abs/path.json`) |
| `app.similarity.candidates` / `top` | `50` / `10` | Pinecone topK / final picks |

### Dataset for JSON indexing
`POST /api/v1/index/json` reads `backend/src/main/resources/data/movies.json` (not included in this repo).
Create it as an array (or `{ "movies": [...] }`) of objects shaped like:

```json
{
  "movie": { "title": "Inception", "year": 2010 },
  "director": { "name": "Christopher Nolan" },
  "actors": ["Leonardo DiCaprio"],
  "genres": ["Sci-Fi", "Thriller"],
  "themes": ["dreams"],
  "awards": ["Oscar"]
}
```

### Build a JAR
```bash
cd backend && mvn clean package && java -jar target/movie-rec-0.0.1-SNAPSHOT.jar
```

## Frontend

### Environment variables (`frontend/.env`)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | backend base URL, no trailing slash; **empty** = same-origin `/api/...` |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:8080` | used by `dev`/`preview` to proxy `/api` when the base URL is empty |

`VITE_*` values are inlined at **build time** - never put secrets in them.

### Scripts
| Command | Description |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run typecheck` | strict TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | typecheck + production build into `dist/` |
| `npm run preview` | serve the production build locally |

### Pages
- **Dashboard** - hero search, live graph counters, feature shortcuts
- **Ask the Graph** - Auto / Factual / Similar / Describe modes, 500-char validation, answer cards, Cypher/params/plan/rows inspector, persistent history
- **Indexing** - PDF drag-and-drop, server JSON indexing, manual movie form (+ raw JSON), live job status with stage tracker and progress
- **Graph Stats** - node/relationship counts and per-label distribution
- **System Health** - Neo4j, Gemini LLM, Gemini embeddings and Pinecone status

## API reference

Base path: `/api/v1`. Errors use Spring `ProblemDetail` JSON (`{ "status", "detail", ... }`).

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/query` | `{ "query": string (1-500) }` | `{ question, type, reasoning, answer, debug }` |
| POST | `/query/factual` | same | forced Neo4j path |
| POST | `/query/similar` | same | forced Pinecone recommendation path |
| POST | `/query/describe` | same | forced Pinecone descriptive path |
| POST | `/index/pdf` | multipart, key `file` (.pdf, ≤ 50 MB) | `202` + `IndexStatus` |
| POST | `/index/json?graph=true&vectors=true` | - | `202` + `IndexStatus` |
| GET | `/index/status` | - | `{ state, stage, pdfMovieBlocks, batchesDone, batchesTotal, failedBatches, extractedMovies, message, startedAt, finishedAt }` |
| POST | `/index/movies` | `{ "movies": ExtractedMovie[] (1-200) }` | `{ received, insertedInGraph, storedInVectorStore }` |
| GET | `/graph/stats` | - | `{ nodes, relationships, nodesByLabel }` |
| GET | `/health/connections` | - | `{ allOk, services: { neo4j, geminiLlm, geminiEmbeddings, pinecone } }` - `503` with the same body if any service fails |

`state` is `IDLE | RUNNING | DONE | FAILED`. Only one indexing job can run at a time.
`query` error codes: `400` validation, `422` LLM/plan/Cypher failure, `500` unexpected.

## Data model

Neo4j labels and relationships created by the indexer:

```
(:Director)-[:DIRECTED]->(:Movie)
(:Actor)-[:ACTED_IN]->(:Movie)
(:Movie)-[:BELONGS_TO]->(:Genre)
(:Movie)-[:EXPLORES]->(:Theme)
(:Movie)-[:WON]->(:Award)
```
Indexes are created on `Movie.title`, `Director.name`, `Actor.name`, `Genre.name`, `Theme.name` and `Award(name, category)`.

## Deployment

- **Backend** - run the Spring Boot JAR on any JVM 25 host or container; provide the env vars above as real environment variables.
  Add your frontend's origin to `CorsConfig` (currently only `http://localhost:5173` and `http://localhost:3000` are allowed).
- **Frontend** - `npm run build` produces a static SPA in `frontend/dist/`. Configs are included for
  **Vercel** (`vercel.json`), **Netlify** (`netlify.toml`, `public/_redirects`) and **Docker + nginx**
  (`Dockerfile`, `nginx.conf`):
  ```bash
  cd frontend
  docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t cinegraph-frontend .
  docker run -p 8081:80 cinegraph-frontend
  ```
  Set `VITE_API_BASE_URL` **before** building. Alternatively build with an empty value and reverse-proxy `/api` to the backend.

## Security notes

- **The API currently has no authentication.** `SecurityConfig` permits all `/api/v1/**` requests (marked as a dev setup in the code),
  and CSRF is disabled for the stateless API. Anyone who can reach the backend can query it and trigger indexing, which
  spends your Gemini/Pinecone quota. Do **not** expose it publicly as-is - put it behind a VPN/reverse-proxy auth, or
  add JWT/OAuth2 first.
- The frontend therefore has no login screen or protected routes. When the backend adds auth, add a route guard in
  `frontend/src/App.tsx` and attach the token in `frontend/src/api/client.ts`.
- Never commit `.env` files - the root `.gitignore` excludes them (only `*.example` files are tracked).

## Verification status

- **Frontend:** written without access to the npm registry, so `npm install`, `tsc` and `vite build` have **not** been run.
  All files were syntax-parsed and internal imports checked, nothing more. Run `npm install && npm run build` and fix any
  reported type nit before deploying.
- **Backend:** provided as uploaded; it was read and documented here but not compiled or run in this environment.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Browser shows "Cannot reach the API" | Backend not running, wrong `VITE_API_BASE_URL`, or CORS - add your origin in `CorsConfig` |
| Health shows Pinecone/embeddings failing with a dimension note | Pinecone index must be created with dimension **3072** |
| `POST /index/json` returns "JSON file not found" | Create `backend/src/main/resources/data/movies.json` (or change `app.indexing.json-path`) |
| "An indexing job is already running" | Wait for the current job to finish (watch the status panel) |
| Backend cannot find keys | Start it from `backend/` so `.env` is picked up, or export the variables in the shell |
| Query returns 422 | Gemini plan/Cypher generation failed - rephrase the question or try a forced mode |
