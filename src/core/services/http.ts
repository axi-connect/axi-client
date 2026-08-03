import { API_BASE_URL, API_PREFIX } from "@/core/config/env";
import { COMPANY_SUSPENDED_EVENT, isSuspensionCode, parseHttpError } from "@/core/api/problem";

/**
 * Cliente HTTP del proyecto — patrón dual browser/server.
 *
 * Los paths se expresan relativos al prefijo del API (`/users`, `/auth/me`…):
 * - En el browser, toda petición autenticada viaja por el BFF (`/api/proxy<path>`),
 *   que inyecta el `Authorization: Bearer` desde la cookie HttpOnly y antepone
 *   `/api/v1`. El browser jamás ve el token.
 * - En el server (RSC / route handlers) se llama directo a
 *   `${API_BASE_URL}/api/v1<path>` leyendo la cookie con `next/headers`.
 *
 * Autenticación por defecto: `authenticate: false` solo para endpoints
 * públicos (login/refresh). Los errores del backend se lanzan como
 * `HttpError` (RFC 7807); ver `core/api/problem.ts`.
 */
export type HttpRequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Default `true`. Solo los endpoints públicos del backend usan `false`. */
  authenticate?: boolean;
};

export type Params = Record<string, string | number | boolean | undefined>;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  get<T>(path: string, params?: Params, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", path, { params, options });
  }

  post<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", path, { body, options });
  }

  put<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", path, { body, options });
  }

  patch<T>(path: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>("PATCH", path, { body, options });
  }

  delete<T = void>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", path, { options });
  }

  private async request<T>(
    method: Method,
    path: string,
    { params, body, options = {} }: { params?: Params; body?: unknown; options?: HttpRequestOptions },
  ): Promise<T> {
    const authenticate = options.authenticate !== false;
    const url = this.buildUrl(path, authenticate, params);

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
      ...(await this.buildAuthHeader(authenticate, options)),
    };

    const res = await fetch(url, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await parseHttpError(res);
      // F15: la suspensión de la empresa puede llegar en CUALQUIER request.
      // Único choke-point del interceptor: se anuncia al AuthProvider (pantalla
      // bloqueante) y se re-lanza igual para no alterar el manejo local de los
      // callers. Solo browser: en RSC el error fluye y el cliente lo ve al hidratar.
      if (typeof window !== "undefined" && isSuspensionCode(error.code)) {
        // El detail lleva el code: el AuthProvider elige la variante de copy
        // (suspensión genérica vs prueba finalizada)
        window.dispatchEvent(new CustomEvent(COMPANY_SUSPENDED_EVENT, { detail: error.code }));
      }
      throw error;
    }

    // 202 (async aceptado) puede traer body; 204 nunca. Cualquier body vacío → undefined.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private buildUrl(path: string, authenticate: boolean, params?: Params): string {
    const isBrowser = typeof window !== "undefined";
    // En browser lo autenticado va por el BFF; lo público y todo lo server-side va directo.
    const base =
      isBrowser && authenticate ? `${window.location.origin}/api/proxy` : `${this.baseUrl}${API_PREFIX}`;
    const url = new URL(base + path);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async buildAuthHeader(
    authenticate: boolean,
    options: HttpRequestOptions,
  ): Promise<Record<string, string>> {
    if (!authenticate) return {};

    const providedAuth = options.headers?.Authorization || options.headers?.authorization;
    if (providedAuth) return { Authorization: providedAuth };

    // Server-side (RSC / route handlers): la cookie HttpOnly sí es legible aquí.
    if (typeof window === "undefined") {
      try {
        const mod = await import("next/headers");
        const token = (await mod.cookies()).get("accessToken")?.value;
        if (token) return { Authorization: `Bearer ${token}` };
      } catch {
        // Fuera del request scope de Next (tests, scripts) — sin token.
      }
    }
    // Browser: el proxy BFF inyecta el Bearer; aquí no viaja nada.
    return {};
  }
}

export const http = new HttpClient();
