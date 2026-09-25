import type { Metadata } from "next"
import { headers } from "next/headers"

import { noindexMetadata } from "@/core/seo/metadata"
import { clientIpHeaders } from "@/shared/auth/bff-response"
import { buildKitView, type KitView } from "@/modules/welcome-kit/domain/kit-view"
import { loadWelcomeKit } from "@/modules/welcome-kit/infrastructure/welcome-kit.loader"
import { KitGoneView } from "@/modules/welcome-kit/ui/KitGoneView"
import { WelcomeKitView } from "@/modules/welcome-kit/ui/WelcomeKitView"

/**
 * `/bienvenida/[token]` — el kit web que llega en el correo de bienvenida.
 *
 * Pública (en `PUBLIC_PATHS`): el dueño la abre sin sesión, desde el móvil,
 * antes incluso de crear su contraseña. La autoriza el token de la ruta.
 * `noindex, nofollow` y el token NUNCA va a un metadato: meterlo en un título o
 * en un `og:url` lo dejaría en el historial de cualquier previsualizador de
 * enlaces. La cabecera `Referrer-Policy: no-referrer` (next.config.ts) evita
 * que salga en el `Referer` al tocar el WhatsApp del asesor o el panel.
 */
export const metadata: Metadata = {
  ...noindexMetadata("Kit de bienvenida"),
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default async function WelcomeKitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // La IP del visitante viaja al backend: su throttle es por IP.
  const result = await loadWelcomeKit(token, clientIpHeaders(await headers()))
  if (result.status !== "ok") {
    return <KitGoneView reason={result.status} reloadHref={`/bienvenida/${encodeURIComponent(token)}`} />
  }

  let view: KitView
  try {
    view = buildKitView(result.data)
  } catch (error) {
    // Un dato mal formado (una fecha imposible) no debe tumbar la página entera.
    console.warn("[welcome-kit] datos del kit inválidos", error instanceof Error ? error.message : error)
    return <KitGoneView reason="unavailable" />
  }
  return <WelcomeKitView view={view} />
}
