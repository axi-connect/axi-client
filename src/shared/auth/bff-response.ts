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

/**
 * Un error PROPIO del BFF, con la misma forma que los del backend (RFC 7807,
 * `application/problem+json`): `parseHttpError` del cliente lee `code` y
 * `detail`. Sin `title`/`detail`, el aviso caía al texto del estado HTTP
 * («Forbidden», QA H2-1). Lleva también `message` para quien lo leía así
 * (el login y el alta).
 */
export function bffProblem(
  status: number,
  code: string,
  detail: string,
  extra: { errors?: unknown; details?: Record<string, unknown>; headers?: HeadersInit } = {},
): NextResponse {
  const headers = new Headers(extra.headers);
  headers.set("Content-Type", "application/problem+json");
  return NextResponse.json(
    {
      type: "about:blank",
      title: detail,
      status,
      code,
      detail,
      message: detail,
      ...(extra.errors !== undefined ? { errors: extra.errors } : {}),
      ...(extra.details !== undefined ? { details: extra.details } : {}),
    },
    { status, headers },
  );
}

export function invalidBodyResponse(): NextResponse {
  return bffProblem(400, "validation/failed", "Cuerpo de petición inválido");
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
  return bffProblem(503, "client/network", "No fue posible contactar al servidor");
}

/**
 * Cabeceras con la IP del visitante para el backend. Detrás del BFF todas las
 * peticiones salen de la IP del servidor de Next: sin reenviarla, el throttle
 * por IP de los endpoints públicos de contraseña contaría a todo el mundo
 * junto. El backend decide si la cree (su `trust proxy`).
 */
export function forwardedForHeaders(req: Pick<NextRequest, "headers">): Record<string, string> {
  return clientIpHeaders(req.headers);
}

/**
 * Lo mismo desde cualquier `Headers` (p. ej. `headers()` de un RSC): reenvía
 * `X-Forwarded-For` y `X-Real-IP` tal como llegaron del proxy de entrada. Si
 * solo hay `x-real-ip`, también sirve de `X-Forwarded-For`.
 */
export function clientIpHeaders(source: Pick<Headers, "get">): Record<string, string> {
  const out: Record<string, string> = {};
  const forwardedFor = source.get("x-forwarded-for");
  const realIp = source.get("x-real-ip");
  if (forwardedFor) out["X-Forwarded-For"] = forwardedFor;
  else if (realIp) out["X-Forwarded-For"] = realIp;
  if (realIp) out["X-Real-IP"] = realIp;
  return out;
}
