import { create } from "zustand"
import { errorMessage } from "@/core/lib/error-messages"
import {
  getConversation,
  getConversationMessages,
  getInboxCounts,
  listInboxConversations,
} from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import {
  tabToQuery,
  type ConversationDTO,
  type InboxConversation,
  type InboxCounts,
  type InboxTab,
  type Message,
  type UiMessage,
} from "@/modules/inbox/domain/inbox"
import type { AudioTranscription, ConversationHandoffEvent, TypingEvent } from "@/core/realtime/events"

/**
 * Store del inbox. Los datos entran por REST (listas, historial con cursor)
 * y se mantienen vivos con los eventos del namespace WS `/inbox`.
 *
 * Mensajería optimista: `sendOptimistic` inserta un mensaje `pending` con
 * `local_id`; el ack del comando lo reconcilia con el id real (`queued`) y
 * el evento `conversation.message_sent` lo confirma. Un timeout lo marca
 * `failed` con reintento manual.
 */
const SEND_CONFIRM_TIMEOUT_MS = 15_000
/**
 * Tras marcar un audio como "transcribiendo", si no llega `message_updated`
 * en este margen se limpia el flag (STT deshabilitado o fallo silencioso) y la
 * burbuja queda solo con el player.
 */
const TRANSCRIBE_TIMEOUT_MS = 30_000
/**
 * Media entrante: el attachment lo persiste un job aparte DESPUÉS de
 * `message_received` y el backend no emite un evento de "media lista". Se
 * reintenta el fetch con este backoff acotado hasta que aparezca el attachment.
 */
const MEDIA_RESOLVE_DELAYS_MS = [800, 1_500, 3_000, 5_000, 8_000]
/** Ids con un bucle de resolución en curso (evita relanzarlo por varios eventos). */
const resolvingMedia = new Set<string>()
/**
 * Página que se pide al resincronizar el hilo. Cubre de sobra cualquier ráfaga
 * entre el hueco y la recuperación.
 */
const MESSAGES_PAGE_SIZE = 50
/**
 * Generación de la última petición de mensajes por conversación. Una respuesta
 * de una petición anterior (cambio rápido de conversación, reintento lento) se
 * descarta en vez de pisar el estado actual.
 */
const messagesRequestSeq = new Map<string, number>()

type MessagesState = {
  items: UiMessage[]
  next_cursor?: string
  loaded: boolean
}

type InboxStore = {
  // Lista
  tab: InboxTab
  conversations: InboxConversation[]
  total: number
  page: number
  loadingList: boolean
  counts: InboxCounts | null
  error: string | null

  // Conversación activa
  selectedId: string | null
  selected: ConversationDTO | null
  messagesById: Record<string, MessagesState>
  typingByConversation: Record<string, string[]> // user_ids escribiendo

  // Acciones de datos
  setTab: (tab: InboxTab) => void
  fetchConversations: (page?: number) => Promise<void>
  fetchCounts: () => Promise<void>
  select: (id: string | null) => Promise<void>
  refreshSelected: () => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  fetchOlderMessages: (conversationId: string) => Promise<void>
  /**
   * Re-consulta la última página y la fusiona con lo que ya hay en memoria.
   * Es el mecanismo de recuperación del hilo: cualquier delta perdido (evento
   * que no llegó, re-fetch fallido, socket caído) se rellena aquí. Idempotente
   * y silencioso ante error — quien lo llama no depende de su resultado.
   */
  resyncMessages: (conversationId: string) => Promise<void>

  // Mensajería optimista (F9: media con previews locales y payload de retry)
  sendOptimistic: (
    conversationId: string,
    input: {
      content_type: Message["content_type"]
      body: string | null
      local_previews?: UiMessage["local_previews"]
      local_payload?: UiMessage["local_payload"]
    },
  ) => string
  reconcileSent: (conversationId: string, localId: string, real: Message | UiMessage) => void
  markSendFailed: (conversationId: string, localId: string) => void
  /** F9.1: fallo reportado por el backend (message_status) — por id REAL. */
  markMessageFailed: (conversationId: string, messageId: string) => void
  appendMessage: (conversationId: string, message: UiMessage) => void
  /** Reemplaza un mensaje por id con datos frescos de servidor (attachments), preservando lo local. */
  upsertMessage: (conversationId: string, message: UiMessage) => void
  /** Media entrante sin attachment: reintenta el fetch hasta que el backend lo persista. */
  resolvePendingMedia: (conversationId: string, messageId: string) => void
  confirmMessage: (conversationId: string, messageId: string) => void
  /** STT: audio inbound en vivo esperando su transcripción (indicador + timeout). */
  markTranscribing: (conversationId: string, messageId: string) => void
  /** STT: transcripción lista — merge en `payload` y limpieza del flag efímero. */
  applyTranscription: (
    conversationId: string,
    messageId: string,
    transcription: AudioTranscription,
  ) => void

  /**
   * Contador por contacto que invalida los paneles del rail de contexto.
   * El backend no emite `contact.updated`, así que el refresco lo disparan los
   * eventos que SÍ traen `contact_id` (`contact.*`, `crm.*`, `order.*`).
   */
  contextVersion: Record<string, number>
  bumpContactContext: (contactId: string) => void

  // Reducers de eventos WS
  onHandoffEvent: (event: ConversationHandoffEvent) => void
  onTyping: (event: TypingEvent) => void
  bumpConversation: (conversationId: string) => void
}

