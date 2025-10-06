import { API_BASE_URL } from "@/config/env";

export type HttpRequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  authenticate?: boolean; // when true, attach Authorization: Bearer <accessToken> from cookies
};

export type Params = Record<string, string | number | boolean | undefined>;

export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async get<T>(path: string, params?: Params, options: HttpRequestOptions = {}): Promise<T> {
    const isBrowser = typeof window !== "undefined";
    const url = isBrowser && options.authenticate
      ? new URL((isBrowser ? "" : this.baseUrl) + "/api/proxy" + path, isBrowser ? window.location.origin : undefined)
      : new URL(this.baseUrl + path);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      });
    }
    const authHeaders = isBrowser && options.authenticate ? {} : await this.buildAuthHeader(options);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}), ...authHeaders },
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async post<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    const isBrowser = typeof window !== "undefined";
    const url = (isBrowser && options.authenticate ? "/api/proxy" + path : this.baseUrl + path);
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const baseHeaders = isFormData ? { ...(options.headers || {}) } : { "Content-Type": "application/json", ...(options.headers || {}) };
    const authHeaders = isBrowser && options.authenticate ? {} : await this.buildAuthHeader(options);
    const headers = { ...baseHeaders, ...authHeaders };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: isFormData ? (body as any) : body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async put<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    const isBrowser = typeof window !== "undefined";
    const url = (isBrowser && options.authenticate ? "/api/proxy" + path : this.baseUrl + path);
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const baseHeaders = isFormData ? { ...(options.headers || {}) } : { "Content-Type": "application/json", ...(options.headers || {}) };
    const authHeaders = isBrowser && options.authenticate ? {} : await this.buildAuthHeader(options);
    const headers = { ...baseHeaders, ...authHeaders };
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: isFormData ? (body as any) : body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }
  
  async delete<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const isBrowser = typeof window !== "undefined";
    const url = (isBrowser && options.authenticate ? "/api/proxy" + path : this.baseUrl + path);
    const authHeaders = isBrowser && options.authenticate ? {} : await this.buildAuthHeader(options);
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(options.headers || {}), ...authHeaders },
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    // Some DELETE endpoints may return 204 No Content
    const text = await res.text();
    return (text ? JSON.parse(text) : ({} as T)) as T;
  }

  private async buildAuthHeader(options: HttpRequestOptions): Promise<Record<string, string>> {
    if (!options.authenticate) return {};
    // If header already provided, respect it
    const providedAuth = options.headers?.Authorization || options.headers?.authorization;
    if (providedAuth) return { Authorization: providedAuth } as Record<string, string>;

    // Try server-side via next/headers
    if (typeof window === "undefined") {
      try {
        const mod = await import("next/headers");
        const token = (await mod.cookies()).get("accessToken")?.value;
        if (token) return { Authorization: `Bearer ${token}` };
      } catch {
        // noop
      }
    }
    return {};
  }
}

export const http = new HttpClient();