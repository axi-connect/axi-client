import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { isHttpError, isSuspensionCode } from "@/core/api/problem";
import { clearSessionCookies, refreshSession } from "@/shared/auth/auth.handlers";
import type { AuthUser, SessionResponse } from "@/shared/auth/auth.types";

/**
 * GET /api/auth/session — hidratación de sesión del cliente.
 * Llama `GET /auth/me`; si el access expiró intenta UN refresh y reintenta.
 * Devuelve `{ isAuthenticated, user? }` con el MeDto completo
 * (incluye `role` y `permissions[]` para gatear la UI).
 *
 * F15: si la empresa está bloqueada (`403 auth/company_suspended` o
 * `auth/trial_expired`) el código se propaga en `code` SIN intentar el
 * refresh (fallaría con el mismo 403) — el cliente distingue la pantalla
 * bloqueante (y su variante de copy) de "sin sesión" (login).
 */

function suspendedResponse(store: Awaited<ReturnType<typeof cookies>>, code: string) {
  // Las cookies ya no valen (el backend revocó los tokens): se limpian aquí
  // para que el middleware mande futuras navegaciones directo al login.
  clearSessionCookies(store);
  return NextResponse.json<SessionResponse>({ isAuthenticated: false, code });
}

export async function GET() {
  const store = await cookies();
  try {
    const user = await http.get<AuthUser>("/auth/me");
    return NextResponse.json<SessionResponse>({ isAuthenticated: true, user });
  } catch (error) {
    if (isHttpError(error) && isSuspensionCode(error.code)) {
      return suspendedResponse(store, error.code);
    }

    const result = await refreshSession(store);
    if (!result.ok) {
      if (isSuspensionCode(result.code)) return suspendedResponse(store, result.code);
      return NextResponse.json<SessionResponse>({ isAuthenticated: false });
    }

    try {
      const user = await http.get<AuthUser>("/auth/me", undefined, {
        headers: { Authorization: `Bearer ${result.tokens.access_token}` },
      });
      return NextResponse.json<SessionResponse>({ isAuthenticated: true, user });
    } catch (retryError) {
      if (isHttpError(retryError) && isSuspensionCode(retryError.code)) {
        return suspendedResponse(store, retryError.code);
      }
      return NextResponse.json<SessionResponse>({ isAuthenticated: false });
    }
  }
}
