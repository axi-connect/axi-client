"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { formatBytes } from "@/core/lib/format"
import { formatFullDateTime } from "@/core/lib/day-label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"
import { getFreshAttachmentUrl, useAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { attachmentDisplayName, type MessageAttachment } from "@/modules/inbox/domain/inbox"

type Slide = { messageId: string; attachment: MessageAttachment; caption: string | null; createdAt: string }

/** Cuántas miniaturas se ven en la tira alrededor de la actual. */
const FILM_RADIUS = 4

/**
 * Visor de fotos (F3): cristal oscuro a pantalla completa. Recorre las fotos
 * YA cargadas de la conversación (flechas, ← →, tira de miniaturas), con el
 * texto que las acompañó, descarga con URL FRESCA (la del hilo pudo vencer) y
 * Escape. Las miniaturas usan la misma caché de URLs firmadas que el hilo.
 */
export function MediaLightbox({
  open,
  onOpenChange,
  imageUrl,
  attachment,
  conversationId,
  messageId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** La URL que ya pinta la burbuja (o el preview local del optimista). */
  imageUrl: string | null
  attachment: MessageAttachment
  conversationId: string
  messageId: string
}) {
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <LightboxBody
        onClose={() => onOpenChange(false)}
        imageUrl={imageUrl}
        attachment={attachment}
        conversationId={conversationId}
        messageId={messageId}
      />
    </Dialog>
  )
}

function LightboxBody({
  onClose,
  imageUrl,
  attachment,
  conversationId,
  messageId,
}: {
  onClose: () => void
  imageUrl: string | null
  attachment: MessageAttachment
  conversationId: string
  messageId: string
}) {
  const items = useInboxStore((state) => state.messagesById[conversationId]?.items)
  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = []
    for (const message of items ?? []) {
      const first = message.attachments[0]
      if (message.content_type === "image" && first) {
        list.push({ messageId: message.id, attachment: first, caption: message.body, createdAt: message.created_at })
      }
    }
    // La foto abierta siempre está, aunque el hilo aún no la tenga (optimista).
    if (!list.some((slide) => slide.messageId === messageId)) {
      list.push({ messageId, attachment, caption: null, createdAt: new Date().toISOString() })
    }
    return list
  }, [items, messageId, attachment])

  const [index, setIndex] = useState(() => Math.max(0, slides.findIndex((slide) => slide.messageId === messageId)))
  const current = slides[Math.min(index, slides.length - 1)] as Slide
  const hasPrev = index > 0
  const hasNext = index < slides.length - 1
  const displayName = attachmentDisplayName(current.attachment)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = await getFreshAttachmentUrl(conversationId, current.messageId, current.attachment.id)
      window.open(url, "_blank", "noopener")
    } finally {
      setDownloading(false)
    }
  }

  const from = Math.max(0, index - FILM_RADIUS)
  const film = slides.slice(from, index + FILM_RADIUS + 1)

  return (
    <DialogContent
      showCloseButton={false}
      className="top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black/80 p-0 text-white backdrop-blur-2xl sm:max-w-none"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && hasPrev) {
          e.preventDefault()
          setIndex(index - 1)
        } else if (e.key === "ArrowRight" && hasNext) {
          e.preventDefault()
          setIndex(index + 1)
        }
      }}
    >
      <DialogTitle className="sr-only">
        Foto {index + 1} de {slides.length}
      </DialogTitle>
      <DialogDescription className="sr-only">{displayName}. Usa las flechas para ver las demás fotos de la conversación.</DialogDescription>

      <div className="flex items-center gap-3 px-4 pt-4 pb-2 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold" title={displayName}>
            {displayName}
          </span>
          <span className="truncate text-xs text-white/70 tabular-nums">
            {formatFullDateTime(current.createdAt)} · {formatBytes(current.attachment.size_bytes)}
          </span>
        </div>
        {slides.length > 1 && (
          <span className="hidden text-sm text-white/80 tabular-nums sm:inline" aria-hidden>
            {index + 1} de {slides.length}
          </span>
        )}
        <button type="button" onClick={() => void handleDownload()} disabled={downloading} className={cn(GLASS, "h-10 gap-2 px-4 text-sm font-medium")}>
          {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          <span className="hidden sm:inline">Descargar</span>
          <span className="sr-only sm:hidden">Descargar</span>
        </button>
        <button type="button" onClick={onClose} className={cn(GLASS, "size-11")} aria-label="Cerrar el visor">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-3 px-2 sm:gap-5 sm:px-6">
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          disabled={!hasPrev}
          className={cn(GLASS, "size-11 disabled:invisible")}
          aria-label="Foto anterior"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center py-2">
          <SlideImage
            key={current.messageId}
            conversationId={conversationId}
            slide={current}
            fallbackUrl={current.messageId === messageId ? imageUrl : null}
            alt={displayName}
          />
        </div>
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          disabled={!hasNext}
          className={cn(GLASS, "size-11 disabled:invisible")}
          aria-label="Foto siguiente"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {current.caption && <p className="mx-auto max-w-2xl px-6 pt-2 text-center text-sm text-white/85">{current.caption}</p>}

      {slides.length > 1 ? (
        <div className="flex justify-center gap-2 px-4 pt-3 pb-5" role="group" aria-label="Fotos de la conversación">
          {film.map((slide, offset) => {
            const position = from + offset
            return (
              <button
                key={slide.messageId}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Foto ${String(position + 1)} de ${String(slides.length)}`}
                aria-current={position === index ? "true" : undefined}
                className={cn(
                  "size-14 shrink-0 overflow-hidden rounded-xl bg-white/10 transition-opacity",
                  position === index ? "opacity-100 ring-2 ring-white" : "opacity-50 hover:opacity-80",
                )}
              >
                <Thumb conversationId={conversationId} slide={slide} />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="h-5" />
      )}
    </DialogContent>
  )
}

const GLASS =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"

function SlideImage({
  conversationId,
  slide,
  fallbackUrl,
  alt,
}: {
  conversationId: string
  slide: Slide
  fallbackUrl: string | null
  alt: string
}) {
  const { url, refresh } = useAttachmentUrl(conversationId, slide.messageId, slide.attachment.id, { enabled: fallbackUrl === null })
  const src = fallbackUrl ?? url
  if (!src) return <Loader2 className="size-6 animate-spin text-white/70" aria-label="Cargando la foto" />
  return (
    // URL firmada rotativa (TTL 300 s): el optimizador de next/image cachearía por URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={refresh} className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
  )
}

function Thumb({ conversationId, slide }: { conversationId: string; slide: Slide }) {
  const { url } = useAttachmentUrl(conversationId, slide.messageId, slide.attachment.id)
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="size-full object-cover" /> : null
}
