import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { clearSessionCookies, refreshSession } from "@/shared/auth/auth.handlers";
import type { AuthUser, SessionResponse } from "@/shared/auth/auth.types";

/**
 * GET /api/auth/session — hidratación de sesión del cliente.
 * Llama `GET /auth/me`; si el access expiró intenta UN refresh y reintenta.
 * Devuelve `{ isAuthenticated, user? }` con el MeDto completo
 * (incluye `role` y `permissions[]` para gatear la UI).
 *
 * F15: si la empresa está suspendida (`403 auth/company_suspended`) el código
 * se propaga en `code` SIN intentar el refresh (fallaría con el mismo 403) —
 * el cliente distingue "suspendida" (pantalla bloqueante) de "sin sesión" (login).
 */

function suspendedResponse(store: Awaited<ReturnType<typeof cookies>>) {
  // Las cookies ya no valen (el backend revocó los tokens): se limpian aquí
  // para que el middleware mande futuras navegaciones directo al login.
  clearSessionCookies(store);
  return NextResponse.json<SessionResponse>({
    isAuthenticated: false,
    code: API_ERROR_CODES.companySuspended,
  });
}

export async function GET() {
  const store = await cookies();
  try {
    const user = await http.get<AuthUser>("/auth/me");
    return NextResponse.json<SessionResponse>({ isAuthenticated: true, user });
  } catch (error) {
    if (isHttpError(error) && error.is(API_ERROR_CODES.companySuspended)) {
      return suspendedResponse(store);
    }

    const result = await refreshSession(store);
    if (!result.ok) {
      if (result.code === API_ERROR_CODES.companySuspended) return suspendedResponse(store);
      return NextResponse.json<SessionResponse>({ isAuthenticated: false });
    }

    try {
      const user = await http.get<AuthUser>("/auth/me", undefined, {
        headers: { Authorization: `Bearer ${result.tokens.access_token}` },
      });
      return NextResponse.json<SessionResponse>({ isAuthenticated: true, user });
    } catch (retryError) {
      if (isHttpError(retryError) && retryError.is(API_ERROR_CODES.companySuspended)) {
        return suspendedResponse(store);
      }
      return NextResponse.json<SessionResponse>({ isAuthenticated: false });
    }
  }
}
