"use client"

import { useCallback } from "react"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { sendMessageRest } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import type {
  OutboundMediaKind,
  SendInput,
  SendMessageDTO,
  UiMessage,
} from "@/modules/inbox/domain/inbox"

/**
 * Envío de mensajes con inserción optimista, reconciliación por ack y
 * reintento. Camino primario: WS `inbox.send_message`; fallback: REST 202.
 * F9: media por `upload_id` (el archivo YA está subido cuando se envía) —
 * el retry reutiliza `local_payload` sin re-subir.
 */
function toDto(input: SendInput): SendMessageDTO {
  if (input.kind === "text") return { type: "text", body: input.body }
  return { type: "media", upload_id: input.upload_id, caption: input.caption }
}

function toOptimistic(input: SendInput) {
  if (input.kind === "text") {
    return { content_type: "text" as const, body: input.body }
  }
  return {
    content_type: input.media_kind,
    body: input.caption ?? null,
    local_previews: [input.preview],
    local_payload: toDto(input),
  }
}

export function useSendMessage(conversationId: string, commands: InboxCommands, socketConnected: boolean) {
  const { showAlert } = useAlert()
  const { sendOptimistic, reconcileSent, markSendFailed } = useInboxStore()

  const send = useCallback(
    async (input: SendInput, existingLocalId?: string) => {
      const localId = existingLocalId ?? sendOptimistic(conversationId, toOptimistic(input))
      const dto = toDto(input)
      try {
        if (socketConnected) {
          const ack = await commands.sendMessage({ conversation_id: conversationId, ...dto })
          if (ack.ok) {
            reconcileSent(conversationId, localId, ack.data as UiMessage)
          } else {
            markSendFailed(conversationId, localId)
            showAlert({ tone: "error", title: ack.error.message || "No se pudo enviar el mensaje", open: true })
          }
        } else {
          // Fallback REST: 202; la confirmación llega al reconectar el WS.
          const enqueued = await sendMessageRest(conversationId, dto)
          reconcileSent(conversationId, localId, enqueued as UiMessage)
        }
      } catch (err) {
        markSendFailed(conversationId, localId)
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo enviar el mensaje"), open: true })
      }
    },
    [conversationId, commands, socketConnected, sendOptimistic, reconcileSent, markSendFailed, showAlert],
  )

  /** Reintento de un mensaje optimista fallido (media: sin re-subir). */
  const retry = useCallback(
    (message: UiMessage) => {
      if (!message.local_id) return
      const payload = message.local_payload
      let input: SendInput
      if (payload?.type === "media" && payload.upload_id) {
        input = {
          kind: "media",
          upload_id: payload.upload_id,
          caption: payload.caption,
          media_kind: message.content_type as OutboundMediaKind,
          preview: message.local_previews?.[0] ?? {
            object_url: "",
            mime_type: "",
            filename: "",
            size_bytes: 0,
          },
        }
      } else if (message.body) {
        input = { kind: "text", body: message.body }
      } else {
        return
      }
      useInboxStore.setState((state) => {
        const current = state.messagesById[conversationId]
        if (!current) return state
        return {
          messagesById: {
            ...state.messagesById,
            [conversationId]: {
              ...current,
              items: current.items.map((m) =>
                m.local_id === message.local_id ? { ...m, status: "queued" as const, delivery: "pending" as const } : m,
              ),
            },
          },
        }
      })
      void send(input, message.local_id)
    },
    [conversationId, send],
  )

  return { send, retry }
}
