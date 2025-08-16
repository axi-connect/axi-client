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
}

export const http = new HttpClient();