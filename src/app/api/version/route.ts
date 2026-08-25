import { NextResponse } from "next/server";

/**
 * `GET /api/version` — qué build está en servicio.
 *
 * ⚠️ Existe por un incidente, no por completitud: el 2026-08-20 se descubrió que
 * el contenedor de la API llevaba diez días sin sustituirse mientras cuatro
 * despliegues salían en verde, y el frontend comparte exactamente el mismo punto
 * ciego — su comprobación posterior al deploy solo miraba que la portada
 * devolviera 200, y eso lo cumple igual el contenedor viejo.
 *
 * Con esto el workflow puede exigir que la versión servida sea la que acaba de
 * publicar. El sha corto de un repositorio privado no es un secreto, y poder
 * verificar el despliegue desde fuera vale más.
 *
 * No hace falta registrarla en `PUBLIC_PATHS`: el middleware ya excluye `/api`
 * (§8), así que no la intercepta.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const sha = process.env.BUILD_SHA;
  return NextResponse.json({
    version: sha === undefined || sha === "" ? "unknown" : sha,
  });
}
