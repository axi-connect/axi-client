"use client"

import { useRef, useState } from "react"
import { useAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import type { MessageAttachment } from "@/modules/inbox/domain/inbox"
import { MediaError, MediaSkeleton } from "./MediaStates"

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
  const [broken, setBroken] = useState(false)

  const src = previewUrl ?? url

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
    <video
      src={src}
      controls
      preload="metadata"
      playsInline
      className="max-h-72 w-auto max-w-full rounded-xl bg-black/20"
      aria-label={attachment?.filename ?? "Video"}
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
  )
}
