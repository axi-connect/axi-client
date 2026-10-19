import { NextResponse, type NextRequest } from "next/server";
import { allowClientError, MAX_BODY_BYTES, sanitizeAsset, sanitizePath, sanitizeText as text, sanitizeKind } from "./client-error-log";

/**
 * `POST /api/client-errors` — telemetría propia de errores del navegador
 * (hotfix «Application error», 2026-10-19; docs/plans/hotfix_application_error_plan.md).
 *
 * Escribe UNA línea JSON por error en la salida del contenedor:
 *
 *   docker logs <contenedor del cliente> 2>&1 | grep '"evt":"client_error"'
 *
 * La llaman el script en línea de recuperación de chunks (`core/lib/chunk-recovery.ts`)
 * y las fronteras de error (`ErrorRecovery`), con `sendBeacon`. Es pública por
 * fuerza (un error puede ocurrir antes de cualquier sesión), así que se defiende
 * sola:
 *  - cuerpo de 4 KB como máximo y cada campo recortado;
 *  - límite por IP en memoria (20/min) y techo de IPs vigiladas;
 *  - sin cookies, sin usuario, y el path saneado: los segmentos con pinta de
 *    token (`/bienvenida/:token`, `/configurar/:token`, `/pay/...`) no llegan al
 *    log. La query y el hash nunca se guardan.
 * Responde 204 siempre que no sea un abuso: el navegador no hace nada con la respuesta.
 *
 * No hace falta registrarla en `PUBLIC_PATHS`: el middleware excluye `/api`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowClientError(ip, Date.now())) return new NextResponse(null, { status: 429 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  console.error(
    JSON.stringify({
      evt: "client_error",
      at: new Date().toISOString(),
      server_build: process.env.BUILD_SHA || "unknown",
      kind: sanitizeKind(body.kind),
      boundary: text(body.boundary, 40),
      name: text(body.name, 80),
      message: text(body.message, 300),
      digest: text(body.digest, 40),
      path: sanitizePath(body.path),
      asset: sanitizeAsset(body.asset),
      // El navegador y el dispositivo: «solo en algunos dispositivos» se responde con esto.
      ua: text(req.headers.get("user-agent"), 200),
    }),
  );
  return new NextResponse(null, { status: 204 });
}
