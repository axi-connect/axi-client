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
import type { ConversationHandoffEvent, TypingEvent } from "@/core/realtime/events"

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
  confirmMessage: (conversationId: string, messageId: string) => void

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
      if (!get().messagesById[id]?.loaded) await get().fetchMessages(id)
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
      const res = await getConversationMessages(conversationId, { limit: 50 })
      set((state) => ({
        messagesById: {
          ...state.messagesById,
          [conversationId]: {
            // El backend devuelve el timeline del más reciente al más viejo.
            items: [...res.data].reverse(),
            next_cursor: res.next_cursor,
            loaded: true,
          },
        },
      }))
    } catch (err) {
      set({ error: errorMessage(err, "No se pudieron cargar los mensajes") })
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
      return {
        messagesById: {
          ...state.messagesById,
          [conversationId]: { ...current, items: [...current.items, message] },
        },
      }
    })
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
