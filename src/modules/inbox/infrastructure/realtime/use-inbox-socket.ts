"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { API_ERROR_CODES, COMPANY_SUSPENDED_EVENT } from "@/core/api/problem"
import { socketManager } from "@/core/realtime/socket-manager"
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { getConversationMessages } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import type { Schemas } from "@/core/api/types"
import type { WsAck, SendMessagePayload } from "@/core/realtime/events"
import { isMediaContentType, type UiMessage } from "@/modules/inbox/domain/inbox"

/**
 * Conexión al namespace `/inbox`: enruta eventos al store y expone los
 * comandos con ack tipado. Las acciones de handoff van SIEMPRE por aquí
 * (mismo RBAC y use cases que REST); un ack `{ok:false}` jamás desconecta.
 *
 * Reglas:
 * - Al seleccionar conversación: `inbox.join_conversation`; al salir, leave.
 * - En `reconnect`: re-join de la conversación activa Y resincronización del
 *   hilo (los eventos emitidos con el socket caído no llegaron a nadie).
 * - Ack `conversations/handoff_conflict`: re-fetch de la conversación
 *   (otro operador ganó la carrera) — la UI se auto-corrige.
 *
 * Principio del hilo abierto: ningún mensaje depende de que un evento concreto
 * llegue. Un delta ausente se rescata del timeline y, si tampoco está ahí, se
 * resincroniza. Nada se descarta en silencio.
 */
export type InboxCommandError = { code: string; message: string }

export type InboxCommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: InboxCommandError }

/**
 * Ventana del re-fetch de rescate. Una página completa: con una ventana corta,
 * una ráfaga del contacto empujaba el mensaje fuera del resultado y se perdía.
 */
const RESCUE_LIMIT = 50

