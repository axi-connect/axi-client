import { API_BASE_URL } from "@/config/env";

export type HttpRequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export type Params = Record<string, string | number | boolean | undefined>;

export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async get<T>(path: string, params?: Params, options: HttpRequestOptions = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async post<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    const url = this.baseUrl + path;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async put<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    const url = this.baseUrl + path;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }
  
  async delete<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const url = this.baseUrl + path;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      signal: options.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    // Some DELETE endpoints may return 204 No Content
    const text = await res.text();
    return (text ? JSON.parse(text) : ({} as T)) as T;
  }
}

export const http = new HttpClient();