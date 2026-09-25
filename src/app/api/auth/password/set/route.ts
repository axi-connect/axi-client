import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import {
  forwardedForHeaders,
  invalidBodyResponse,
  problemResponse,
  readJsonBody,
} from "@/shared/auth/bff-response";

/**
 * POST /api/auth/password/set — consume el enlace (invitación o
 * restablecimiento) y fija la contraseña. 204 sin sesión: el backend revoca
 * todas las familias de refresh al fijarla, así que el dueño entra por el login.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody<{ token?: unknown; new_password?: unknown }>(req);
  if (!body || typeof body.token !== "string" || typeof body.new_password !== "string") {
    return invalidBodyResponse();
  }

  try {
    await http.post<void>(
      "/auth/password/set",
      { token: body.token, new_password: body.new_password },
      { authenticate: false, headers: forwardedForHeaders(req) },
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return problemResponse(error);
  }
}
