"use client"

import { useState } from "react"
import { useAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import type { MessageAttachment } from "@/modules/inbox/domain/inbox"
import { AudioPlayerCore } from "@/shared/components/features/audio-player"
import { MediaError, MediaPurged } from "./MediaStates"

/**
 * Audio/nota de voz. La URL firmada se pide AL PRIMER PLAY (carga perezosa):
 * un timeline con muchos audios no dispara N peticiones al abrirse.
 */
export function AudioPlayerBubble({
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
  const [requested, setRequested] = useState(false)
  const { url, status, refresh } = useAttachmentUrl(conversationId, messageId, attachment?.id, {
    enabled: !previewUrl && requested,
  })

  // Depurado por platform mientras la conversación estaba abierta (410)
  if (status === "purged") {
    return <MediaPurged kind="audio" sizeBytes={attachment?.size_bytes ?? 0} purgedAt="" />
  }

  if (status === "error") {
    return <MediaError kind="audio" outbound={outbound} onRetry={refresh} />
  }

  return (
    <AudioPlayerCore
      src={previewUrl ?? url}
      loading={status === "loading"}
      outbound={outbound}
      onNeedSrc={() => setRequested(true)}
    />
  )
}
