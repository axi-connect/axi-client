import { NextResponse, type NextRequest } from "next/server"

import { API_BASE_URL, API_PREFIX } from "@/core/config/env"
import { forwardedForHeaders } from "@/shared/auth/bff-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Las dos citas del kit: la llamada del día 2 y la reunión del día 5. */
const DAYS = ["day2", "day5"] as const
type CallDay = (typeof DAYS)[number]

/** El mismo formato que acepta el kit (`welcome-kit.loader.ts`). */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/

/** Cabeceras de toda respuesta: el enlace lleva el token del kit de un cliente. */
const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
} as const

/**
 * El segmento llega como `day2.ics` (así lo enlazan el correo y el kit,
 * `delivery_links.icsUrl` del servidor) o como `day2` a secas.
 */
function parseCallDay(segment: string): CallDay | null {
  const day = segment.endsWith(".ics") ? segment.slice(0, -4) : segment
  return (DAYS as readonly string[]).includes(day) ? (day as CallDay) : null
}

function gone(): NextResponse {
  return new NextResponse("Este enlace ya no está disponible.", {
    status: 404,
    headers: { ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  })
}

/**
 * `GET /bienvenida/[token]/citas/[day]` (`day2.ics` | `day5.ics`) — el .ics de una cita del kit
 * («Agregar a mi calendario»), reenviado desde
 * `GET /api/v1/public/welcome/:token/calls/:day.ics`.
 *
 * Pública (la cubre el prefijo `/bienvenida` de `PUBLIC_PATHS`): la autoriza el
 * token. Va por Next y no directo al backend para que el enlace viva en el mismo
 * dominio del kit. Reenvía la IP del visitante para que el throttle del backend
 * cuente a cada persona y no al servidor de Next.
 *
 * 400, 404 y 410 del backend salen como 404: el kit vencido y el inexistente no
 * se distinguen, igual que en la página del kit. El token nunca va a los logs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; day: string }> },
): Promise<NextResponse> {
  const { token, day: segment } = await params
  const day = parseCallDay(segment)
  if (!TOKEN_PATTERN.test(token) || day === null) return gone()

  const url = `${API_BASE_URL.replace(/\/$/, "")}${API_PREFIX}/public/welcome/${encodeURIComponent(token)}/calls/${day}.ics`

  let backend: Response
  try {
    backend = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/calendar", ...forwardedForHeaders(req) },
      cache: "no-store",
    })
  } catch {
    return new NextResponse("No pudimos preparar tu cita. Inténtalo en un momento.", {
      status: 502,
      headers: { ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  if ([400, 404, 410].includes(backend.status)) return gone()
  if (!backend.ok) {
    const headers: Record<string, string> = { ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8" }
    const retryAfter = backend.headers.get("retry-after")
    if (retryAfter) headers["Retry-After"] = retryAfter
    console.warn("[welcome-kit] .ics no disponible", backend.status)
    return new NextResponse("No pudimos preparar tu cita. Inténtalo en un momento.", {
      status: backend.status === 429 ? 429 : 502,
      headers,
    })
  }

  const body = await backend.arrayBuffer()
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
      "Content-Disposition":
        backend.headers.get("content-disposition") ?? `attachment; filename="axi-${day === "day2" ? "dia-2" : "dia-5"}.ics"`,
    },
  })
}
