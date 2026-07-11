"use client"

import {
  extractLocationPayload,
  type MediaContentKind,
  type UiMessage,
} from "@/modules/inbox/domain/inbox"
import { AudioPlayerBubble } from "./AudioPlayerBubble"
import { DocumentCard } from "./DocumentCard"
import { ImageBubble } from "./ImageBubble"
import { LocationBubble } from "./LocationBubble"
import { MediaUnavailable } from "./MediaStates"
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
    return <MediaUnavailable kind={kind} outbound={outbound} />
  }

  switch (kind) {
    case "image":
    case "sticker":
      return (
        <ImageBubble
          conversationId={conversationId}
          messageId={message.id}
          attachment={attachment}
          outbound={outbound}
          previewUrl={previewUrl}
          sticker={kind === "sticker"}
        />
      )
    case "video":
      return (
        <VideoBubble
          conversationId={conversationId}
          messageId={message.id}
          attachment={attachment}
          outbound={outbound}
          previewUrl={previewUrl}
        />
      )
    case "audio":
      return (
        <AudioPlayerBubble
          conversationId={conversationId}
          messageId={message.id}
          attachment={attachment}
          outbound={outbound}
          previewUrl={previewUrl}
        />
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
