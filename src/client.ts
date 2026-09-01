import { findOperation } from "./spec.js";
import type { HttpMethod } from "./types.js";

export interface ElbaClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

export class ElbaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ElbaApiError";
  }
}

export class ElbaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ElbaClientOptions) {
    if (!options.apiKey.trim()) throw new Error("ELBA_API_KEY is empty");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://elba-api.kontur.ru").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T = unknown>({ method, path, query, body }: RequestOptions): Promise<T> {
    if (!path.startsWith("/")) throw new Error("path must start with /");
    if (!findOperation(method, path)) {
      throw new Error(`Operation ${method} ${path} is not present in the bundled Elba OpenAPI schema`);
    }

    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const response = await this.fetchImpl(url, {
      method,
      headers: {
        "X-Kontur-ApiKey": this.apiKey,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const text = await response.text();
    let payload: unknown = text;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        // Keep non-JSON API responses as text.
      }
    } else {
      payload = null;
    }

    if (!response.ok) {
      throw new ElbaApiError(`Elba API returned HTTP ${response.status}`, response.status, payload);
    }
    return payload as T;
  }
}
