"use client"

import { useCallback } from "react"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { sendMessageRest } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

/**
 * Envío de mensajes con inserción optimista, reconciliación por ack y
 * reintento. Camino primario: WS `inbox.send_message`; fallback: REST 202.
 */
export function useSendMessage(conversationId: string, commands: InboxCommands, socketConnected: boolean) {
  const { showAlert } = useAlert()
  const { sendOptimistic, reconcileSent, markSendFailed } = useInboxStore()

  const send = useCallback(
    async (text: string, existingLocalId?: string) => {
      const localId = existingLocalId ?? sendOptimistic(conversationId, text)
      try {
        if (socketConnected) {
          const ack = await commands.sendMessage({ conversation_id: conversationId, type: "text", body: text })
          if (ack.ok) {
            reconcileSent(conversationId, localId, ack.data as UiMessage)
          } else {
            markSendFailed(conversationId, localId)
            showAlert({ tone: "error", title: ack.error.message || "No se pudo enviar el mensaje", open: true })
          }
        } else {
          // Fallback REST: 202; la confirmación llega al reconectar el WS.
          const enqueued = await sendMessageRest(conversationId, { type: "text", body: text })
          reconcileSent(conversationId, localId, { ...enqueued, attachments: [] } as UiMessage)
        }
      } catch (err) {
        markSendFailed(conversationId, localId)
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo enviar el mensaje"), open: true })
      }
    },
    [conversationId, commands, socketConnected, sendOptimistic, reconcileSent, markSendFailed, showAlert],
  )

  /** Reintento de un mensaje optimista fallido. */
  const retry = useCallback(
    (message: UiMessage) => {
      if (!message.local_id || !message.body) return
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
      void send(message.body, message.local_id)
    },
    [conversationId, send],
  )

  return { send, retry }
}
