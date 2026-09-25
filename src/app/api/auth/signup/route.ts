import { cookies } from "next/headers";
import { bffProblem } from "@/shared/auth/bff-response";
import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import { isHttpError } from "@/core/api/problem";
import { setSessionCookies } from "@/shared/auth/auth.handlers";
import type { SignupPayload, SignupResponse, SignupResult } from "@/shared/auth/auth.types";

// `SignupResponse` = `Schemas["SignupResultDto"]`. Los tokens se consumen aquí y
// **no** viajan al browser: la sesión queda en cookies HttpOnly, exactamente
// como tras `/api/auth/login`.

/**
 * POST /api/auth/signup — alta autoservicio. Un solo viaje: crea la empresa y
 * su propietario en trial y deja la sesión abierta. Es una ruta propia y no
 * un segundo `POST /api/auth/login` porque el login público está limitado a
 * 5/min por IP y porque así la contraseña viaja una sola vez.
 *
 * Propaga los errores RFC 7807 (`code`) para que `/comenzar` distinga NIT
 * repetido, correo en uso, captcha y rate-limit (429 + Retry-After).
 */
export async function POST(req: NextRequest) {
  let payload: SignupPayload;
  try {
    payload = (await req.json()) as SignupPayload;
  } catch {
    return bffProblem(400, "validation/failed", "Cuerpo de petición inválido");
  }

  try {
    const created = await http.post<SignupResponse>("/public/onboarding/signups", payload, {
      authenticate: false,
    });
    setSessionCookies(await cookies(), created.tokens);
    const result: SignupResult = {
      success: true,
      company_id: created.company_id,
      user_id: created.user_id,
      trial_ends_at: created.trial_ends_at,
    };
    return NextResponse.json(result, { status: 201 });
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
