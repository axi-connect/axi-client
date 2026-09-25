import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import {
  forwardedForHeaders,
  invalidBodyResponse,
  problemResponse,
  readJsonBody,
} from "@/shared/auth/bff-response";

/**
 * POST /api/auth/password/forgot — pide el enlace de restablecimiento.
 * El backend responde 202 SIEMPRE, exista o no el correo (no revela cuentas);
 * aquí tampoco se distingue. Solo un 429 o un cuerpo inválido salen como error.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody<{ email?: unknown }>(req);
  if (!body || typeof body.email !== "string") return invalidBodyResponse();

  try {
    await http.post<void>(
      "/auth/password/forgot",
      { email: body.email },
      { authenticate: false, headers: forwardedForHeaders(req) },
    );
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return problemResponse(error);
  }
}
