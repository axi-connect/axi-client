import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { clearSessionCookies } from "@/shared/auth/auth.handlers";
import { COOKIE_NAMES } from "@/shared/auth/auth.types";
import { clearSupportCookie, readSupportToken } from "@/shared/auth/support-session";

/**
 * POST /api/auth/logout — revoca la sesión en el backend (denylist del jti +
 * revocación de la familia del refresh) y borra las cookies. Best-effort:
 * el logout local nunca falla por un error del backend.
 */
export async function POST() {
  const store = await cookies();

  // Bajo soporte, «Cerrar sesión» cierra la sesión de soporte y nada más.
  const supportToken = readSupportToken(store);
  if (supportToken) {
    try {
      await http.post("/auth/support/end", undefined, { headers: { Authorization: `Bearer ${supportToken}` } });
    } catch {
      // Best-effort: el token de soporte vence solo en el servidor.
    }
    clearSupportCookie(store);
    return NextResponse.json({ success: true });
  }
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
