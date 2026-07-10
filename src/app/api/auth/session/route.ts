import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { refreshSession } from "@/shared/auth/auth.handlers";
import type { AuthUser, SessionResponse } from "@/shared/auth/auth.types";

/**
 * GET /api/auth/session — hidratación de sesión del cliente.
 * Llama `GET /auth/me`; si el access expiró intenta UN refresh y reintenta.
 * Devuelve `{ isAuthenticated, user? }` con el MeDto completo
 * (incluye `role` y `permissions[]` para gatear la UI).
 */
export async function GET() {
  try {
    const user = await http.get<AuthUser>("/auth/me");
    return NextResponse.json<SessionResponse>({ isAuthenticated: true, user });
  } catch {
    const result = await refreshSession(await cookies());
    if (!result.ok) return NextResponse.json<SessionResponse>({ isAuthenticated: false });

    try {
      const user = await http.get<AuthUser>("/auth/me", undefined, {
        headers: { Authorization: `Bearer ${result.tokens.access_token}` },
      });
      return NextResponse.json<SessionResponse>({ isAuthenticated: true, user });
    } catch {
      return NextResponse.json<SessionResponse>({ isAuthenticated: false });
    }
  }
}
