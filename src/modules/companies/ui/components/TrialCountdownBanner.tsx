"use client"

import Link from "next/link"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useTrialStatus } from "@/modules/companies/infrastructure/hooks/use-trial-status"

/**
 * Banner de los últimos 2 días del trial (patrón SessionBanner de /platform):
 * ámbar, no bloqueante. Tono warning: el rojo de marca nunca significa peligro.
 *
 * El CTA lleva a Facturación y ya no al WhatsApp comercial: desde el registro
 * autoservicio (onboarding_self_service_plan.md, F6) la conversión al terminar
 * la prueba es del propio tenant, no de ventas. Enterprise sigue teniendo a
 * ventas en /contacto.
 *
 * Se renderiza dentro del grupo pegado de `(private)/layout.tsx`, justo bajo
 * el header, así que no necesita `sticky` ni conocer la altura del header: el
 * grupo entero se pega y empuja el contenido (DESIGN-SYSTEM §4.2).
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
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 md:px-6"
    >
      <p className="flex items-center gap-2 text-sm text-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
        {message} Elige cómo continuar para no perder el acceso.
      </p>
      <Button size="sm" variant="outline" asChild>
        <Link href="/billing">Elegir mi plan</Link>
      </Button>
    </div>
  )
}