const PAGE_SIZE = 25

export const useInboxStore = create<InboxStore>((set, get) => ({
  tab: "all_open",
  conversations: [],
  total: 0,
  page: 1,
  loadingList: false,
  counts: null,
  error: null,

  selectedId: null,
  selected: null,
  messagesById: {},
  typingByConversation: {},
  contextVersion: {},

  bumpContactContext: (contactId) =>
    set((state) => ({
      contextVersion: {
        ...state.contextVersion,
        [contactId]: (state.contextVersion[contactId] ?? 0) + 1,
      },
    })),

  setTab: (tab) => {
    set({ tab, page: 1 })
    void get().fetchConversations(1)
  },

  fetchConversations: async (page = get().page) => {
    set({ loadingList: true, error: null })
    try {
      const res = await listInboxConversations({ page, page_size: PAGE_SIZE, ...tabToQuery(get().tab) })
      set({ conversations: res.data, total: res.meta.total, page })
    } catch (err) {
      set({ error: errorMessage(err, "No se pudo cargar el inbox") })
    } finally {
      set({ loadingList: false })
    }
  },

  fetchCounts: async () => {
    try {
      set({ counts: await getInboxCounts() })
    } catch {
      // Los badges no rompen la vista.
    }
  },

  select: async (id) => {
    set({ selectedId: id, selected: null })
    if (!id) return
    try {
      const conversation = await getConversation(id)
      // Evita pisar una selección más reciente (carrera de clicks).
      if (get().selectedId === id) set({ selected: conversation })
      // Siempre, aunque ya estuviera cargada: el hilo en memoria puede tener
      // huecos (un evento que no llegó mientras estaba cerrada, un delta
      // descartado). `fetchMessages` fusiona, así que reabrir nunca pierde los
      // optimistas en vuelo.
      await get().fetchMessages(id)
    } catch (err) {
      set({ error: errorMessage(err, "No se pudo cargar la conversación") })
    }
  },

  refreshSelected: async () => {
    const id = get().selectedId
    if (!id) return
    try {
      const conversation = await getConversation(id)
      if (get().selectedId === id) set({ selected: conversation })
    } catch {
      // La próxima interacción reintenta.
    }
  },

  fetchMessages: async (conversationId) => {
    try {
      await loadLatestMessages(conversationId, set)
    } catch (err) {
      set({ error: errorMessage(err, "No se pudieron cargar los mensajes") })
    }
  },

  resyncMessages: async (conversationId) => {
    // Solo sobre un hilo ya abierto: si nunca se cargó, lo hará `select`.
    if (!get().messagesById[conversationId]?.loaded) return
    try {
      await loadLatestMessages(conversationId, set)
    } catch {
      // Recuperación de fondo: no se pinta banner de error (sería ruido para
      // algo que el usuario no pidió). El próximo evento o reapertura reintenta.
    }
  },

  fetchOlderMessages: async (conversationId) => {
    const current = get().messagesById[conversationId]
    if (!current?.next_cursor) return
    try {
      const res = await getConversationMessages(conversationId, { cursor: current.next_cursor, limit: 50 })
      set((state) => {
        const existing = state.messagesById[conversationId]
        if (!existing) return state
        return {
          messagesById: {
            ...state.messagesById,
            [conversationId]: {
              ...existing,
              items: [...[...res.data].reverse(), ...existing.items],
              next_cursor: res.next_cursor,
            },
          },
        }
      })
    } catch {
      // El scroll-up puede reintentar.
    }
  },

  sendOptimistic: (conversationId, input) => {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: UiMessage = {
      id: localId,
      local_id: localId,
      direction: "outbound",
      sender_type: "user",
      sender_user_id: null,
      content_type: input.content_type,
      body: input.body,
      payload: null,
      provider_message_id: null,
      status: "queued",
      status_updated_at: null,
      error: null,
      attachments: [],
      created_at: new Date().toISOString(),
      delivery: "pending",
      local_previews: input.local_previews,
      local_payload: input.local_payload,
    }
    get().appendMessage(conversationId, optimistic)

    // Sin confirmación en 15s → failed (retry manual en la UI).
    setTimeout(() => {
      const messages = get().messagesById[conversationId]?.items ?? []
      const still = messages.find((m) => m.local_id === localId && m.delivery === "pending")
      if (still) get().markSendFailed(conversationId, localId)
    }, SEND_CONFIRM_TIMEOUT_MS)

    return localId
  },

  reconcileSent: (conversationId, localId, real) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      // F9.1: si el evento message_created llegó ANTES del ack, el mensaje
      // real ya está en el timeline → se elimina el optimista (no duplicar)
      const realId = (real as UiMessage).id
      if (current.items.some((m) => m.id === realId && m.local_id !== localId)) {
        return {
          messagesById: {
            ...state.messagesById,
            [conversationId]: {
              ...current,
              items: current.items.filter((m) => m.local_id !== localId),
            },
          },
        }
      }
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.local_id === localId
                ? {
                    ...(real as UiMessage),
                    attachments: (real as UiMessage).attachments ?? [],
                    local_id: localId,
                    delivery: "pending",
                    // Media (F9): el preview local y el payload de retry
                    // sobreviven a la reconciliación (evita el flash mientras
                    // el attachment real resuelve su URL firmada)
                    local_previews: m.local_previews,
                    local_payload: m.local_payload,
                  }
                : m,
            ),
          },
        },
      }
    })
  },

  markSendFailed: (conversationId, localId) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.local_id === localId ? { ...m, status: "failed", delivery: "failed" } : m,
            ),
          },
        },
      }
    })
  },

  markMessageFailed: (conversationId, messageId) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.id === messageId ? { ...m, status: "failed", delivery: "failed" } : m,
            ),
          },
        },
      }
    })
  },

  appendMessage: (conversationId, message) => {
    set((state) => {
      const current = state.messagesById[conversationId] ?? { items: [], loaded: false }
      // Dedupe por id (el WS puede repetir tras un re-join).
      if (current.items.some((m) => m.id === message.id)) return state
      const last = current.items[current.items.length - 1]
      // Camino normal (el mensaje es el más reciente): append directo. Solo se
      // reordena cuando llega fuera de orden — un rescate tardío o dos eventos
      // casi simultáneos — para no pagar el sort en cada mensaje.
      const items =
        last === undefined || Date.parse(message.created_at) >= Date.parse(last.created_at)
          ? [...current.items, message]
          : sortByCreatedAt([...current.items, message])
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: { ...current, items },
        },
      }
    })
  },

  upsertMessage: (conversationId, message) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      if (!current.items.some((m) => m.id === message.id)) {
        // No estaba: append normal (mismo dedupe implícito por el some de arriba).
        return {
          messagesById: {
            ...state.messagesById,
            [conversationId]: { ...current, items: [...current.items, message] },
          },
        }
      }
      // Reemplazo en su posición: campos de servidor (attachments, status, body…)
      // sobre los locales/efímeros que la UI ya tenía; conserva la transcripción
      // ya mergeada en payload si el nuevo payload no la trae.
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) => {
              if (m.id !== message.id) return m
              const prevTranscription =
                typeof m.payload === "object" && m.payload !== null
                  ? (m.payload as { transcription?: unknown }).transcription
                  : undefined
              const nextPayload =
                typeof message.payload === "object" && message.payload !== null
                  ? message.payload
                  : m.payload
              const payload =
                prevTranscription !== undefined &&
                typeof nextPayload === "object" &&
                nextPayload !== null &&
                (nextPayload as { transcription?: unknown }).transcription === undefined
                  ? { ...(nextPayload as object), transcription: prevTranscription }
                  : nextPayload
              return {
                ...message,
                payload,
                // Preserva lo local/efímero de la UI.
                local_id: m.local_id,
                local_previews: m.local_previews,
                local_payload: m.local_payload,
                delivery: m.delivery,
                transcription_pending: m.transcription_pending,
                media_pending: false,
              }
            }),
          },
        },
      }
    })
  },

  resolvePendingMedia: (conversationId, messageId) => {
    const key = `${conversationId}:${messageId}`
    if (resolvingMedia.has(key)) return
    resolvingMedia.add(key)

    // Enciende el estado pendiente (skeleton en vez de "no disponible todavía").
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.id === messageId ? { ...m, media_pending: true } : m,
            ),
          },
        },
      }
    })

    const clearPending = () => {
      resolvingMedia.delete(key)
      set((state) => {
        const current = state.messagesById[conversationId]
        if (!current) return state
        return {
          messagesById: {
            ...state.messagesById,
            [conversationId]: {
              ...current,
              items: current.items.map((m) =>
                m.id === messageId ? { ...m, media_pending: false } : m,
              ),
            },
          },
        }
      })
    }

    // Cada intento espera su propio delay antes de refetchear (backoff acotado).
    const attempt = (index: number) => {
      setTimeout(() => {
        void (async () => {
          try {
            const res = await getConversationMessages(conversationId, { limit: 10 })
            const fresh = res.data.find((m) => m.id === messageId)
            if (fresh && fresh.attachments.length > 0) {
              get().upsertMessage(conversationId, fresh as UiMessage)
              resolvingMedia.delete(key)
              return
            }
          } catch {
            // Reintentamos igual; el próximo fetch completo lo trae al reabrir.
          }
          if (index + 1 < MEDIA_RESOLVE_DELAYS_MS.length) {
            attempt(index + 1)
          } else {
            clearPending() // agotados los reintentos → cae a MediaUnavailable
          }
        })()
      }, MEDIA_RESOLVE_DELAYS_MS[index])
    }

    attempt(0)
  },

  confirmMessage: (conversationId, messageId) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.id === messageId ? { ...m, status: "sent", delivery: "confirmed" } : m,
            ),
          },
        },
      }
    })
  },

  markTranscribing: (conversationId, messageId) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      if (!current) return state
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.id === messageId ? { ...m, transcription_pending: true } : m,
            ),
          },
        },
      }
    })
    // Failsafe: si el STT está deshabilitado o falla en silencio, no dejamos el
    // indicador colgado indefinidamente.
    setTimeout(() => {
      set((state) => {
        const current = state.messagesById[conversationId]
        if (!current) return state
        const target = current.items.find((m) => m.id === messageId)
        if (!target?.transcription_pending) return state
        return {
          messagesById: {
            ...state.messagesById,
            [conversationId]: {
              ...current,
              items: current.items.map((m) =>
                m.id === messageId ? { ...m, transcription_pending: false } : m,
              ),
            },
          },
        }
      })
    }, TRANSCRIBE_TIMEOUT_MS)
  },

  applyTranscription: (conversationId, messageId, transcription) => {
    set((state) => {
      const current = state.messagesById[conversationId]
      const doneText = transcription.status === "done" ? transcription.text : undefined
      // Preview en vivo de la lista: si el audio transcrito sigue siendo el
      // último mensaje (preview `[audio]` o ya con 🎤), refleja el texto.
      const conversations =
        doneText != null
          ? state.conversations.map((c) => {
              if (c.id !== conversationId) return c
              const preview = c.last_message_preview?.trim()
              const isLastAudio = preview === "[audio]" || preview?.startsWith("🎤")
              return isLastAudio ? { ...c, last_message_preview: `🎤 ${doneText}` } : c
            })
          : state.conversations

      if (!current) return { conversations }
      return {
        conversations,
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            ...current,
            items: current.items.map((m) => {
              if (m.id !== messageId) return m
              const basePayload =
                typeof m.payload === "object" && m.payload !== null ? m.payload : {}
              return {
                ...m,
                payload: { ...basePayload, transcription },
                transcription_pending: false,
              }
            }),
          },
        },
      }
    })
  },

  onHandoffEvent: (event) => {
    // Actualiza la fila si está en la lista y la conversación abierta.
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === event.conversation_id
          ? { ...c, status: event.status, mode: event.mode, assigned_user_id: event.assigned_user_id }
          : c,
      ),
      selected:
        state.selected?.id === event.conversation_id
          ? { ...state.selected, status: event.status, mode: event.mode, assigned_user_id: event.assigned_user_id }
          : state.selected,
    }))
    // La pertenencia a tabs pudo cambiar → re-fetch de lista y counts.
    void get().fetchConversations()
    void get().fetchCounts()
  },

  onTyping: (event) => {
    set((state) => {
      const current = state.typingByConversation[event.conversation_id] ?? []
      const next = event.is_typing
        ? current.includes(event.user_id) ? current : [...current, event.user_id]
        : current.filter((id) => id !== event.user_id)
      return {
        typingByConversation: { ...state.typingByConversation, [event.conversation_id]: next },
      }
    })
  },

  bumpConversation: (conversationId) => {
    // Un mensaje entrante puede pertenecer a una conversación fuera de la
    // página actual: re-fetch barato de lista + counts.
    void get().fetchConversations()
    void get().fetchCounts()
    if (get().selectedId === conversationId) void get().refreshSelected()
  },
}))

