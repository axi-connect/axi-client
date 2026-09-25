import { cookies } from "next/headers";
import { bffProblem } from "@/shared/auth/bff-response";
import { NextResponse } from "next/server";
import {
  getAccessTokenExpiry,
  refreshSession,
} from "@/shared/auth/auth.handlers";
import { COOKIE_NAMES, type WsTokenResponse } from "@/shared/auth/auth.types";
import { API_ERROR_CODES } from "@/core/api/problem";
import { clearSupportCookie, readSupportToken } from "@/shared/auth/support-session";

/**
 * GET /api/auth/token — devuelve el access token crudo SOLO para el
 * handshake de WebSocket (Socket.IO no puede leer cookies HttpOnly).
 * Si el token expira en <60s se refresca antes, garantizando un handshake
 * con token fresco. Cualquier otro consumo del token está prohibido.
 */
const MIN_REMAINING_MS = 60_000;

export async function GET() {
  const store = await cookies();

  // Acceso de soporte: su token tal cual, sin refresh. Vencido, la sesión terminó.
  const supportToken = readSupportToken(store);
  if (supportToken) {
    const supportExpiresAt = getAccessTokenExpiry(supportToken);
    if (supportExpiresAt === null || supportExpiresAt <= Date.now()) {
      clearSupportCookie(store);
      return bffProblem(401, API_ERROR_CODES.supportSessionEnded, "La sesión de soporte terminó");
    }
    return NextResponse.json<WsTokenResponse>({ token: supportToken, expires_at: supportExpiresAt });
  }

  let token = store.get(COOKIE_NAMES.accessToken)?.value ?? null;
  let expiresAt = token ? getAccessTokenExpiry(token) : null;

  const needsRefresh =
    !token || expiresAt === null || expiresAt - Date.now() <= MIN_REMAINING_MS;

  if (needsRefresh) {
    const result = await refreshSession(store);
    if (!result.ok) {
      return bffProblem(401, result.code, "Tu sesión expiró. Vuelve a iniciar sesión");
    }
    token = result.tokens.access_token;
    expiresAt = getAccessTokenExpiry(token) ?? Date.now() + result.tokens.expires_in * 1000;
  }

  return NextResponse.json<WsTokenResponse>({
    token: token as string,
    expires_at: expiresAt as number,
  });
}
