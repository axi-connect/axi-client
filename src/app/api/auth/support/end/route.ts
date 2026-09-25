import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { clearSupportCookie, readSupportToken } from "@/shared/auth/support-session";

/**
 * POST /api/auth/support/end — «Salir» de la barra de soporte. Cierra la
 * sesión propia en el backend (`/auth/support/end`, su `ssid`) y borra
 * `supportAccessToken`. Best-effort: la cookie se borra aunque el backend no
 * responda (el token vence solo). Sin cookie de soporte no hace nada: la
 * sesión normal de un cliente no se cierra por aquí.
 */
export async function POST() {
  const store = await cookies();
  const token = readSupportToken(store);
  if (!token) return NextResponse.json({ success: true, already_ended: true });

  try {
    await http.post("/auth/support/end", undefined, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    // Vencida o revocada ya: da igual, se borra la cookie.
  }
  clearSupportCookie(store);
  return NextResponse.json({ success: true });
}
