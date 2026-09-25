import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { isHttpError } from "@/core/api/problem";

/**
 * Piezas comunes de los route handlers del BFF de auth que reenvían un error
 * del backend al navegador.
 */

/** Lee el JSON del cuerpo, o `null` si no es JSON válido. */
export async function readJsonBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function invalidBodyResponse(): NextResponse {
  return NextResponse.json(
    { code: "validation/failed", message: "Cuerpo de petición inválido" },
    { status: 400 },
  );
}

/**
 * Reenvía el error del backend con su problema RFC 7807 COMPLETO (incluida la
 * extensión `details`, p. ej. `details.reason` de un enlace de contraseña que
 * ya no sirve) y su `Retry-After`. Un error que no es HTTP es la red.
 */
export function problemResponse(error: unknown): NextResponse {
  if (isHttpError(error)) {
    const headers = new Headers();
    if (error.retryAfterSeconds !== undefined) {
      headers.set("Retry-After", String(error.retryAfterSeconds));
    }
    const body = error.problem ?? { code: error.code, message: error.message, status: error.status };
    return NextResponse.json(body, { status: error.status, headers });
  }
  return NextResponse.json(
    { code: "client/network", message: "No fue posible contactar al servidor" },
    { status: 503 },
  );
}

/**
 * Cabeceras con la IP del visitante para el backend. Detrás del BFF todas las
 * peticiones salen de la IP del servidor de Next: sin reenviarla, el throttle
 * por IP de los endpoints públicos de contraseña contaría a todo el mundo
 * junto. El backend decide si la cree (su `trust proxy`).
 */
export function forwardedForHeaders(req: NextRequest): Record<string, string> {
  const forwarded = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  return forwarded ? { "X-Forwarded-For": forwarded } : {};
}
