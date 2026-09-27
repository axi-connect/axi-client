"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { InkIsland, Kicker } from "@/shared/components/features/bento"
import { formatClockTime } from "@/core/lib/day-label"
import type { HandoffReason } from "@/modules/inbox/domain/conversation-events"
import type { HandoffActionsState } from "./use-handoff-actions"

/**
 * «Por qué está aquí» (F2): arriba del hilo mientras la conversación espera en
 * cola. Sale del último `escalated` del episodio. Lo cuenta el agente, así que
 * va en cristal con brillo `ai` (DESIGN-SYSTEM §9.5.1).
 *
 * - Con permiso de handoff: «Atender» (contrast) y «Devolver a Axi» (glass).
 * - Sin permiso: explica quién la atiende, sin botón.
 * - Atendida (`human_active`): se pliega a una línea, `HandoffReasonLine`.
 */
export function HandoffReasonIsland({
  reason,
  since,
  handoff,
}: {
  reason: HandoffReason
  /** «hace 14 min», ya formateado. */
  since: string | null
  handoff: HandoffActionsState
}) {
  const claim = handoff.primary?.id === "claim" ? handoff.primary : null
  const giveBack = handoff.secondary.find((action) => action.id === "return_to_ai") ?? null
  const details = [
    `Espera desde las ${formatClockTime(reason.at)}`,
    reason.slaMinutes !== null ? `superó los ${String(reason.slaMinutes)} min de espera` : null,
  ].filter((part): part is string => part !== null)

  return (
    <InkIsland
      label="Por qué está aquí"
      glow="ai"
      className="mx-4 mt-3 shrink-0 gap-4 p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Kicker>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles aria-hidden className="size-3 text-accent-violet" />
            Axi te la pasó{since !== null ? ` · ${since}` : ""}
          </span>
        </Kicker>
        <p className="font-heading text-xl leading-snug font-bold tracking-tight">{reason.sentence}</p>
        <p className="text-sm text-muted-foreground">
          {claim === null ? "La atiende quien tenga permiso de atender conversaciones." : `${details.join(" · ")}.`}
        </p>
      </div>
      {claim !== null && (
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Button variant="contrast" className="flex-1 sm:flex-none" disabled={handoff.busy} onClick={claim.onSelect}>
            <claim.icon aria-hidden className="size-4" />
            {claim.label}
          </Button>
          {giveBack !== null && (
            <Button variant="glass" className="flex-1 sm:flex-none" disabled={handoff.busy} onClick={giveBack.onSelect}>
              {giveBack.label}
            </Button>
          )}
        </div>
      )}
    </InkIsland>
  )
}

/** El motivo plegado a una línea cuando ya la atendieron. */
export function HandoffReasonLine({ reason }: { reason: HandoffReason }) {
  return (
    <div className="mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2 text-xs text-foreground/85">
      <Sparkles aria-hidden className="size-3 shrink-0 text-accent-violet" />
      <span className="min-w-0 flex-1 truncate" title={`Axi te la pasó · ${reason.sentence}`}>
        Axi te la pasó · {reason.sentence}
      </span>
      <span className="shrink-0 text-muted-foreground tabular-nums">{formatClockTime(reason.at)}</span>
    </div>
  )
}
