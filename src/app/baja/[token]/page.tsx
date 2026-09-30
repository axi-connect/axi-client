import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { noindexMetadata } from "@/core/seo/metadata"
import { clientIpHeaders } from "@/shared/auth/bff-response"
import { confirmUnsubscribe, loadUnsubscribe } from "@/modules/unsubscribe/infrastructure/unsubscribe.loader"
import { UnsubscribeView } from "@/modules/unsubscribe/ui/UnsubscribeView"

/**
 * `/baja/[token]` — la baja en un clic de un correo o SMS en frío (P3a).
 *
 * Pública (en `PUBLIC_PATHS`): la abre el cliente del negocio desde su buzón.
 * La autoriza el token firmado de la ruta; `noindex` y el token nunca va a un
 * metadato. El buzón (Gmail, Yahoo) no pasa por aquí: su baja en un clic va
 * directa al API (`List-Unsubscribe-Post`).
 */
export const metadata: Metadata = {
  ...noindexMetadata("Dejar de recibir mensajes"),
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ listo?: string; error?: string }>
}) {
  const { token } = await params
  const { listo, error } = await searchParams
  const result = await loadUnsubscribe(token, clientIpHeaders(await headers()))

  async function confirm() {
    "use server"
    const outcome = await confirmUnsubscribe(token, clientIpHeaders(await headers()))
    if (outcome.status === "ok") redirect(`/baja/${encodeURIComponent(token)}?listo=1`)
    redirect(`/baja/${encodeURIComponent(token)}?error=1`)
  }

  return <UnsubscribeView result={result} done={listo === "1"} failed={error === "1"} action={confirm} />
}
