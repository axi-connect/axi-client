import "server-only";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { http } from "@/core/services/http";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import {
  COOKIE_NAMES,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  type AuthTokens,
} from "./auth.types";

/**
 * Manejo server-side de la sesión (cookies HttpOnly + rotación de refresh).
 *
 * El backend ROTA el refresh token en cada uso y revoca toda la familia si
 * detecta reuso (`auth/refresh_reuse_detected`). Por eso el refresh es
 * single-flight: dos requests concurrentes del proxy comparten UNA llamada al
 * backend, y una ventana de gracia corta reutiliza el resultado para requests
 * que llegan justo después de la rotación con el token ya viejo.
 */

type CookieStore = Pick<ReadonlyRequestCookies, "get" | "set" | "delete">;

const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
};

export function setSessionCookies(store: CookieStore, tokens: AuthTokens): void {
  store.set(COOKIE_NAMES.accessToken, tokens.access_token, {
    ...baseCookieOptions,
    maxAge: tokens.expires_in,
  });
  store.set(COOKIE_NAMES.refreshToken, tokens.refresh_token, {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(store: CookieStore): void {
  store.delete(COOKIE_NAMES.accessToken);
  store.delete(COOKIE_NAMES.refreshToken);
}

// ---------------------------------------------------------------------------
// Rotación single-flight
// ---------------------------------------------------------------------------

/** Ventana en la que un refresh ya rotado sigue resolviendo con el resultado de su rotación. */
const ROTATION_GRACE_MS = 10_000;

const inflightByToken = new Map<string, Promise<AuthTokens>>();
const recentRotations = new Map<string, { tokens: AuthTokens; at: number }>();

function pruneRecentRotations(now: number): void {
  for (const [key, value] of recentRotations) {
    if (now - value.at > ROTATION_GRACE_MS) recentRotations.delete(key);
  }
}

/**
 * Rota un refresh token contra el backend deduplicando llamadas concurrentes.
 * Lanza `HttpError` (p.ej. `auth/refresh_reuse_detected`) si la sesión ya no vale.
 */
async function rotateRefreshToken(currentRefresh: string): Promise<AuthTokens> {
  const now = Date.now();
  pruneRecentRotations(now);

  const recent = recentRotations.get(currentRefresh);
  if (recent) return recent.tokens;

  const inflight = inflightByToken.get(currentRefresh);
  if (inflight) return inflight;

  const promise = http
    .post<AuthTokens>("/auth/refresh", { refresh_token: currentRefresh }, { authenticate: false })
    .then((tokens) => {
      recentRotations.set(currentRefresh, { tokens, at: Date.now() });
      return tokens;
    })
    .finally(() => {
      inflightByToken.delete(currentRefresh);
    });

  inflightByToken.set(currentRefresh, promise);
  return promise;
}

export type RefreshResult =
  | { ok: true; tokens: AuthTokens }
  | { ok: false; status: number; code: string };

/**
 * Refresca la sesión del request: rota el refresh de la cookie y re-escribe
 * ambas cookies. Ante reuso detectado / refresh inválido limpia la sesión
 * (el cliente debe forzar re-login).
 */
export async function refreshSession(store: CookieStore): Promise<RefreshResult> {
  const currentRefresh = store.get(COOKIE_NAMES.refreshToken)?.value;
  if (!currentRefresh) {
    return { ok: false, status: 401, code: API_ERROR_CODES.invalidRefresh };
  }

  try {
    const tokens = await rotateRefreshToken(currentRefresh);
    setSessionCookies(store, tokens);
    return { ok: true, tokens };
  } catch (error) {
    if (isHttpError(error)) {
      if (
        error.is(API_ERROR_CODES.refreshReuseDetected) ||
        error.is(API_ERROR_CODES.invalidRefresh) ||
        // F15: empresa suspendida — el backend ya revocó toda la familia de
        // refresh; conservar las cookies solo alargaría la agonía.
        error.is(API_ERROR_CODES.companySuspended) ||
        error.status === 401
      ) {
        clearSessionCookies(store);
      }
      return { ok: false, status: error.status, code: error.code };
    }
    return { ok: false, status: 503, code: "client/network" };
  }
}

// ---------------------------------------------------------------------------
// Utilidades JWT (solo lectura de exp; jamás para autorizar)
// ---------------------------------------------------------------------------

/** Epoch (ms) de expiración del access token, o null si no es decodificable. */
export function getAccessTokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}
