import { ApiError, request } from "./client";
import type {
  ConnectionStatus,
  ExtractedMovie,
  GraphStats,
  IndexMoviesResult,
  IndexStatus,
  QueryMode,
  QueryResponse,
} from "./types";

/** Every path below exists in the backend controllers (QueryController, IndexController, GraphController, HealthController). */
const QUERY_PATH: Record<QueryMode, string> = {
  auto: "/api/v1/query",
  factual: "/api/v1/query/factual",
  similarity: "/api/v1/query/similar",
  descriptive: "/api/v1/query/describe",
};

export const api = {
  ask(mode: QueryMode, query: string, signal?: AbortSignal): Promise<QueryResponse> {
    return request<QueryResponse>(QUERY_PATH[mode], { method: "POST", json: { query }, signal, timeoutMs: 180_000 });
  },

  indexPdf(file: File): Promise<IndexStatus> {
    const form = new FormData();
    form.append("file", file); // backend expects multipart key "file"
    return request<IndexStatus>("/api/v1/index/pdf", { method: "POST", form, timeoutMs: 300_000 });
  },

  indexJson(graph: boolean, vectors: boolean): Promise<IndexStatus> {
    return request<IndexStatus>("/api/v1/index/json", { method: "POST", query: { graph, vectors } });
  },

  indexStatus(signal?: AbortSignal): Promise<IndexStatus> {
    return request<IndexStatus>("/api/v1/index/status", { signal, timeoutMs: 30_000 });
  },

  indexMovies(movies: ExtractedMovie[]): Promise<IndexMoviesResult> {
    return request<IndexMoviesResult>("/api/v1/index/movies", {
      method: "POST",
      json: { movies },
      timeoutMs: 600_000,
    });
  },

  graphStats(signal?: AbortSignal): Promise<GraphStats> {
    return request<GraphStats>("/api/v1/graph/stats", { signal, timeoutMs: 30_000 });
  },

  /** Backend answers 503 with the same body when some dependency is down, so 503 is not an error here. */
  async health(signal?: AbortSignal): Promise<ConnectionStatus> {
    const res = await request<ConnectionStatus>("/api/v1/health/connections", {
      signal,
      timeoutMs: 60_000,
      acceptStatuses: [503],
    });
    if (!res || typeof res !== "object" || !("services" in res)) {
      throw new ApiError("Unexpected response from the health endpoint.", 503, res);
    }
    return res;
  },
};
