import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import { isHttpError } from "@/core/api/problem";
import { setSessionCookies } from "@/shared/auth/auth.handlers";
import type { AuthTokens, LoginPayload } from "@/shared/auth/auth.types";

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
    return NextResponse.json(
      { code: "validation/failed", message: "Cuerpo de petición inválido" },
      { status: 400 },
    );
  }

  try {
    const tokens = await http.post<AuthTokens>("/auth/login", payload, { authenticate: false });
    setSessionCookies(await cookies(), tokens);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isHttpError(error)) {
      const headers = new Headers();
      if (error.retryAfterSeconds !== undefined) {
        headers.set("Retry-After", String(error.retryAfterSeconds));
      }
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
          errors: error.validationIssues,
        },
        { status: error.status, headers },
      );
    }
    return NextResponse.json(
      { code: "client/network", message: "No fue posible contactar al servidor" },
      { status: 503 },
    );
  }
}
