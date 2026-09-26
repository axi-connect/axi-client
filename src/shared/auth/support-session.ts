import "server-only";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { COOKIE_NAMES } from "./auth.types";

/**
 * Regla de elección de la cookie en las rutas de TENANT (acceso de soporte,
 * entrega F3). Crítica, y por eso vive en un solo sitio:
 *
 * 1. Si existe `supportAccessToken`, ESE es el Bearer. Manda sobre
 *    `accessToken` aunque haya una sesión de cliente en el mismo navegador:
 *    la sesión de soporte TOMA el navegador mientras dura y la del cliente,
 *    que nunca se toca, vuelve sola al terminar (dueño, 2026-09-26).
 * 2. Con el token de soporte NUNCA se intenta un refresh: la sesión dura lo
 *    que diga el servidor (≤ 60 min) y no tiene refresh token.
 * 3. Un 401 bajo soporte borra `supportAccessToken` (y SOLO esa cookie) y la
 *    pestaña va a `/auth/soporte?fin=1`.
 *
 * `/platform/**` no pasa por aquí: su token vive en `sessionStorage`.
 */

type CookieStore = Pick<ReadonlyRequestCookies, "get" | "set" | "delete">;
type CookieReader = Pick<ReadonlyRequestCookies, "get">;

export type SessionBearer =
  | { kind: "support"; token: string }
  | { kind: "tenant"; token: string | null };

export function readSupportToken(store: CookieReader): string | null {
  return store.get(COOKIE_NAMES.supportAccessToken)?.value || null;
}

/** El Bearer que toca a este request. */
export function sessionBearer(store: CookieReader): SessionBearer {
  const support = readSupportToken(store);
  if (support) return { kind: "support", token: support };
  return { kind: "tenant", token: store.get(COOKIE_NAMES.accessToken)?.value ?? null };
}

/** SOLO la cookie de soporte: nunca escribe ni borra las de la sesión del cliente. */
export function setSupportCookie(store: CookieStore, token: string, expiresInSeconds: number): void {
  store.set(COOKIE_NAMES.supportAccessToken, token, {
    httpOnly: true,
    // Siempre `secure`: Chrome y Firefox la aceptan también en http://localhost.
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSeconds,
  });
}

export function clearSupportCookie(store: CookieStore): void {
  store.delete(COOKIE_NAMES.supportAccessToken);
}
