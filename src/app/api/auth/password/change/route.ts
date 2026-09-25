import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { refreshSession, setSessionCookies } from "@/shared/auth/auth.handlers";
import {
  forwardedForHeaders,
  invalidBodyResponse,
  problemResponse,
  readJsonBody,
} from "@/shared/auth/bff-response";
import { COOKIE_NAMES, type AuthTokens } from "@/shared/auth/auth.types";

type ChangeBody = { current_password: string; new_password: string };

/**
 * POST /api/auth/password/change — «Cambiar contraseña» del perfil.
 *
 * El backend REEMITE la sesión (`AuthTokensDto`): se reescriben las dos
 * cookies con `setSessionCookies`, o el siguiente request iría con un token
 * que ya no vale.
 *
 * Una contraseña actual equivocada es 422 `auth/current_password_invalid`,
 * no 401, justamente para que este BFF NO borre la sesión: se reenvía tal cual
 * y las cookies no se tocan. Lo mismo un 429 `auth/too_many_attempts`: se
 * reenvía con su `Retry-After` y la sesión sigue. Solo un 401 real (access vencido) pasa por
 * `refreshSession` —el existente, sin cambios— y se reintenta una vez.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody<Partial<ChangeBody>>(req);
  if (!body || typeof body.current_password !== "string" || typeof body.new_password !== "string") {
    return invalidBodyResponse();
  }
  const payload: ChangeBody = { current_password: body.current_password, new_password: body.new_password };

  const store = await cookies();
  if (!store.get(COOKIE_NAMES.accessToken) && !store.get(COOKIE_NAMES.refreshToken)) {
    return NextResponse.json(
      { code: API_ERROR_CODES.unauthorized, message: "Sesión no iniciada" },
      { status: 401 },
    );
  }

  // La IP del visitante: el throttle de intentos del servidor es por IP y
  // cuenta; sin ella, todos los intentos saldrían de la IP de Next.
  const forwarded = forwardedForHeaders(req);
  let tokens: AuthTokens;
  try {
    tokens = await http.post<AuthTokens>("/auth/password/change", payload, { headers: forwarded });
  } catch (error) {
    if (!isHttpError(error) || error.status !== 401) return problemResponse(error);

    const refreshed = await refreshSession(store);
    if (!refreshed.ok) {
      return NextResponse.json({ code: refreshed.code }, { status: refreshed.status });
    }
    try {
      tokens = await http.post<AuthTokens>("/auth/password/change", payload, {
        headers: { ...forwarded, Authorization: `Bearer ${refreshed.tokens.access_token}` },
      });
    } catch (retryError) {
      return problemResponse(retryError);
    }
  }

  setSessionCookies(store, tokens);
  return NextResponse.json({ success: true });
}
