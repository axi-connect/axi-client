"use client"

import { cn } from "@/core/lib/utils"
import { Sparkles } from "lucide-react"
import type { AudioTranscription as Transcription } from "@/modules/inbox/domain/inbox"

/**
 * Transcripción STT bajo el player de audio. Tres estados:
 * - `pending` (audio en vivo, transcripción en camino) → "Transcribiendo…".
 * - `done` con texto → bloque etiquetado sutil con la transcripción.
 * - `failed` / sin datos y sin pending → no renderiza nada (solo queda el player).
 *
 * El pulso del estado pendiente se desactiva con `prefers-reduced-motion`
 * (media query global en globals.css sobre `animate-*`).
 */
export function AudioTranscription({
  transcription,
  pending,
  outbound,
}: {
  transcription: Transcription | null
  pending: boolean
  outbound: boolean
}) {
  const label = outbound ? "text-white/70" : "text-muted-foreground"
  const divider = outbound ? "border-white/15" : "border-border/60"

  if (transcription?.status === "done" && transcription.text) {
    return (
      <div className={cn("mt-1.5 border-t pt-1.5", divider)}>
        <div className={cn("mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wide", label)}>
          <Sparkles className="size-3 shrink-0" aria-hidden />
          <span>Transcripción</span>
        </div>
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-sm",
            outbound ? "text-white/90" : "text-foreground",
          )}
        >
          {transcription.text}
        </p>
      </div>
    )
  }

  if (pending) {
    return (
      <div
        className={cn(
          "mt-1.5 flex items-center gap-1 border-t pt-1.5 text-[10px] uppercase tracking-wide",
          divider,
          label,
        )}
        role="status"
        aria-label="Transcribiendo audio"
      >
        <Sparkles className="size-3 shrink-0 animate-pulse" aria-hidden />
        <span className="animate-pulse">Transcribiendo…</span>
      </div>
    )
  }

  return null
}
