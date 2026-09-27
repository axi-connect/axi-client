"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { spring } from "@/core/styles/motion"
import { Button } from "@/shared/components/ui/button"
import { Island } from "@/shared/components/features/island"
import type { HandoffActionDescriptor } from "./use-handoff-actions"

/**
 * «Atender» cuando hace falta (Inbox premium F2, ajuste de la dueña): una isla
 * compacta en el lugar de siempre del botón, a la derecha de la cabecera. Entra
 * con un spring y un destello violeta corto cuando la conversación queda en cola.
 * La isla grande sobre el hilo estorbaba. El motivo completo sigue en el `title`,
 * en el nombre accesible y como línea del hilo.
 *
 * Lo cuenta el agente, así que lleva cristal con brillo `ai` (DESIGN-SYSTEM §9.5.1).
 * Con `prefers-reduced-motion` aparece sin animación ni destello.
 */
export function ClaimIsland({
  action,
  reason,
  since,
  busy,
}: {
  action: HandoffActionDescriptor
  /** «El cliente pidió hablar con una persona.»; `null` si aún no llegó el evento. */
  reason: string | null
  /** «14 min», ya formateado; `null` sin `queued_at`. */
  since: string | null
  busy: boolean
}) {
  const reduced = useReducedMotion() === true
  const label = reason === null ? "Axi te la pasó" : `Axi te la pasó: ${reason}`

  return (
    <motion.div
      className="relative shrink-0"
      initial={reduced ? false : { opacity: 0, y: -8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : spring.snappy}
    >
      {!reduced && (
        // El destello: un anillo violeta que se abre y se apaga dos veces. Va fuera de
        // la isla porque la isla recorta lo que sale de su borde.
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          initial={{ boxShadow: "0 0 0 0 color-mix(in oklab, var(--axi-violet) 45%, transparent)" }}
          animate={{ boxShadow: "0 0 0 12px color-mix(in oklab, var(--axi-violet) 0%, transparent)" }}
          transition={{ duration: 1.6, delay: 0.45, repeat: 1, ease: "easeOut" }}
        />
      )}
      <Island
        role="group"
        aria-label={label}
        title={reason ?? undefined}
        glow="ai"
        className="flex h-10 items-center gap-2.5 rounded-full py-1 pr-1 pl-3"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap tabular-nums">
          <Sparkles aria-hidden className="size-3 text-accent-violet" />
          <span className="hidden sm:inline">Axi te la pasó</span>
          {since !== null && (
            <>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span>{since}</span>
            </>
          )}
        </span>
        <Button variant="contrast" className="h-8 px-3.5" disabled={busy} onClick={action.onSelect}>
          <action.icon aria-hidden className="size-4" />
          {action.label}
        </Button>
      </Island>
    </motion.div>
  )
}
