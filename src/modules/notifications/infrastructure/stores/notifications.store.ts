import { create } from "zustand"
import { isHttpError } from "@/core/api/problem"
import { errorMessage } from "@/core/lib/error-messages"
import type { NotificationCreatedEvent } from "@/core/realtime/events"
import {
  fromRealtimeEvent,
  type NotificationDTO,
} from "@/modules/notifications/domain/notification"
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/infrastructure/services/notifications-service.adapter"

/**
 * Store del slice notifications. Los datos base vienen de REST; el hook
 * `use-notifications-realtime` inyecta las nuevas por WS.
 *
 * Las tabs "Todas" / "No leídas" son DOS listas separadas con paginación
 * server-side propia (`unread_only`): filtrar client-side sobre una lista
 * paginada omitiría no-leídas de páginas no cargadas.
 *
 * `unreadCount` es autoritativo desde REST (viene en cada respuesta del list)
 * y se ajusta localmente entre fetches (+1 WS con dedupe, −1 markRead,
 * 0 markAllRead).
 */
const PAGE_SIZE = 20
const MAX_TOASTS = 4
const MUTE_STORAGE_KEY = "axi:notifications:muted"

export type NotificationsTab = "all" | "unread"

export type NotificationsTabState = {
  items: NotificationDTO[]
  /** Última página cargada (0 = ninguna). */
  page: number
  hasMore: boolean
  loading: boolean
  error: string | null
  initialized: boolean
}

type NotificationsStore = {
  tabs: Record<NotificationsTab, NotificationsTabState>
  unreadCount: number
  /** false en SSR; `hydrateMute()` lee localStorage post-mount. */
  muted: boolean
  /** Cola FIFO del toaster (cap MAX_TOASTS: se descarta la más vieja). */
  toasts: NotificationDTO[]

  hydrateMute: () => void
  toggleMute: () => void

  fetchPage: (tab: NotificationsTab, page: number) => Promise<void>
  loadMore: (tab: NotificationsTab) => Promise<void>
  /** Página 1 de las tabs ya inicializadas (reconexión WS, abrir panel). */
  refresh: () => Promise<void>

  /** Devuelve `true` si la notificación era nueva (para disparar el sonido). */
  onNotificationCreated: (evt: NotificationCreatedEvent) => boolean
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  dismissToast: (id: string) => void
}

const emptyTab = (): NotificationsTabState => ({
  items: [],
  page: 0,
  hasMore: true,
  loading: false,
  error: null,
  initialized: false,
})

function dedupeById(items: NotificationDTO[]): NotificationDTO[] {
  const seen = new Set<string>()
  return items.filter((n) => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  tabs: { all: emptyTab(), unread: emptyTab() },
  unreadCount: 0,
  muted: false,
  toasts: [],

  hydrateMute: () => {
    try {
      set({ muted: window.localStorage.getItem(MUTE_STORAGE_KEY) === "1" })
    } catch {
      // localStorage no disponible (modo privado/SSR): queda con sonido.
    }
  },

  toggleMute: () => {
    set((state) => {
      const muted = !state.muted
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0")
      } catch {
        // Sin persistencia: el toggle aplica solo a la sesión actual.
      }
      return { muted }
    })
  },

  fetchPage: async (tab, page) => {
    set((state) => ({
      tabs: { ...state.tabs, [tab]: { ...state.tabs[tab], loading: true, error: null } },
    }))
    try {
      const res = await listNotifications({
        unread_only: tab === "unread" ? true : undefined,
        page,
        page_size: PAGE_SIZE,
      })
      set((state) => {
        const prev = state.tabs[tab]
        // Página 1 reemplaza (el backend persiste antes de emitir el WS, así
        // que no pierde datos); páginas siguientes concatenan con dedupe (un
        // evento WS entre páginas desplaza el offset y puede repetir filas).
        const items = page === 1 ? res.data : dedupeById([...prev.items, ...res.data])
        return {
          tabs: {
            ...state.tabs,
            [tab]: {
              items,
              page,
              hasMore: page * res.meta.page_size < res.meta.total,
              loading: false,
              error: null,
              initialized: true,
            },
          },
          unreadCount: res.unread_count,
        }
      })
    } catch (err) {
      set((state) => ({
        tabs: {
          ...state.tabs,
          [tab]: {
            ...state.tabs[tab],
            loading: false,
            error: errorMessage(err, "No se pudieron cargar las notificaciones"),
          },
        },
      }))
    }
  },

  loadMore: async (tab) => {
    const current = get().tabs[tab]
    if (current.loading || !current.hasMore || !current.initialized) return
    await get().fetchPage(tab, current.page + 1)
  },

  refresh: async () => {
    const { tabs, fetchPage } = get()
    const initialized = (["all", "unread"] as const).filter((tab) => tabs[tab].initialized)
    // Sin nada inicializado (reconexión antes del bootstrap): al menos el badge.
    if (initialized.length === 0) return fetchPage("all", 1)
    await Promise.all(initialized.map((tab) => fetchPage(tab, 1)))
  },

  onNotificationCreated: (evt) => {
    if (get().tabs.all.items.some((n) => n.id === evt.id)) return false
    const notification = fromRealtimeEvent(evt)
    set((state) => ({
      tabs: {
        all: state.tabs.all.initialized
          ? { ...state.tabs.all, items: [notification, ...state.tabs.all.items] }
          : state.tabs.all,
        unread: state.tabs.unread.initialized
          ? { ...state.tabs.unread, items: [notification, ...state.tabs.unread.items] }
          : state.tabs.unread,
      },
      unreadCount: state.unreadCount + 1,
      toasts: [...state.toasts, notification].slice(-MAX_TOASTS),
    }))
    return true
  },

  markRead: async (id) => {
    const state = get()
    const known =
      state.tabs.all.items.find((n) => n.id === id) ??
      state.tabs.unread.items.find((n) => n.id === id)
    if (known?.read_at) return

    const snapshot = { tabs: state.tabs, unreadCount: state.unreadCount }
    const read_at = new Date().toISOString()
    set((s) => ({
      tabs: {
        all: {
          ...s.tabs.all,
          items: s.tabs.all.items.map((n) => (n.id === id ? { ...n, read_at } : n)),
        },
        unread: {
          ...s.tabs.unread,
          items: s.tabs.unread.items.filter((n) => n.id !== id),
        },
      },
      unreadCount: Math.max(0, s.unreadCount - 1),
      toasts: s.toasts.filter((n) => n.id !== id),
    }))

    try {
      await markNotificationRead(id)
    } catch (err) {
      // 404 = ya leída/eliminada en el backend: éxito idempotente.
      if (isHttpError(err) && err.status === 404) return
      set(snapshot)
    }
  },

  markAllRead: async () => {
    const state = get()
    if (state.unreadCount === 0) return

    const snapshot = { tabs: state.tabs, unreadCount: state.unreadCount }
    const read_at = new Date().toISOString()
    set((s) => ({
      tabs: {
        all: {
          ...s.tabs.all,
          items: s.tabs.all.items.map((n) => (n.read_at ? n : { ...n, read_at })),
        },
        unread: { ...s.tabs.unread, items: [], hasMore: false },
      },
      unreadCount: 0,
    }))

    try {
      await markAllNotificationsRead()
    } catch {
      set(snapshot)
    }
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((n) => n.id !== id) }))
  },
}))
