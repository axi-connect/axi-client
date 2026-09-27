import { act, fireEvent, render, screen } from "@testing-library/react"
import { InboxList } from "../../InboxList"
import { resetListRefreshSchedulerForTests, useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => false }),
}))
jest.mock("@/modules/inbox/infrastructure/services/inbox-filter-options", () => ({
  getInboxChannels: jest.fn(async () => []),
}))
jest.mock("@/modules/crm/public", () => ({
  getTenantUsers: jest.fn(async () => []),
}))
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  listInboxConversations: jest.fn(),
  getInboxCounts: jest.fn(async () => ({ queued: 0, mine: 0, ai: 0, all_open: 60, unread_total: 0 })),
  getConversation: jest.fn(async () => null),
  getConversationMessages: jest.fn(async () => ({ data: [] })),
}))

const { listInboxConversations, getInboxCounts } = jest.requireMock(
  "@/modules/inbox/infrastructure/services/inbox-service.adapter",
) as { listInboxConversations: jest.Mock; getInboxCounts: jest.Mock }

/**
 * El polyfill de `IntersectionObserver` de jest.setup es inerte: aquí se
 * instala uno que captura el callback para disparar la intersección a mano.
 */
let intersect: ((entries: { isIntersecting: boolean }[]) => void) | null = null
class FakeIO {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    intersect = callback
  }
  observe() {}
  disconnect() {
    intersect = null
  }
  unobserve() {}
}

const page = (from: number, count: number, total: number, pageNo: number) => ({
  data: Array.from({ length: count }, (_, i) => ({
    id: `c${String(from + i)}`,
    channel_id: "ch",
    contact_id: "k",
    status: "open",
    mode: "ai_active",
    assigned_user_id: null,
    priority: "normal",
    unread_count: 0,
    last_message_at: "2026-09-10T10:00:00Z",
    last_inbound_at: null,
    last_message_preview: `mensaje ${String(from + i)}`,
    queued_at: null,
    closed_at: null,
    contact: { id: "k", full_name: `Contacto ${String(from + i)}`, phone: null, avatar_url: null },
    channel: { id: "ch", name: "WhatsApp", kind: "whatsapp_cloud" },
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  })),
  meta: { total, page: pageNo, page_size: 25 },
})

beforeEach(() => {
  ;(globalThis as { IntersectionObserver: unknown }).IntersectionObserver = FakeIO
  intersect = null
  listInboxConversations.mockReset()
  resetListRefreshSchedulerForTests()
  useInboxStore.setState({
    view: "all_open",
    sort: "recent",
    q: "",
    filters: {},
    conversations: [],
    total: 0,
    page: 1,
    hasMore: true,
    loadingList: false,
    loadingMore: false,
    listError: null,
    listLoaded: false,
    selectedId: null,
    selected: null,
  })
})

