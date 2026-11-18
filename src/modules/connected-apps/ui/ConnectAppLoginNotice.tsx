"use client"

import { Plug } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"

/**
 * El estado «sin sesión» de la pantalla de consentimiento (mockup F5): el
 * middleware manda al login con `next=/oauth/consent?…`, y aquí se dice para
 * qué se inicia sesión. El nombre de la app no se muestra: sin sesión no se
 * consulta nada de la solicitud.
 */
export function ConnectAppLoginNotice() {
  const next = useSearchParams().get("next") ?? ""
  if (!next.startsWith("/oauth/consent")) return null
  return (
    <Alert variant="info" className="mx-auto max-w-md rounded-2xl">
      <Plug />
      <AlertDescription className="text-foreground text-[13px] leading-relaxed">
        <b className="font-medium">Inicia sesión para conectar una app a tu cuenta de Axi.</b> Usa tu usuario de
        siempre; después verás qué pide antes de aprobar nada y la app sigue sola.
      </AlertDescription>
    </Alert>
  )
}
