/**
 * Cliente API dedicado del panel de plataforma (openapi-fetch tipado con el
 * schema generado). NO usa el `HttpClient`/BFF de tenant: llama directo al
 * backend con `Authorization: Bearer` desde la memoria de `token-storage`.
 *
 * Contratos de error: toda respuesta `!ok` se lanza como `HttpError`
 * (RFC 7807, se discrimina por `code` — reutiliza `core/api/problem.ts`).
 * Un 401 fuera del login despacha `platform:session-expired`, que el
 * `PlatformAuthProvider` traduce en el `ReLoginModal` (nunca redirect).
 */
import createClient, { type Middleware } from "openapi-fetch";
import type { ApiPaths } from "@/core/api/types";
import { parseHttpError } from "@/core/api/problem";
import { API_BASE_URL } from "@/core/config/env";
import { PLATFORM_SESSION_EXPIRED_EVENT } from "../../domain/auth";
import { getPlatformToken } from "../auth/token-storage";

/** Path del login de plataforma (único endpoint sin Bearer y sin re-login). */
export const PLATFORM_LOGIN_PATH = "/api/v1/platform/auth/login";

/** Exportado solo para tests unitarios (jsdom no trae fetch/Request). */
export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (new URL(request.url).pathname === PLATFORM_LOGIN_PATH) return request;
    const token = getPlatformToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  async onResponse({ request, response }) {
    if (response.ok) return response;
    const isLogin = new URL(request.url).pathname === PLATFORM_LOGIN_PATH;
    if (response.status === 401 && !isLogin && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PLATFORM_SESSION_EXPIRED_EVENT));
    }
    throw await parseHttpError(response);
  },
};

/**
 * Cliente tipado del panel. Los paths del schema incluyen el prefijo
 * `/api/v1`, por eso el `baseUrl` es solo el origen del backend.
 */
export const platformClient = createClient<ApiPaths>({
  baseUrl: API_BASE_URL,
  // Datos autenticados: nunca cachear (misma política que el HttpClient).
  cache: "no-store",
});

platformClient.use(authMiddleware);
