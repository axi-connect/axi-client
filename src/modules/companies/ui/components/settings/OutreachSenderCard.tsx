"use client"

import { useEffect, useState } from "react"
import { TriangleAlert } from "lucide-react"

import { FieldList } from "@/shared/components/features/field-list"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { OutreachSenderDTO } from "@/modules/companies/domain/company"
import { getOutreachSender } from "@/modules/companies/infrastructure/services/company-service.adapter"

/**
 * «Tus correos de prospección salen desde…» (P3a, D1 del dueño).
 *
 * Solo lectura: la dirección nace del nombre comercial en el dominio de axi y
 * no se configura. Si la guarda de reputación la pausó (rebotes o quejas), se
 * dice aquí con el motivo.
 */
export function OutreachSenderCard() {
  const [sender, setSender] = useState<OutreachSenderDTO | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getOutreachSender()
      .then(setSender)
      .catch(() => setFailed(true))
  }, [])

  // Sin permiso o sin API aún: la tarjeta no es imprescindible y no estorba.
  if (failed) return null

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6" aria-labelledby="outreach-sender-title">
      <h2 id="outreach-sender-title" className="text-lg font-medium">
        Correo de prospección
      </h2>
      <p className="mb-4 text-sm text-pretty text-muted-foreground">
        Tus correos de prospección salen desde esta dirección, con el nombre de tu negocio. No hay nada que
        configurar, y las respuestas llegan a tu CRM.
      </p>
      {sender === null ? (
        <Skeleton className="h-10 w-full max-w-md" />
      ) : (
        <FieldList
          layout="grid"
          items={[
            // En bloque: la dirección ES el dato; truncada en el móvil no se leía.
            { label: "Sale desde", value: <span className="break-all">{sender.address}</span>, copyable: sender.address, block: true },
            { label: "Nombre visible", value: sender.from_name },
          ]}
        />
      )}
      {sender?.paused === true && (
        <p className="mt-3 flex items-start gap-2 text-sm text-pretty">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            Pausamos tus correos en frío para cuidar la entrega de todos
            {sender.pause_reason === null ? "" : `: ${sender.pause_reason.toLowerCase()}`}. Escríbenos y lo revisamos
            contigo.
          </span>
        </p>
      )}
    </section>
  )
}
