import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAccessTokenExpiry,
  refreshSession,
} from "@/shared/auth/auth.handlers";
import { COOKIE_NAMES, type WsTokenResponse } from "@/shared/auth/auth.types";

/**
 * GET /api/auth/token — devuelve el access token crudo SOLO para el
 * handshake de WebSocket (Socket.IO no puede leer cookies HttpOnly).
 * Si el token expira en <60s se refresca antes, garantizando un handshake
 * con token fresco. Cualquier otro consumo del token está prohibido.
 */
const MIN_REMAINING_MS = 60_000;

export async function GET() {
  const store = await cookies();
  let token = store.get(COOKIE_NAMES.accessToken)?.value ?? null;
  let expiresAt = token ? getAccessTokenExpiry(token) : null;

  const needsRefresh =
    !token || expiresAt === null || expiresAt - Date.now() <= MIN_REMAINING_MS;

  if (needsRefresh) {
    const result = await refreshSession(store);
    if (!result.ok) {
      return NextResponse.json({ code: result.code }, { status: 401 });
    }
    token = result.tokens.access_token;
    expiresAt = getAccessTokenExpiry(token) ?? Date.now() + result.tokens.expires_in * 1000;
  }

  return NextResponse.json<WsTokenResponse>({
    token: token as string,
    expires_at: expiresAt as number,
  });
}
