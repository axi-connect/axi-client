import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { refreshSession } from "@/shared/auth/auth.handlers";

/**
 * POST /api/auth/refresh — rota el par de tokens (single-flight en el BFF).
 * Si el backend detecta reuso o el refresh es inválido, la sesión queda
 * limpia y el cliente debe re-loguear.
 */
export async function POST() {
  const result = await refreshSession(await cookies());
  if (result.ok) return NextResponse.json({ success: true });
  return NextResponse.json({ success: false, code: result.code }, { status: result.status });
}
