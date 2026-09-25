import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import { isHttpError } from "@/core/api/problem";
import { setSessionCookies } from "@/shared/auth/auth.handlers";
import type { AuthTokens, LoginPayload } from "@/shared/auth/auth.types";
import { bffProblem, forwardedForHeaders } from "@/shared/auth/bff-response";

/**
 * POST /api/auth/login — autentica contra el backend y persiste la sesión
 * en cookies HttpOnly. Propaga los errores RFC 7807 (`code`) para que la UI
 * distinga credenciales inválidas, `auth/ambiguous_company` (pedir NIT) y
 * rate-limit (429 + Retry-After).
 */
export async function POST(req: NextRequest) {
  let payload: LoginPayload;
  try {
    payload = (await req.json()) as LoginPayload;
  } catch {
    return bffProblem(400, "validation/failed", "Cuerpo de petición inválido");
  }

  try {
    // La IP del visitante: el throttle del login es por IP y, sin ella, el
    // backend vería la del servidor de Next para todo el mundo.
    const tokens = await http.post<AuthTokens>("/auth/login", payload, {
      authenticate: false,
      headers: forwardedForHeaders(req),
    });
    setSessionCookies(await cookies(), tokens);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isHttpError(error)) {
      const headers = new Headers();
      if (error.retryAfterSeconds !== undefined) {
        headers.set("Retry-After", String(error.retryAfterSeconds));
      }
      return bffProblem(error.status, error.code, error.message, { errors: error.validationIssues, headers });
    }
    return bffProblem(503, "client/network", "No fue posible contactar al servidor");
  }
}
