import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { clearSessionCookies } from "@/shared/auth/auth.handlers";
import { COOKIE_NAMES } from "@/shared/auth/auth.types";

/**
 * POST /api/auth/logout — revoca la sesión en el backend (denylist del jti +
 * revocación de la familia del refresh) y borra las cookies. Best-effort:
 * el logout local nunca falla por un error del backend.
 */
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(COOKIE_NAMES.refreshToken)?.value;

  if (refreshToken) {
    try {
      await http.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // La sesión local se limpia igual; el refresh expira solo en el backend.
    }
  }

  clearSessionCookies(store);
  return NextResponse.json({ success: true });
}
