"use client"

import { Package } from "lucide-react"
import { cn } from "@/core/lib/utils"
import {
  extractCatalogSku,
  extractLocationPayload,
  extractRecognition,
  extractTranscription,
  isAttachmentPurged,
  isSharedPost,
  type MediaContentKind,
  type UiMessage,
} from "@/modules/inbox/domain/inbox"
import { AudioPlayerBubble } from "./AudioPlayerBubble"
import { AudioTranscription } from "./AudioTranscription"
import { ProductRecognitionChip } from "./ProductRecognitionChip"
import { DocumentCard } from "./DocumentCard"
import { ImageBubble } from "./ImageBubble"
import { LocationBubble } from "./LocationBubble"
import { MediaPurged, MediaSkeleton, MediaUnavailable } from "./MediaStates"
import { VideoBubble } from "./VideoBubble"

/**
 * Dispatcher de media por content_type (W1 del plan). Renderiza el primer
 * attachment del mensaje (el pipeline garantiza uno por mensaje media);
 * `local_previews` (F2) cubre el optimista antes de que exista el attachment.
 */
export function MediaAttachment({
  message,
  conversationId,
  outbound,
}: {
  message: UiMessage
  conversationId: string
  outbound: boolean
}) {
  const kind = message.content_type as MediaContentKind

  if (kind === "location") {
    const location = extractLocationPayload(message.payload)
    if (!location) return <MediaUnavailable kind="location" outbound={outbound} />
    return <LocationBubble location={location} outbound={outbound} />
  }

  const attachment = message.attachments[0]
  const previewUrl = message.local_previews?.[0]?.object_url ?? null
  if (!attachment && !previewUrl) {
    // El attachment llega en un job aparte tras message_received; mientras
    // `resolvePendingMedia` reintenta, se muestra el skeleton (no el error).
    if (message.media_pending) return <MediaSkeleton kind={kind} />
    return <MediaUnavailable kind={kind} outbound={outbound} />
  }

  // Depurado por la política de almacenamiento: ni vista previa ni descarga
  // (la URL respondería 410). El mensaje se conserva con su fecha.
  if (attachment && isAttachmentPurged(attachment)) {
    return <MediaPurged kind={kind} sizeBytes={attachment.size_bytes} purgedAt={attachment.purged_at as string} />
  }

  switch (kind) {
    case "image":
    case "sticker": {
      // Foto enviada por la IA desde el catálogo (F16): chip con el SKU para
      // que el operador sepa qué producto mostró el agente.
      const catalogSku = kind === "image" ? extractCatalogSku(message.payload) : null
      return (
        // Ancho del marco (F3): el chip del producto no ensancha la burbuja más que la foto.
        <div className={cn("flex flex-col gap-1", kind === "image" && "w-60 max-w-full")}>
          <ImageBubble
            conversationId={conversationId}
            messageId={message.id}
            attachment={attachment}
            outbound={outbound}
            previewUrl={previewUrl}
            sticker={kind === "sticker"}
          />
          {catalogSku && (
            <span className="mx-1 inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              <Package className="size-3" aria-hidden />
              <span className="font-mono">{catalogSku}</span>
            </span>
          )}
          {kind === "image" && !outbound && (
            <ProductRecognitionChip
              recognition={extractRecognition(message.payload)}
              createdAt={message.created_at}
            />
          )}
        </div>
      )
    }
    case "video":
      return (
        <div className="flex w-60 max-w-full flex-col gap-1">
          <VideoBubble
            conversationId={conversationId}
            messageId={message.id}
            attachment={attachment}
            outbound={outbound}
            previewUrl={previewUrl}
          />
          {/* Reel de Instagram compartido: el backend analiza su primer
              fotograma. Un video cualquiera no se analiza y no promete nada. */}
          {!outbound && isSharedPost(message.payload) && (
            <ProductRecognitionChip
              recognition={extractRecognition(message.payload)}
              createdAt={message.created_at}
              subject="reel"
            />
          )}
        </div>
      )
    case "audio":
      return (
        <div className="flex flex-col gap-1.5">
          <AudioPlayerBubble
            conversationId={conversationId}
            messageId={message.id}
            attachment={attachment}
            outbound={outbound}
            previewUrl={previewUrl}
          />
          <AudioTranscription
            transcription={extractTranscription(message.payload)}
            pending={Boolean(message.transcription_pending)}
            outbound={outbound}
          />
        </div>
      )
    case "document":
      if (!attachment) return <MediaUnavailable kind="document" outbound={outbound} />
      return (
        <DocumentCard
          conversationId={conversationId}
          messageId={message.id}
          attachment={attachment}
          outbound={outbound}
        />
      )
    default:
      return <MediaUnavailable kind={kind} outbound={outbound} />
  }
}
