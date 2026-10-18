/**
 * TypeScript mirrors of the backend DTOs (com.shankar.movierec.dto.* / entity.ExtractedMovie).
 * Jackson serialises null fields, so nullable fields are typed `| null`.
 */

export type QueryType = "factual" | "similarity" | "descriptive";
export type QueryMode = "auto" | QueryType;

/** QueryResponse */
export interface QueryResponse {
  question: string;
  type: string;
  reasoning: string | null;
  answer: string;
  /** Only populated for factual queries: plan, cypher, params, rowCount, rows. */
  debug: Record<string, unknown> | null;
}

/** IndexStatusResponse */
export type IndexState = "IDLE" | "RUNNING" | "DONE" | "FAILED";

export interface IndexStatus {
  state: IndexState;
  stage: string | null;
  pdfMovieBlocks: number;
  batchesDone: number;
  batchesTotal: number;
  failedBatches: number;
  extractedMovies: number;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/** IndexMoviesResponse */
export interface IndexMoviesResult {
  received: number;
  insertedInGraph: number;
  storedInVectorStore: number;
}

/** GraphStatsResponse */
export interface GraphStats {
  nodes: number;
  relationships: number;
  nodesByLabel: Record<string, number>;
}

/** ConnectionStatusResponse */
export interface ServiceStatus {
  ok: boolean;
  detail: string | null;
}

export interface ConnectionStatus {
  allOk: boolean;
  services: Record<string, ServiceStatus>;
}

/** ExtractedMovie - body element of POST /api/v1/index/movies */
export interface ExtractedMovie {
  movie: { title: string; year?: number | null };
  director?: { name: string } | null;
  actors?: string[];
  genres?: string[];
  themes?: string[];
  awards?: string[];
}

/** Spring ProblemDetail (RFC 7807) returned by GlobalExceptionHandler. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}
