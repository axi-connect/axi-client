import { HttpError } from "@/core/api/problem"
import type { NotificationCreatedEvent } from "@/core/realtime/events"
import type { NotificationDTO } from "@/modules/notifications/domain/notification"
import { useNotificationsStore } from "../notifications.store"

// Los reducers del store se prueban sin red: se stubbea el adapter.
jest.mock(
  "@/modules/notifications/infrastructure/services/notifications-service.adapter",
  () => ({
    listNotifications: jest.fn(),
    markNotificationRead: jest.fn(async () => undefined),
    markAllNotificationsRead: jest.fn(async () => undefined),
  }),
)

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/infrastructure/services/notifications-service.adapter"

const listMock = listNotifications as jest.Mock
const markReadMock = markNotificationRead as jest.Mock
const markAllMock = markAllNotificationsRead as jest.Mock

function makeNotification(overrides: Partial<NotificationDTO> = {}): NotificationDTO {
  return {
    id: "n1",
    type: "conversation.queued",
    title: "Conversación en cola",
    body: "Un cliente espera",
    data: { conversation_id: "c1" },
    read_at: null,
    created_at: "2026-07-11T12:00:00Z",
    ...overrides,
  }
}

function makeEvent(overrides: Partial<NotificationCreatedEvent> = {}): NotificationCreatedEvent {
  return {
    id: "n1",
    type: "conversation.queued",
    title: "Conversación en cola",
    body: "Un cliente espera",
    data: { conversation_id: "c1" },
    created_at: "2026-07-11T12:00:00Z",
    ...overrides,
  }
}

function listResponse(data: NotificationDTO[], total: number, page: number, unread = 0) {
  return { data, meta: { total, page, page_size: 20 }, unread_count: unread }
}

const emptyTab = () => ({
  items: [] as NotificationDTO[],
  page: 0,
  hasMore: true,
  loading: false,
  error: null,
  initialized: false,
})

beforeEach(() => {
  jest.clearAllMocks()
  useNotificationsStore.setState({
    tabs: { all: emptyTab(), unread: emptyTab() },
    unreadCount: 0,
    muted: false,
    toasts: [],
  })
})

describe("notifications.store — fetchPage / loadMore", () => {
  it("página 1 reemplaza items y toma unread_count del backend", async () => {
    listMock.mockResolvedValueOnce(listResponse([makeNotification()], 30, 1, 7))

    await useNotificationsStore.getState().fetchPage("all", 1)

    const { tabs, unreadCount } = useNotificationsStore.getState()
    expect(tabs.all.items).toHaveLength(1)
    expect(tabs.all.initialized).toBe(true)
    expect(tabs.all.hasMore).toBe(true) // 1*20 < 30
    expect(unreadCount).toBe(7)
  })

  it("la tab unread consulta con unread_only=true", async () => {
    listMock.mockResolvedValueOnce(listResponse([], 0, 1))

    await useNotificationsStore.getState().fetchPage("unread", 1)

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ unread_only: true, page: 1 }),
    )
  })

  it("loadMore concatena con dedupe por id (offset desplazado por WS)", async () => {
    listMock.mockResolvedValueOnce(listResponse([makeNotification({ id: "a" })], 25, 1))
    await useNotificationsStore.getState().fetchPage("all", 1)

    // La página 2 repite "a" (una notificación nueva desplazó el offset).
    listMock.mockResolvedValueOnce(
      listResponse([makeNotification({ id: "a" }), makeNotification({ id: "b" })], 25, 2),
    )
    await useNotificationsStore.getState().loadMore("all")

    const { tabs } = useNotificationsStore.getState()
    expect(tabs.all.items.map((n) => n.id)).toEqual(["a", "b"])
    expect(tabs.all.page).toBe(2)
    expect(tabs.all.hasMore).toBe(false) // 2*20 >= 25
  })

  it("loadMore no dispara si está cargando, sin más páginas o sin inicializar", async () => {
    await useNotificationsStore.getState().loadMore("all") // initialized=false
    expect(listMock).not.toHaveBeenCalled()
  })

  it("un error deja mensaje y no marca initialized", async () => {
    listMock.mockRejectedValueOnce(new Error("network"))

    await useNotificationsStore.getState().fetchPage("all", 1)

    const { tabs } = useNotificationsStore.getState()
    expect(tabs.all.error).toBeTruthy()
    expect(tabs.all.initialized).toBe(false)
    expect(tabs.all.loading).toBe(false)
  })
})