type SetState = (
  partial: (state: InboxStore) => Partial<InboxStore>,
) => void

/**
 * Trae la última página del timeline y la FUSIONA con lo que hay en memoria.
 *
 * Dos garantías que el reemplazo en bloque no daba:
 * - **Anti-race**: si mientras la petición vuela se dispara otra para la misma
 *   conversación (cambio rápido de selección, resync solapado), la respuesta
 *   vieja se descarta en vez de pisar la nueva.
 * - **Sin lost update**: los mensajes que llegaron por WS durante el vuelo y
 *   los optimistas aún sin reconciliar sobreviven.
 *
 * Propaga el error: cada llamador decide si lo pinta (`fetchMessages`) o lo
 * traga (`resyncMessages`, recuperación de fondo).
 */
async function loadLatestMessages(conversationId: string, set: SetState): Promise<void> {
  const generation = (messagesRequestSeq.get(conversationId) ?? 0) + 1
  messagesRequestSeq.set(conversationId, generation)

  const res = await getConversationMessages(conversationId, { limit: MESSAGES_PAGE_SIZE })
  if (messagesRequestSeq.get(conversationId) !== generation) return

  set((state) => {
    const current = state.messagesById[conversationId]
    // El backend devuelve el timeline del más reciente al más viejo.
    const fresh = [...res.data].reverse() as UiMessage[]
    return {
      messagesById: {
        ...state.messagesById,
        [conversationId]: {
          items: mergeMessages(current?.items ?? [], fresh),
          next_cursor: res.next_cursor,
          loaded: true,
        },
      },
    }
  })
}

