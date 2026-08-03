"use client"

import { TriangleAlert } from "lucide-react"
import { salesWhatsAppUrl } from "@/core/config/env"
import { Button } from "@/shared/components/ui/button"
import { useTrialStatus } from "@/modules/companies/infrastructure/hooks/use-trial-status"

const CTA_MESSAGE = "Hola, mi prueba de axi connect está por terminar y quiero activar mi plan."

/**
 * Banner sticky de los últimos 2 días del trial (patrón SessionBanner de
 * /platform): ámbar, no bloqueante, con CTA al WhatsApp comercial. Vive en
 * el flujo del contenedor de scroll de `(private)/layout.tsx` — empuja el
 * contenido en vez de solaparlo, así no rompe los calc de 52px del
 * workspace. Tono warning: el rojo de marca nunca significa peligro.
 */
export function TrialCountdownBanner() {
  const { active, daysLeft, ending } = useTrialStatus()
  if (!active || !ending) return null

  const message =
    daysLeft === 0
      ? "Tu prueba gratuita termina hoy."
      : daysLeft === 1
        ? "Tu prueba gratuita termina mañana."
        : `Tu prueba gratuita termina en ${daysLeft} días.`
  const cta = salesWhatsAppUrl(CTA_MESSAGE)

  return (
    <div
      role="alert"
      className="sticky top-[52px] z-30 flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 md:px-6"
    >
      <p className="flex items-center gap-2 text-sm text-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
        {message} Activa tu plan para no perder el acceso.
      </p>
      {cta ? (
        <Button size="sm" variant="outline" asChild>
          <a href={cta} target="_blank" rel="noopener noreferrer">
            Hablar con ventas
          </a>
        </Button>
      ) : null}
    </div>
  )
}
