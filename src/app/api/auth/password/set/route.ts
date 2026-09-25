import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import { setSessionCookies } from "@/shared/auth/auth.handlers";
import type { AuthTokens } from "@/shared/auth/auth.types";
import { readSupportToken } from "@/shared/auth/support-session";
import {
  forwardedForHeaders,
  invalidBodyResponse,
  problemResponse,
  readJsonBody,
} from "@/shared/auth/bff-response";

/**
 * POST /api/auth/password/set — consume el enlace (invitación o
 * restablecimiento) y fija la contraseña. El backend responde la sesión nueva
 * (`AuthTokensDto`, QA-6): se escriben las cookies y la página entra directo al
 * panel, sin volver al login. Responde `{ session }` y nunca los tokens.
 *
 * Con una sesión de soporte abierta en el navegador (`supportAccessToken`) no
 * se escribe nada: la pestaña de soporte manda y mezclarla con la del dueño
 * pondría sus acciones a nombre de otro. El dueño entra por el login.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody<{ token?: unknown; new_password?: unknown }>(req);
  if (!body || typeof body.token !== "string" || typeof body.new_password !== "string") {
    return invalidBodyResponse();
  }

  try {
    const tokens = await http.post<AuthTokens | undefined>(
      "/auth/password/set",
      { token: body.token, new_password: body.new_password },
      { authenticate: false, headers: forwardedForHeaders(req) },
    );
    const store = await cookies();
    // Un servidor viejo responde 204: sin sesión, el dueño entra por el login.
    if (!tokens?.access_token || !tokens.refresh_token || readSupportToken(store)) {
      return NextResponse.json({ session: false });
    }
    setSessionCookies(store, tokens);
    return NextResponse.json({ session: true });
  } catch (error) {
    return problemResponse(error);
  }
}