describe("InboxList — scroll infinito", () => {
  it("carga la página 1, muestra el contador y al intersectar el sentinel añade la página 2", async () => {
    listInboxConversations
      .mockResolvedValueOnce(page(1, 25, 60, 1))
      .mockResolvedValueOnce(page(26, 25, 60, 2))
    render(<InboxList />)
    await act(async () => {})

    expect(screen.getAllByRole("listitem")).toHaveLength(25)
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Mostrando 25 de 60")
    expect(intersect).not.toBeNull()

    await act(async () => {
      intersect?.([{ isIntersecting: true }])
    })
    expect(listInboxConversations).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    expect(screen.getAllByRole("listitem")).toHaveLength(50)
    expect(screen.getByText(/Mostrando 50 de 60/)).toBeInTheDocument()
  })

  it("sin más páginas no hay sentinel y lo dice el pie", async () => {
    listInboxConversations.mockResolvedValueOnce(page(1, 3, 3, 1))
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getByText(/Mostrando 3 de 3 · No hay más conversaciones/)).toBeInTheDocument()
    expect(intersect).toBeNull()
  })

  it("error en la primera carga: estado con Reintentar que vuelve a pedir", async () => {
    listInboxConversations.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(page(1, 1, 1, 1))
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getByText("No pudimos leer el inbox")).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    })
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
  })

  it("búsqueda sin resultados: «Limpiar búsqueda» vacía la búsqueda y recarga", async () => {
    listInboxConversations.mockResolvedValue(page(1, 0, 0, 1))
    useInboxStore.setState({ q: "nadie" })
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getByText("Ninguna coincide")).toBeInTheDocument()
    expect(screen.getByText(/No hay conversaciones con «nadie» en esta vista/)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }))
    })
    expect(useInboxStore.getState().q).toBe("")
    expect(listInboxConversations).toHaveBeenLastCalledWith(expect.not.objectContaining({ q: expect.anything() }))
  })

  it("las cinco vistas son un radiogroup; cambiar a Cerradas pide resolved,closed", async () => {
    listInboxConversations.mockResolvedValue(page(1, 0, 0, 1))
    render(<InboxList />)
    await act(async () => {})
    const group = screen.getByRole("radiogroup", { name: "Vistas del inbox" })
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(5)
    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: /Cerradas/ }))
    })
    expect(listInboxConversations).toHaveBeenLastCalledWith(expect.objectContaining({ status: "resolved,closed" }))
    expect(screen.getByText("Aún no hay conversaciones cerradas")).toBeInTheDocument()
  })

  it("la cabecera titula la vista y dice cuántas hay (la frase viva sale de counts)", async () => {
    listInboxConversations.mockResolvedValue(page(1, 0, 0, 1))
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getByRole("heading", { level: 1, name: "Todas abiertas" })).toBeInTheDocument()
    expect(screen.getByText("60 abiertas · 0 con Axi, 60 con el equipo, 0 en cola")).toBeInTheDocument()
  })

  it("En cola vacía: «Nadie espera» y, si Axi atiende, el camino a su vista", async () => {
    listInboxConversations.mockResolvedValue(page(1, 0, 0, 1))
    getInboxCounts.mockResolvedValueOnce({ queued: 0, mine: 0, ai: 4, all_open: 4, unread_total: 0 })
    useInboxStore.setState({ view: "queued" })
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getAllByText("Nadie espera").length).toBeGreaterThan(0)
    expect(screen.getByText("Axi atiende 4 conversaciones. Si pasa una al equipo, aparece aquí.")).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ver lo que atiende Axi" }))
    })
    expect(useInboxStore.getState().view).toBe("ai")
  })

  it("pintar 50 filas no dispara peticiones por fila (N+1): una lista y nada más por conversación", async () => {
    const adapter = jest.requireMock("@/modules/inbox/infrastructure/services/inbox-service.adapter") as Record<string, jest.Mock>
    listInboxConversations.mockResolvedValueOnce(page(1, 50, 50, 1))
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getAllByRole("listitem")).toHaveLength(50)
    expect(listInboxConversations).toHaveBeenCalledTimes(1)
    expect(adapter.getConversation).not.toHaveBeenCalled()
    expect(adapter.getConversationMessages).not.toHaveBeenCalled()
  })

  it("IB1-H2, los dos signos: sin primera respuesta, silueta y nada de vacío; con la respuesta vacía, el vacío", async () => {
    let resolve: (value: unknown) => void = () => {}
    listInboxConversations.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    render(<InboxList />)
    await act(async () => {})
    expect(screen.getByRole("status", { name: "Cargando conversaciones" })).toBeInTheDocument()
    expect(screen.queryByText("No hay conversaciones abiertas")).not.toBeInTheDocument()
    await act(async () => {
      resolve(page(1, 0, 0, 1))
    })
    expect(screen.getByText("No hay conversaciones abiertas")).toBeInTheDocument()
    expect(screen.queryByRole("status", { name: "Cargando conversaciones" })).not.toBeInTheDocument()
  })
})
