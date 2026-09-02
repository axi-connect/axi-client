"use client"

import { Loader2, Play, Square } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

/**
 * Play/stop de una muestra de audio (§10.5) — presentacional puro, violeta =
 * capacidad IA. Detiene la propagación (vive dentro de items seleccionables);
 * sin URL queda deshabilitado con la explicación en tooltip, jamás oculto.
 */
export function SamplePlayButton({
  name,
  url,
  playing,
  loading,
  onToggle,
  pendingHint = "Muestra pendiente",
  className,
}: {
  /** Nombre legible del dueño de la muestra (arma los aria-label). */
  name: string
  /** URL presignada de la muestra; `null` = aún no generada. */
  url: string | null
  playing: boolean
  loading: boolean
  onToggle: () => void
  /** Tooltip cuando no hay muestra. */
  pendingHint?: string
  className?: string
}) {
  const button = (
    <button
      type="button"
      disabled={url === null}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        playing
          ? "border-transparent bg-accent-violet text-white"
          : "border-accent-violet/30 text-accent-violet hover:bg-accent-violet/10",
        url === null && "cursor-not-allowed opacity-40",
        className,
      )}
      aria-label={
        url === null
          ? `Muestra de ${name} pendiente`
          : playing
            ? `Detener muestra de ${name}`
            : `Escuchar muestra de ${name}`
      }
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : playing ? (
        <Square className="size-3 fill-current" aria-hidden />
      ) : (
        <Play className="size-3.5 translate-x-px fill-current" aria-hidden />
      )}
    </button>
  )

  if (url !== null) return button
  return (
    <Tooltip>
      {/* El disabled mata los eventos de puntero: el wrapper recibe el hover */}
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{pendingHint}</TooltipContent>
    </Tooltip>
  )
}
