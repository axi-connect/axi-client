"use client"

import { useCallback, useEffect, useRef } from "react"
import { API_ERROR_CODES, COMPANY_SUSPENDED_EVENT } from "@/core/api/problem"
import { socketManager } from "@/core/realtime/socket-manager"
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { getConversationMessages } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import type { Schemas } from "@/core/api/types"
import type { WsAck, SendMessagePayload } from "@/core/realtime/events"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

/**
 * Conexión al namespace `/inbox`: enruta eventos al store y expone los
 * comandos con ack tipado. Las acciones de handoff van SIEMPRE por aquí
 * (mismo RBAC y use cases que REST); un ack `{ok:false}` jamás desconecta.
 *
 * Reglas:
 * - Al seleccionar conversación: `inbox.join_conversation`; al salir, leave.
 * - En `reconnect`: re-join automático de la conversación activa.
 * - Ack `conversations/handoff_conflict`: re-fetch de la conversación
 *   (otro operador ganó la carrera) — la UI se auto-corrige.
 */
export type InboxCommandError = { code: string; message: string }

export type InboxCommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: InboxCommandError }

export function useInboxSocket() {
  const { socket, connected } = useSocket("inbox")
  const store = useInboxStore
  const joinedRef = useRef<string | null>(null)

  // --- Eventos → store -----------------------------------------------------

  useSocketEvent(socket, "conversation.created", () => {
    store.getState().fetchConversations()
    store.getState().fetchCounts()
  })

  useSocketEvent(socket, "conversation.message_received", async (payload) => {
    const state = store.getState()
    state.bumpConversation(payload.conversation_id)
    // Si la conversación está abierta, trae el mensaje concreto vía timeline.
    if (state.selectedId === payload.conversation_id) {
      try {
        const res = await getConversationMessages(payload.conversation_id, { limit: 5 })
        const incoming = res.data.find((m) => m.id === payload.message_id)
        if (incoming) {
          state.appendMessage(payload.conversation_id, incoming as UiMessage)
          // Audio inbound: la transcripción llega unos segundos después vía
          // `message_updated` → indicador "Transcribiendo…" mientras tanto.
          if (incoming.content_type === "audio" && incoming.direction === "inbound") {
            state.markTranscribing(payload.conversation_id, incoming.id)
          }
        }
      } catch {
        // El próximo fetch completo lo trae.
      }
    }
  })

  // STT: la transcripción de un audio quedó lista → merge en vivo en la burbuja
  // (y preview de la lista) sin re-consultar. El reducer es no-op si esa
  // conversación no está cargada en memoria.
  useSocketEvent(socket, "conversation.message_updated", (payload) => {
    store
      .getState()
      .applyTranscription(payload.conversation_id, payload.message_id, payload.transcription)
  })

  // F9.1: mensaje outbound recién PERSISTIDO (reply de IA, quick action,
  // system, otro operador) — llega con la vista completa: se pinta en vivo
  // sin round-trip. El dedupe por id de appendMessage evita duplicar el
  // optimista propio (ya reconciliado con el id real).
  useSocketEvent(socket, "conversation.message_created", (payload) => {
    const state = store.getState()
    state.bumpConversation(payload.conversation_id)
    if (state.selectedId === payload.conversation_id) {
      state.appendMessage(payload.conversation_id, payload.message as UiMessage)
    }
  })

  useSocketEvent(socket, "conversation.message_sent", async (payload) => {
    const state = store.getState()
    state.confirmMessage(payload.conversation_id, payload.message_id)
    state.bumpConversation(payload.conversation_id)
    // Robustez: si el created se perdió (reconexión), el mensaje no está en
    // el timeline abierto → mismo refetch dirigido que message_received.
    if (state.selectedId === payload.conversation_id) {
      const known = state.messagesById[payload.conversation_id]?.items.some(
        (m) => m.id === payload.message_id,
      )
      if (!known) {
        try {
          const res = await getConversationMessages(payload.conversation_id, { limit: 5 })
          const sent = res.data.find((m) => m.id === payload.message_id)
          if (sent) state.appendMessage(payload.conversation_id, sent as UiMessage)
        } catch {
          // El próximo fetch completo lo trae.
        }
      }
    }
  })

  // F9.1: el envío falló en el proveedor → la burbuja pasa a failed en vivo
  useSocketEvent(socket, "conversation.message_status", (payload) => {
    if (payload.status === "failed") {
      store.getState().markMessageFailed(payload.conversation_id, payload.message_id)
    }
  })

  useSocketEvent(socket, "conversation.typing", (payload) => {
    store.getState().onTyping(payload)
  })

  useSocketEvent(socket, "conversation.escalated", (p) => store.getState().onHandoffEvent(p))
  useSocketEvent(socket, "conversation.claimed", (p) => store.getState().onHandoffEvent(p))
  useSocketEvent(socket, "conversation.taken_over", (p) => store.getState().onHandoffEvent(p))
  useSocketEvent(socket, "conversation.returned_to_ai", (p) => store.getState().onHandoffEvent(p))
  useSocketEvent(socket, "conversation.status_changed", (p) => store.getState().onHandoffEvent(p))
  useSocketEvent(socket, "conversation.sla_breached", () => {
    store.getState().fetchCounts()
  })

  // F15: el AuthProvider (único listener) frena el tiempo real y muestra la
  // pantalla bloqueante. dispatchEvent es síncrono: el halt ocurre antes de
  // que socket.io procese la desconexión forzada que sigue al evento.
  useSocketEvent(socket, "company.suspended", () => {
    window.dispatchEvent(new Event(COMPANY_SUSPENDED_EVENT))
  })

  // --- Join/leave de la conversación activa --------------------------------

  const selectedId = useInboxStore((s) => s.selectedId)

  useEffect(() => {
    if (!socket || !connected) return

    const join = (conversationId: string) => {
      socketManager
        .emitWithAck(socket, "inbox.join_conversation", { conversation_id: conversationId })
        .catch(() => { /* timeout: la reconexión re-joinea */ })
    }

    if (joinedRef.current && joinedRef.current !== selectedId) {
      socketManager
        .emitWithAck(socket, "inbox.leave_conversation", { conversation_id: joinedRef.current })
        .catch(() => { /* leave best-effort */ })
      joinedRef.current = null
    }
    if (selectedId && joinedRef.current !== selectedId) {
      join(selectedId)
      joinedRef.current = selectedId
    }

    // Re-join tras reconexión (los rooms company/user son automáticos).
    const onConnect = () => {
      if (joinedRef.current) join(joinedRef.current)
    }
    socket.on("connect", onConnect)
    return () => {
      socket.off("connect", onConnect)
    }
  }, [socket, connected, selectedId])

  // --- Comandos con ack ----------------------------------------------------

  const emit = useCallback(
    async <T>(event: string, payload: unknown): Promise<InboxCommandResult<T>> => {
      if (!socket || !socket.connected) {
        return { ok: false, error: { code: "client/socket_disconnected", message: "Sin conexión en tiempo real" } }
      }
      try {
        const ack = await socketManager.emitWithAck<T>(socket, event, payload)
        if (!ack.ok && ack.error.code === API_ERROR_CODES.handoffConflict) {
          // Otro operador ganó: sincroniza el estado real.
          void useInboxStore.getState().refreshSelected()
          void useInboxStore.getState().fetchConversations()
        }
        return ack as InboxCommandResult<T>
      } catch {
        return { ok: false, error: { code: "client/ack_timeout", message: "El servidor no respondió" } }
      }
    },
    [socket],
  )

  const commands = {
    claim: (conversationId: string) =>
      emit<Schemas["ConversationDto"]>("inbox.claim", { conversation_id: conversationId }),
    takeover: (conversationId: string) =>
      emit<Schemas["ConversationDto"]>("inbox.takeover", { conversation_id: conversationId }),
    returnToAi: (conversationId: string, note?: string) =>
      emit<Schemas["ConversationDto"]>("inbox.return_to_ai", {
        conversation_id: conversationId,
        ...(note ? { note } : {}),
      }),
    close: (conversationId: string, opts: { resolved?: boolean; reason?: string } = {}) =>
      emit<Schemas["ConversationDto"]>("inbox.close", { conversation_id: conversationId, ...opts }),
    sendMessage: (payload: SendMessagePayload) =>
      emit<Schemas["EnqueuedMessageDto"]>("inbox.send_message", payload),
    markRead: (conversationId: string) =>
      emit<null>("inbox.mark_read", { conversation_id: conversationId }),
    typing: (conversationId: string, isTyping: boolean) =>
      emit<null>("inbox.typing", { conversation_id: conversationId, is_typing: isTyping }),
  }

  return { connected, commands }
}

export type InboxCommands = ReturnType<typeof useInboxSocket>["commands"]
export type { WsAck }