describe("notifications.store — onNotificationCreated", () => {
  it("hace prepend en tabs inicializadas, incrementa el badge y encola toast", () => {
    useNotificationsStore.setState((s) => ({
      tabs: {
        all: { ...s.tabs.all, initialized: true, items: [makeNotification({ id: "viejo" })] },
        unread: { ...s.tabs.unread, initialized: true },
      },
      unreadCount: 1,
    }))

    const isNew = useNotificationsStore.getState().onNotificationCreated(makeEvent({ id: "nuevo" }))

    const { tabs, unreadCount, toasts } = useNotificationsStore.getState()
    expect(isNew).toBe(true)
    expect(tabs.all.items.map((n) => n.id)).toEqual(["nuevo", "viejo"])
    expect(tabs.unread.items.map((n) => n.id)).toEqual(["nuevo"])
    expect(tabs.all.items[0].read_at).toBeNull()
    expect(unreadCount).toBe(2)
    expect(toasts.map((n) => n.id)).toEqual(["nuevo"])
  })

  it("dedupe por id: un evento repetido no duplica ni re-cuenta", () => {
    useNotificationsStore.setState((s) => ({
      tabs: { ...s.tabs, all: { ...s.tabs.all, initialized: true, items: [makeNotification()] } },
      unreadCount: 1,
    }))

    const isNew = useNotificationsStore.getState().onNotificationCreated(makeEvent())

    expect(isNew).toBe(false)
    expect(useNotificationsStore.getState().unreadCount).toBe(1)
    expect(useNotificationsStore.getState().toasts).toHaveLength(0)
  })

  it("la cola de toasts respeta el cap FIFO de 4", () => {
    useNotificationsStore.setState((s) => ({
      tabs: { ...s.tabs, all: { ...s.tabs.all, initialized: true } },
    }))
    for (const id of ["t1", "t2", "t3", "t4", "t5"]) {
      useNotificationsStore.getState().onNotificationCreated(makeEvent({ id }))
    }
    expect(useNotificationsStore.getState().toasts.map((n) => n.id)).toEqual([
      "t2",
      "t3",
      "t4",
      "t5",
    ])
  })
})

describe("notifications.store — markRead / markAllRead", () => {
  const seed = () => {
    useNotificationsStore.setState((s) => ({
      tabs: {
        all: {
          ...s.tabs.all,
          initialized: true,
          items: [makeNotification({ id: "a" }), makeNotification({ id: "b" })],
        },
        unread: {
          ...s.tabs.unread,
          initialized: true,
          items: [makeNotification({ id: "a" }), makeNotification({ id: "b" })],
        },
      },
      unreadCount: 2,
      toasts: [makeNotification({ id: "a" })],
    }))
  }

  it("markRead optimista: marca en all, remueve de unread, badge −1 y quita el toast", async () => {
    seed()

    await useNotificationsStore.getState().markRead("a")

    const { tabs, unreadCount, toasts } = useNotificationsStore.getState()
    expect(tabs.all.items.find((n) => n.id === "a")?.read_at).not.toBeNull()
    expect(tabs.unread.items.map((n) => n.id)).toEqual(["b"])
    expect(unreadCount).toBe(1)
    expect(toasts).toHaveLength(0)
    expect(markReadMock).toHaveBeenCalledWith("a")
  })

  it("markRead ignora notificaciones ya leídas", async () => {
    useNotificationsStore.setState((s) => ({
      tabs: {
        ...s.tabs,
        all: {
          ...s.tabs.all,
          initialized: true,
          items: [makeNotification({ id: "a", read_at: "2026-07-11T11:00:00Z" })],
        },
      },
    }))

    await useNotificationsStore.getState().markRead("a")

    expect(markReadMock).not.toHaveBeenCalled()
  })

  it("markRead con 404 mantiene el estado optimista (idempotente)", async () => {
    seed()
    markReadMock.mockRejectedValueOnce(
      new HttpError({ status: 404, code: "notifications/not_found", message: "not found" }),
    )

    await useNotificationsStore.getState().markRead("a")

    const { unreadCount, tabs } = useNotificationsStore.getState()
    expect(unreadCount).toBe(1)
    expect(tabs.unread.items.map((n) => n.id)).toEqual(["b"])
  })

  it("markRead con otro error hace rollback", async () => {
    seed()
    markReadMock.mockRejectedValueOnce(
      new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }),
    )

    await useNotificationsStore.getState().markRead("a")

    const { unreadCount, tabs } = useNotificationsStore.getState()
    expect(unreadCount).toBe(2)
    expect(tabs.unread.items).toHaveLength(2)
    expect(tabs.all.items.find((n) => n.id === "a")?.read_at).toBeNull()
  })

  it("markAllRead optimista: todas leídas y badge en 0; rollback si falla", async () => {
    seed()

    await useNotificationsStore.getState().markAllRead()

    let state = useNotificationsStore.getState()
    expect(state.unreadCount).toBe(0)
    expect(state.tabs.unread.items).toHaveLength(0)
    expect(state.tabs.all.items.every((n) => n.read_at !== null)).toBe(true)
    expect(markAllMock).toHaveBeenCalled()

    // Rollback
    seed()
    markAllMock.mockRejectedValueOnce(new Error("network"))
    await useNotificationsStore.getState().markAllRead()

    state = useNotificationsStore.getState()
    expect(state.unreadCount).toBe(2)
    expect(state.tabs.unread.items).toHaveLength(2)
  })

  it("markAllRead es no-op con badge en 0", async () => {
    await useNotificationsStore.getState().markAllRead()
    expect(markAllMock).not.toHaveBeenCalled()
  })
})
