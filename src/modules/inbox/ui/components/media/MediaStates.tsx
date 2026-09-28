"use client"

import { cn } from "@/core/lib/utils"
import { FileWarning, ImageOff, RotateCw } from "lucide-react"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { MEDIA_PREVIEW_LABELS, type MediaContentKind } from "@/modules/inbox/domain/inbox"

/**
 * Marco de foto y video (F3): el contrato no trae dimensiones, así que la
 * proporción es fija (4:3, recorte centrado) y el visor muestra la foto entera.
 */
export const MEDIA_FRAME = "aspect-[4/3] w-60 max-w-full rounded-[14px]"

/** Skeleton con la proporción del tipo de media mientras llega la URL firmada. */
export function MediaSkeleton({ kind }: { kind: MediaContentKind }) {
  // El MISMO marco que la media cargada (F3): la silueta ocupa lo mismo y nada salta.
  const shape =
    kind === "image" || kind === "video"
      ? MEDIA_FRAME
      : kind === "sticker"
        ? "size-32 rounded-[14px]"
        : "h-14 w-60 max-w-full rounded-[14px]"
  return <Skeleton className={shape} aria-label="Cargando adjunto" />
}

/** Error de carga (URL expirada, red): reintenta re-pidiendo la URL firmada. */
export function MediaError({
  kind,
  onRetry,
  outbound,
}: {
  kind: MediaContentKind
  onRetry: () => void
  outbound: boolean
}) {
  const Icon = kind === "image" || kind === "sticker" || kind === "video" ? ImageOff : FileWarning
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
        outbound ? "bg-background/10 text-background/90" : "bg-background/60 text-muted-foreground",
      )}
      role="alert"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>No se pudo cargar</span>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
      >
        <RotateCw className="size-3" aria-hidden /> Reintentar
      </button>
    </div>
  )
}

/** Mensaje media sin attachment (descarga entrante aún en curso o fallida). */
export function MediaUnavailable({
  kind,
  outbound,
}: {
  kind: MediaContentKind
  outbound: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs italic",
        outbound ? "bg-background/10 text-background/80" : "bg-background/60 text-muted-foreground",
      )}
    >
      <FileWarning className="size-4 shrink-0" aria-hidden />
      <span>{MEDIA_PREVIEW_LABELS[kind]} no disponible todavía</span>
    </div>
  )
}