export function useInboxSocket() {
  const { socket, connected } = useSocket("inbox")
  const store = useInboxStore
  const joinedRef = useRef<string | null>(null)

  /**
   * Pinta un mensaje recién llegado en el hilo abierto y arranca los dos
   * seguimientos que dependen de datos que aún no existen cuando se persiste.
   */
  const applyIncoming = useCallback((conversationId: string, message: UiMessage) => {
    const state = store.getState()
    state.appendMessage(conversationId, message)
    // Media sin attachment: el backend lo descarga en un job aparte y NO
    // emite evento de "media lista" → reintentamos el fetch hasta traerlo.
    if (isMediaContentType(message.content_type) && message.attachments.length === 0) {
      state.resolvePendingMedia(conversationId, message.id)
    }
    // Audio inbound: la transcripción llega unos segundos después vía
    // `message_updated` → indicador "Transcribiendo…" mientras tanto.
    if (message.content_type === "audio" && message.direction === "inbound") {
      state.markTranscribing(conversationId, message.id)
    }
  }, [store])

  // --- Eventos → store -----------------------------------------------------

  useSocketEvent(socket, "conversation.created", () => {
    store.getState().fetchConversations()
    store.getState().fetchCounts()
  })

  useSocketEvent(socket, "conversation.message_received", async (payload) => {
    const state = store.getState()
    state.bumpConversation(payload.conversation_id)
    if (state.selectedId !== payload.conversation_id) return

    // Camino normal: el evento trae la vista completa del mensaje y se pinta
    // sin round-trip (igual que `message_created`).
    if (payload.message) {
      applyIncoming(payload.conversation_id, payload.message as UiMessage)
      return
    }

    // Rescate (backend previo al cambio de contrato): re-consulta el timeline.
    // La ventana es una página completa, no 5: con 5, una ráfaga del contacto
    // dejaba el mensaje fuera del resultado y se descartaba en silencio.
    try {
      const res = await getConversationMessages(payload.conversation_id, { limit: RESCUE_LIMIT })
      const incoming = res.data.find((m) => m.id === payload.message_id)
      if (incoming) {
        applyIncoming(payload.conversation_id, incoming as UiMessage)
        return
      }
      // No estaba ni en la última página: el hilo tiene un hueco real.
      console.warn(
        `[inbox] mensaje ${payload.message_id} ausente del timeline; resincronizando el hilo`,
      )
      void store.getState().resyncMessages(payload.conversation_id)
    } catch (error) {
      // Un fallo aquí (429 del throttler, 401 durante el refresh, red) dejaba
      // el hilo desfasado de forma PERMANENTE mientras la lista sí se
      // actualizaba: el síntoma clásico. Ahora se resincroniza.
      console.warn("[inbox] fallo al rescatar el mensaje entrante:", error)
      void store.getState().resyncMessages(payload.conversation_id)
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
      applyIncoming(payload.conversation_id, payload.message as UiMessage)
    }
  })

  useSocketEvent(socket, "conversation.message_sent", async (payload) => {
    const state = store.getState()
    state.confirmMessage(payload.conversation_id, payload.message_id)
    state.bumpConversation(payload.conversation_id)
    // Robustez: si el created se perdió (reconexión), el mensaje no está en
    // el timeline abierto → mismo refetch dirigido que message_received.
    if (state.selectedId !== payload.conversation_id) return
    // Se relee el estado: `confirmMessage` acaba de mutarlo y el snapshot de
    // arriba puede no reflejar el mensaje ya reconciliado.
    const known = store
      .getState()
      .messagesById[payload.conversation_id]?.items.some((m) => m.id === payload.message_id)
    if (known) return

    try {
      const res = await getConversationMessages(payload.conversation_id, { limit: RESCUE_LIMIT })
      const sent = res.data.find((m) => m.id === payload.message_id)
      if (sent) {
        store.getState().appendMessage(payload.conversation_id, sent as UiMessage)
        return
      }
      void store.getState().resyncMessages(payload.conversation_id)
    } catch (error) {
      console.warn("[inbox] fallo al rescatar el mensaje enviado:", error)
      void store.getState().resyncMessages(payload.conversation_id)
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

  // --- Contexto del contacto (rail) ----------------------------------------
  // El backend NO emite `contact.updated`: si la IA captura la dirección con
  // `save_contact_data` o un operador edita la ficha, no llega nada. Lo que sí
  // llega son estos eventos, que traen `contact_id` y bastan para invalidar el
  // panel abierto.
  useSocketEvent(socket, "contact.lifecycle_changed", (payload) => {
    store.getState().bumpContactContext(payload.contact_id)
  })
  useSocketEvent(socket, "contact.merged", (payload) => {
    store.getState().bumpContactContext(payload.contact_id)
  })

  // Fuentes del historial 360 (actividades, oportunidades, pedidos). Todas
  // traen `contact_id`, así que el bump es directo: el panel abierto re-consulta
  // y los demás contactos no se tocan.
  useSocketEvent(socket, "crm.activity_created", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.task_completed", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.deal_created", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.deal_updated", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.deal_stage_changed", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.deal_won", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.deal_lost", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "crm.deal_stalled", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "order.created", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "order.status_changed", (p) => store.getState().bumpContactContext(p.contact_id))
  useSocketEvent(socket, "order.payment_reported", (p) => store.getState().bumpContactContext(p.contact_id))

  // F15: el AuthProvider (único listener) frena el tiempo real y muestra la
  // pantalla bloqueante. dispatchEvent es síncrono: el halt ocurre antes de
  // que socket.io procese la desconexión forzada que sigue al evento.
  useSocketEvent(socket, "company.suspended", (payload) => {
    // El reason del backend distingue trial vencido de suspensión manual
    const code =
      payload.reason === "trial_expired"
        ? API_ERROR_CODES.trialExpired
        : API_ERROR_CODES.companySuspended
    window.dispatchEvent(new CustomEvent(COMPANY_SUSPENDED_EVENT, { detail: code }))
  })

  // --- Join/leave de la conversación activa --------------------------------

  const selectedId = useInboxStore((s) => s.selectedId)
  const selectedIdRef = useRef<string | null>(selectedId)
  selectedIdRef.current = selectedId

  const join = useCallback(
    (conversationId: string) => {
      if (!socket) return
      socketManager
        .emitWithAck(socket, "inbox.join_conversation", { conversation_id: conversationId })
        .then((ack) => {
          // Se marca como unido SOLO tras el ack: fijarlo antes daba por bueno
          // un join que falló (RBAC, timeout) y nunca se reintentaba.
          if (ack.ok) joinedRef.current = conversationId
        })
        .catch(() => {
          // Timeout: `joinedRef` queda sin fijar, así que el próximo ciclo
          // (nueva selección o reconexión) lo reintenta.
        })
    },
    [socket],
  )

  // Join/leave siguiendo la conversación seleccionada.
  useEffect(() => {
    if (!socket || !connected) return

    if (joinedRef.current && joinedRef.current !== selectedId) {
      const leaving = joinedRef.current
      joinedRef.current = null
      socketManager
        .emitWithAck(socket, "inbox.leave_conversation", { conversation_id: leaving })
        .catch(() => { /* leave best-effort */ })
    }
    if (selectedId && joinedRef.current !== selectedId) join(selectedId)
  }, [socket, connected, selectedId, join])

  /**
   * Re-join y resincronización en cada `connect`.
   *
   * Depende SOLO de `socket`, nunca de `connected`: cuando este efecto también
   * dependía del estado de conexión, el ciclo era — `disconnect` → el cleanup
   * quita el listener → el cuerpo sale por el guard `!connected` → el `connect`
   * llega sin nadie escuchando. El socket quedaba fuera del room de la
   * conversación de forma permanente (y el token rota cada ~14 min con
   * disconnect+connect, así que pasaba siempre).
   *
   * El resync cierra el otro hueco: los eventos emitidos mientras el socket
   * estaba caído no llegaron a nadie, y el hilo no tenía forma de enterarse.
   */
  useEffect(() => {
    if (!socket) return

    const onConnect = () => {
      const conversationId = selectedIdRef.current
      if (!conversationId) return
      join(conversationId)
      void store.getState().resyncMessages(conversationId)
    }
    const onDisconnect = () => {
      // La membresía del room muere con la conexión: olvidarla obliga a
      // re-joinear en lugar de dar por hecho que sigue vigente.
      joinedRef.current = null
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [socket, join, store])

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

  // Memoizado: `InboxView` re-renderiza con cada mensaje, y un objeto nuevo en
  // cada render invalidaba los `useCallback` que lo reciben (`useSendMessage`).
  const commands = useMemo(() => ({
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
  }), [emit])

  return { connected, commands }
}

export type InboxCommands = ReturnType<typeof useInboxSocket>["commands"]
export type { WsAck }
