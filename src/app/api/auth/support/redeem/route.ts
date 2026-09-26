import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_ERROR_CODES } from "@/core/api/problem";
import type { Schemas } from "@/core/api/types";
import { http } from "@/core/services/http";
import {
  bffProblem,
  forwardedForHeaders,
  invalidBodyResponse,
  problemResponse,
  readJsonBody,
} from "@/shared/auth/bff-response";
import { SUPPORT_PLATFORM_TOKEN_HEADER } from "@/shared/auth/auth.types";
import { setSupportCookie } from "@/shared/auth/support-session";

/** A dónde entra la pestaña de soporte: el panel del cliente. */
const PANEL_HOME = "/dashboard";

/**
 * POST /api/auth/support/redeem — canjea el código de traspaso de una sesión
 * de soporte (entrega F3) por el token de soporte.
 *
 * - El token de plataforma llega en `X-Platform-Token` (el BFF no ve el
 *   `sessionStorage` de la consola) y se reenvía igual al backend, que exige
 *   que sea el MISMO admin que emitió el código. Nunca va a un log.
 * - La sesión de soporte TOMA el navegador (decisión del dueño 2026-09-26):
 *   si ya hay una sesión de CLIENTE (accessToken/refreshToken) no se toca ni
 *   se borra. La precedencia de `support-session.ts` hace que cada request
 *   salga con el token de soporte mientras dure —nunca se mezclan en una
 *   misma petición— y al terminar vuelve sola la del cliente. Las demás
 *   pestañas se recargan por el canal `axi-auth` (`auth-channel.ts`).
 * - Si sale bien, escribe SOLO `supportAccessToken` (httpOnly, secure, lax,
 *   maxAge = expires_in). El token no vuelve al navegador.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody<{ code?: unknown }>(req);
  if (!body || typeof body.code !== "string" || body.code.length < 32 || body.code.length > 128) {
    return invalidBodyResponse();
  }
  const platformToken = req.headers.get(SUPPORT_PLATFORM_TOKEN_HEADER);
  if (!platformToken) {
    return bffProblem(401, API_ERROR_CODES.unauthorized, "Abre la sesión de soporte desde la consola de plataforma");
  }

  const store = await cookies();

  try {
    const tokens = await http.post<Schemas["SupportAccessTokensDto"]>(
      "/auth/support/redeem",
      { code: body.code },
      {
        authenticate: false,
        headers: { ...forwardedForHeaders(req), "X-Platform-Token": platformToken },
      },
    );
    setSupportCookie(store, tokens.access_token, tokens.expires_in);
    return NextResponse.json({ success: true, expires_at: tokens.expires_at, redirect: PANEL_HOME });
  } catch (error) {
    return problemResponse(error);
  }
}
