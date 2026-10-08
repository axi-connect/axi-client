"use client"

import { useRef, useState } from "react"
import { Play, Video } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { formatDuration } from "@/core/lib/format"
import { useAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import { attachmentDisplayName, type MessageAttachment } from "@/modules/inbox/domain/inbox"
import { MEDIA_FRAME, MediaError, MediaSkeleton, MediaPurged } from "./MediaStates"

/**
 * Video del chat (F3): el mismo marco que la foto (nada salta al cargar). Antes
 * de reproducir, el primer fotograma con el botón en cristal y la duración;
 * al tocar, pasa a los controles nativos (teclado, pantalla completa).
 */
export function VideoBubble({
  conversationId,
  messageId,
  attachment,
  outbound,
  previewUrl,
}: {
  conversationId: string
  messageId: string
  attachment?: MessageAttachment
  outbound: boolean
  previewUrl?: string | null
}) {
  const { url, status, refresh } = useAttachmentUrl(conversationId, messageId, attachment?.id, {
    enabled: !previewUrl,
  })
  const autoRetriedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [broken, setBroken] = useState(false)
  const [started, setStarted] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)

  const src = previewUrl ?? url
  const name = attachment !== undefined ? attachmentDisplayName(attachment) : "Video"

  // Depurado por platform mientras la conversación estaba abierta (410)
  if (status === "purged") {
    return <MediaPurged kind="video" sizeBytes={attachment?.size_bytes ?? 0} purgedAt="" />
  }

  if (broken || status === "error") {
    return (
      <MediaError
        kind="video"
        outbound={outbound}
        onRetry={() => {
          setBroken(false)
          autoRetriedRef.current = false
          refresh()
        }}
      />
    )
  }
  if (!src) return <MediaSkeleton kind="video" />

  return (
    <div className={cn("relative overflow-hidden bg-black", MEDIA_FRAME)}>
      <video
        ref={videoRef}
        src={src}
        controls={started}
        preload="metadata"
        playsInline
        className={cn("size-full", started ? "object-contain" : "object-cover")}
        aria-label={name}
        onLoadedMetadata={(e) => {
          const seconds = e.currentTarget.duration
          if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds)
        }}
        onError={() => {
          if (previewUrl) return
          if (autoRetriedRef.current) {
            setBroken(true)
          } else {
            autoRetriedRef.current = true
            refresh()
          }
        }}
      />
      {!started && (
        <>
          <button
            type="button"
            onClick={() => {
              setStarted(true)
              void videoRef.current?.play().catch(() => undefined)
            }}
            className="absolute inset-0 grid place-items-center focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
            aria-label={`Reproducir ${name}`}
          >
            <span className="grid size-13 place-items-center rounded-full border border-white/50 bg-white/25 text-white backdrop-blur-md">
              <Play className="size-5 translate-x-px fill-current" aria-hidden />
            </span>
          </button>
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex h-[22px] items-center gap-1.5 rounded-full bg-black/55 px-2 text-[11px] text-white backdrop-blur-md">
            <Video className="size-3" aria-hidden />
            {duration !== null && <span className="tabular-nums">{formatDuration(duration)}</span>}
          </span>
        </>
      )}
    </div>
  )
}
