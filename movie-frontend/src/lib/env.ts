/**
 * Backend base URL. Read once from VITE_API_BASE_URL.
 * - unset      -> http://localhost:8080 (the backend's default port)
 * - empty ""   -> same-origin relative URLs (/api/v1/...), handy behind a reverse proxy
 */
const raw = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL: string = (raw === undefined ? "http://localhost:8080" : raw).trim().replace(/\/+$/, "");

export const API_DISPLAY_URL: string = API_BASE_URL === "" ? window.location.origin : API_BASE_URL;

/** Limits that mirror the backend validation (QueryRequest, IndexMoviesRequest, multipart config). */
export const LIMITS = {
  queryMaxLength: 500,
  moviesMaxPerRequest: 200,
  pdfMaxBytes: 50 * 1024 * 1024,
} as const;