/**
 * Une el timeline en memoria con una página del servidor, ordenado por
 * `created_at`.
 *
 * - La versión del servidor gana sobre la local en los ids que coinciden
 *   (trae attachments resueltos, status real), pero conserva lo que solo vive
 *   en el cliente: el `local_id` y los previews de media, para que la burbuja
 *   no parpadee mientras el attachment resuelve su URL firmada.
 * - Los optimistas sin id real (`local-…`, aún no reconciliados) se conservan
 *   siempre: el servidor todavía no los conoce.
 */
function mergeMessages(current: UiMessage[], fresh: UiMessage[]): UiMessage[] {
  if (current.length === 0) return fresh
  const freshById = new Map(fresh.map((m) => [m.id, m]))
  const merged: UiMessage[] = []

  for (const local of current) {
    const server = freshById.get(local.id)
    if (!server) {
      merged.push(local)
      continue
    }
    merged.push({
      ...server,
      local_id: local.local_id,
      local_previews: local.local_previews,
      local_payload: local.local_payload,
      delivery: local.delivery,
    })
    freshById.delete(local.id)
  }
  // Lo que el servidor tiene y el cliente no: los deltas perdidos.
  merged.push(...freshById.values())

  return sortByCreatedAt(merged)
}

/** Orden estable por `created_at`; empates por id para que no baile entre renders. */
function sortByCreatedAt(messages: UiMessage[]): UiMessage[] {
  return [...messages].sort((a, b) => {
    const diff = Date.parse(a.created_at) - Date.parse(b.created_at)
    if (diff !== 0 && !Number.isNaN(diff)) return diff
    return a.id.localeCompare(b.id)
  })
}
