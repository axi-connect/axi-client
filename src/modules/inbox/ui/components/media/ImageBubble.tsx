"use client"

import { useRef, useState } from "react"
import { cn } from "@/core/lib/utils"
import { useAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import { attachmentDisplayName, type MessageAttachment } from "@/modules/inbox/domain/inbox"
import { MEDIA_FRAME, MediaError, MediaSkeleton } from "./MediaStates"
import { MediaLightbox } from "./MediaLightbox"

/**
 * Imagen del chat: thumbnail lazy con URL firmada, clic → lightbox.
 * `previewUrl` (F2): object URL local del optimista mientras sube.
 */
export function ImageBubble({
  conversationId,
  messageId,
  attachment,
  outbound,
  previewUrl,
  sticker = false,
}: {
  conversationId: string
  messageId: string
  attachment?: MessageAttachment
  outbound: boolean
  previewUrl?: string | null
  sticker?: boolean
}) {
  const { url, status, refresh } = useAttachmentUrl(conversationId, messageId, attachment?.id, {
    enabled: !previewUrl,
  })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Un solo auto-retry por expiración; después, estado de error con botón
  const autoRetriedRef = useRef(false)
  const [broken, setBroken] = useState(false)

  const src = previewUrl ?? url
  const kind = sticker ? "sticker" : "image"

  if (broken || status === "error") {
    return (
      <MediaError
        kind={kind}
        outbound={outbound}
        onRetry={() => {
          setBroken(false)
          autoRetriedRef.current = false
          refresh()
        }}
      />
    )
  }
  if (!src) return <MediaSkeleton kind={kind} />

  return (
    <>
      <button
        type="button"
        onClick={() => attachment && setLightboxOpen(true)}
        className={cn(
          "block overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          sticker ? "size-32 rounded-[14px] bg-transparent" : cn(MEDIA_FRAME, "cursor-zoom-in"),
        )}
        aria-label={`Ver ${attachment !== undefined ? attachmentDisplayName(attachment) : "imagen"}`}
      >
        {/* URL firmada rotativa (TTL 300 s): incompatible con el cache de next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={attachment !== undefined ? attachmentDisplayName(attachment) : "Imagen"}
          loading="lazy"
          className={cn("size-full", sticker ? "object-contain" : "object-cover")}
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
      </button>
      {attachment && (
        <MediaLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          imageUrl={src}
          attachment={attachment}
          conversationId={conversationId}
          messageId={messageId}
        />
      )}
    </>
  )
}
