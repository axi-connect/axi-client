import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import {
  forwardedForHeaders,
  invalidBodyResponse,
  problemResponse,
  readJsonBody,
} from "@/shared/auth/bff-response";

/**
 * POST /api/auth/password/inspect — ¿el enlace de contraseña sigue vivo?
 * Devuelve `{ purpose, email_masked, expires_at }` o 410
 * `auth/password_token_invalid`. El token viaja en el CUERPO, nunca en la URL:
 * así no queda en logs de acceso ni en el historial.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody<{ token?: unknown }>(req);
  if (!body || typeof body.token !== "string" || !body.token) return invalidBodyResponse();

  try {
    const result = await http.post<unknown>(
      "/auth/password/token/inspect",
      { token: body.token },
      { authenticate: false, headers: forwardedForHeaders(req) },
    );
    return NextResponse.json(result);
  } catch (error) {
    return problemResponse(error);
  }
}
