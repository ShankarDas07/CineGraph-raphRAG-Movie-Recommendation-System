import { API_BASE_URL, API_DISPLAY_URL } from "@/lib/env";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST";
  json?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Non-2xx statuses whose body should be returned instead of thrown (e.g. health 503). */
  acceptStatuses?: number[];
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, res: Response): string {
  if (res.status === 401 || res.status === 403) {
    return `The backend rejected the request (HTTP ${res.status}). Authentication may have been enabled on the server.`;
  }
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    for (const key of ["detail", "message", "title", "error"]) {
      const v = b[key];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  if (typeof body === "string" && body.trim()) return body.trim().slice(0, 300);
  return `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""}).`;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onExternalAbort, { once: true });

  const headers: Record<string, string> = { Accept: "application/json, application/problem+json" };
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form; // browser sets the multipart boundary
  } else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  try {
    let res: Response;
    try {
      res = await fetch(buildUrl(path, opts.query), {
        method: opts.method ?? "GET",
        headers,
        body,
        signal: controller.signal,
      });
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      if (timedOut) {
        throw new ApiError(`The request timed out after ${Math.round(timeoutMs / 1000)}s.`, 0);
      }
      throw new ApiError(
        `Cannot reach the API at ${API_DISPLAY_URL}. Make sure the backend is running and that CORS allows this origin (${window.location.origin}).`,
        0,
      );
    }

    const parsed = await parseBody(res);
    if (res.ok || opts.acceptStatuses?.includes(res.status)) return parsed as T;
    throw new ApiError(extractMessage(parsed, res), res.status, parsed);
  } finally {
    window.clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }
}
