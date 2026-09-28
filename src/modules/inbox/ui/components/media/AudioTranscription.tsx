"use client"

import { useState } from "react"
import { ChevronDown, Sparkles } from "lucide-react"
import { cn } from "@/core/lib/utils"
import type { AudioTranscription as Transcription } from "@/modules/inbox/domain/inbox"

/** Por encima de esto la transcripción empieza plegada (dos líneas y «ver toda»). */
export const TRANSCRIPT_FOLD_CHARS = 160

/**
 * Transcripción STT bajo el reproductor. Tres estados:
 * - `pending` (audio en vivo, transcripción en camino) → «Transcribiendo…».
 * - `done` con texto → el texto, plegable (F3): una larga empieza en dos
 *   líneas; la cabecera abre y cierra.
 * - `failed` / sin datos y sin pending → nada (solo queda el reproductor).
 *
 * Colores con `currentColor`: sirve igual en la entrante (tarjeta) y en la
 * saliente (tinta) en los dos temas. El pulso respeta `prefers-reduced-motion`.
 */
export function AudioTranscription({
  transcription,
  pending,
}: {
  transcription: Transcription | null
  pending: boolean
  /** Ya no cambia nada (los colores salen de `currentColor`); se acepta por compatibilidad. */
  outbound?: boolean
}) {
  const text = transcription?.status === "done" ? transcription.text?.trim() : undefined
  const long = text !== undefined && text.length > TRANSCRIPT_FOLD_CHARS
  const [open, setOpen] = useState(!long)

  if (text) {
    return (
      <div className="mt-2 border-t border-current/15 pt-1.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex h-6 items-center gap-1 rounded-full text-[10.5px] tracking-[0.08em] uppercase opacity-75 hover:opacity-100"
        >
          <Sparkles className="size-3 shrink-0" aria-hidden />
          Transcripción
          <ChevronDown className={cn("size-3 transition-transform motion-reduce:transition-none", !open && "-rotate-90")} aria-hidden />
        </button>
        <p className={cn("text-[13px] leading-relaxed break-words whitespace-pre-wrap", !open && "line-clamp-2")}>{text}</p>
      </div>
    )
  }

  if (pending) {
    return (
      <div
        className="mt-2 flex items-center gap-1 border-t border-current/15 pt-1.5 text-[10.5px] tracking-[0.08em] uppercase opacity-75"
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
