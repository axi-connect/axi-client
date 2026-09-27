"use client"

import { useCallback } from "react"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { HttpError } from "@/core/api/problem"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { isWindowRejection, useWindowRejections } from "@/modules/inbox/infrastructure/hooks/use-reply-window"
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
const WINDOW_CLOSED_TITLE = "La ventana de 24 h está cerrada: el mensaje no salió"

/**
 * El servidor manda sobre la ventana (F3): un rechazo por ventana la cierra en
 * el composer con el `last_inbound_at` que tenía la conversación. Devuelve si
 * lo era, para que el aviso diga eso y no el mensaje genérico.
 */
export function noteWindowRejection(conversationId: string, code: string | undefined | null): boolean {
  if (!isWindowRejection(code)) return false
  const state = useInboxStore.getState()
  const conversation =
    state.selected?.id === conversationId ? state.selected : state.conversations.find((c) => c.id === conversationId)
  useWindowRejections.getState().reject(conversationId, conversation?.last_inbound_at ?? null)
  return true
}

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
            const closed = noteWindowRejection(conversationId, ack.error.code)
            showAlert({ tone: "error", title: closed ? WINDOW_CLOSED_TITLE : ack.error.message || "No se pudo enviar el mensaje" })
          }
        } else {
          // Fallback REST: 202; la confirmación llega al reconectar el WS.
          const enqueued = await sendMessageRest(conversationId, dto)
          reconcileSent(conversationId, localId, enqueued as UiMessage)
        }
      } catch (err) {
        markSendFailed(conversationId, localId)
        const closed = noteWindowRejection(conversationId, err instanceof HttpError ? err.code : null)
        showAlert({ tone: "error", title: closed ? WINDOW_CLOSED_TITLE : errorMessage(err, "No se pudo enviar el mensaje") })
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
