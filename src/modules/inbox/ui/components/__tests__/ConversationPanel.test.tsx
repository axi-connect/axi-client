import { act, render, screen } from "@testing-library/react"
import { ConversationPanel } from "../ConversationPanel"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { ConversationDTO, ConversationEvent, UiMessage } from "@/modules/inbox/domain/inbox"

jest.mock("../composer/Composer", () => ({
  Composer: ({ unlock }: { unlock: { label: string } | null }) => <div data-testid="composer">{unlock?.label ?? ""}</div>,
}))
jest.mock("../header/ConversationHeader", () => ({ ConversationHeader: () => <div data-testid="header" /> }))
jest.mock("@/modules/inbox/infrastructure/realtime/use-send-message", () => ({
  useSendMessage: () => ({ send: jest.fn(), retry: jest.fn() }),
}))
let permissions: string[] = ["conversations:claim"]
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ user: { id: "me" }, hasPermission: (p: string) => permissions.includes(p) }),
}))
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }))
jest.mock("@/modules/companies/public", () => ({ useMyCompany: () => ({ company: null }) }))
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getAttachmentUrl: jest.fn(),
  getConversationMessages: jest.fn(async () => ({ data: [] })),
  getConversationEvents: jest.fn(async () => ({ data: [] })),
  listInboxConversations: jest.fn(async () => ({ data: [], meta: { total: 0, page: 1, page_size: 25 } })),
  getInboxCounts: jest.fn(async () => ({ queued: 0, mine: 0, ai: 0, all_open: 0, unread_total: 0 })),
  getConversation: jest.fn(),
}))

const { getConversationEvents } = jest.requireMock("@/modules/inbox/infrastructure/services/inbox-service.adapter") as {
  getConversationEvents: jest.Mock
}

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString()
const now = new Date()
const today = local(now.getFullYear(), now.getMonth() + 1, now.getDate(), 9)
const todayAt = (h: number, min: number) => local(now.getFullYear(), now.getMonth() + 1, now.getDate(), h, min)
const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9)
const yesterday = yesterdayDate.toISOString()

function conversation(overrides: Partial<ConversationDTO> = {}): ConversationDTO {
  return {
    id: "c1",
    status: "open",
    mode: "human_active",
    assigned_user_id: "me",
    unread_count: 0,
    last_message_at: today,
    closed_at: null,
    queued_at: null,
    contact: { id: "k", full_name: "Ana", phone: null, avatar_url: null },
    channel: { id: "ch", name: "WhatsApp", kind: "whatsapp_cloud" },
    ...overrides,
  } as ConversationDTO
}
const message = (id: string, created_at: string, over: Partial<UiMessage> = {}): UiMessage =>
  ({ id, direction: "inbound", sender_type: "contact", sender_user_id: null, content_type: "text", body: `msg ${id}`, status: "received", provider_message_id: null, status_updated_at: null, error: null, attachments: [], payload: null, created_at, ...over }) as UiMessage
const event = (id: string, type: ConversationEvent["type"], created_at: string, over: Partial<ConversationEvent> = {}): ConversationEvent =>
  ({ id, conversation_id: "c1", type, actor_type: "ai_agent", actor_user_id: null, payload: null, created_at, ...over }) as ConversationEvent

const commands = { markRead: jest.fn(async () => ({ ok: true, data: null })), claim: jest.fn() } as never

async function renderPanel() {
  render(<ConversationPanel commands={commands} socketConnected />)
  await act(async () => {})
}

describe("ConversationPanel — solo lectura y separadores de día", () => {
  beforeEach(() => {
    ;(commands as { markRead: jest.Mock }).markRead.mockClear()
    getConversationEvents.mockReset().mockResolvedValue({ data: [] })
    permissions = ["conversations:claim"]
  })

  it("cerrada: sin composer, con el pie de solo lectura, quién la cerró y sin mark_read", async () => {
    getConversationEvents.mockResolvedValue({ data: [event("e1", "closed", today, { payload: { status: "closed" } })] })
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ status: "closed", unread_count: 2, closed_at: today }),
      messagesById: { c1: { items: [message("m1", today)], loaded: true } },
      typingByConversation: {},
    })
    await renderPanel()
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument()
    expect(screen.getByText(/Cerrada el/).closest("[role=status]")).toHaveTextContent(/· por Axi · el historial se consulta/)
    expect((commands as { markRead: jest.Mock }).markRead).not.toHaveBeenCalled()
  })

  it("abierta con no leídos: composer presente y mark_read optimista", async () => {
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ unread_count: 2 }),
      conversations: [],
      messagesById: { c1: { items: [message("m1", yesterday), message("m2", today)], loaded: true } },
      typingByConversation: {},
    })
    await renderPanel()
    expect(screen.getByTestId("composer")).toBeInTheDocument()
    expect((commands as { markRead: jest.Mock }).markRead).toHaveBeenCalledWith("c1")
    expect(useInboxStore.getState().selected?.unread_count).toBe(0)
    // Un separador por día
    expect(screen.getByRole("heading", { name: "Ayer" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Hoy" })).toBeInTheDocument()
  })
})

describe("ConversationPanel — F2: por qué está aquí y los eventos en el hilo", () => {
  beforeEach(() => {
    getConversationEvents.mockReset()
    permissions = ["conversations:claim"]
  })

  const escalated = () =>
    event("e1", "escalated", todayAt(9, 28), { payload: { reason: "contact_requested_human" } })

  it("en cola: la isla cuenta el motivo con Atender y Devolver a Axi; la barra del composer ofrece Atender", async () => {
    getConversationEvents.mockResolvedValue({ data: [escalated()] })
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ mode: "human_queued", assigned_user_id: null, queued_at: todayAt(9, 28) }),
      messagesById: { c1: { items: [message("m1", todayAt(9, 27))], loaded: true } },
      typingByConversation: {},
    })
    await renderPanel()
    const island = screen.getByRole("region", { name: "Por qué está aquí" })
    expect(island).toHaveTextContent("El cliente pidió hablar con una persona.")
    expect(island).toHaveTextContent("Atender")
    expect(island).toHaveTextContent("Devolver a Axi")
    expect(screen.getByTestId("composer")).toHaveTextContent("Atender")
    // El evento va en el hilo, después del mensaje que lo causó.
    expect(screen.getByText(/Axi pasó la conversación al equipo: el cliente pidió hablar con una persona/)).toBeInTheDocument()
  })

  it("sin permiso para atender: la isla explica y no ofrece botones", async () => {
    permissions = []
    getConversationEvents.mockResolvedValue({ data: [escalated()] })
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ mode: "human_queued", assigned_user_id: null }),
      messagesById: { c1: { items: [message("m1", todayAt(9, 27))], loaded: true } },
      typingByConversation: {},
    })
    await renderPanel()
    const island = screen.getByRole("region", { name: "Por qué está aquí" })
    expect(island).toHaveTextContent("La atiende quien tenga permiso de atender conversaciones.")
    expect(island.querySelector("button")).toBeNull()
  })

  it("atendida: el motivo se pliega a una línea; lo de Axi y lo tuyo llevan su autor", async () => {
    getConversationEvents.mockResolvedValue({
      data: [event("e2", "claimed", todayAt(9, 43), { actor_type: "user", actor_user_id: "me" }), escalated()],
    })
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ mode: "human_active", assigned_user_id: "me" }),
      messagesById: {
        c1: {
          items: [
            message("m1", todayAt(9, 14), { direction: "outbound", sender_type: "ai_agent" }),
            message("m2", todayAt(9, 44), { direction: "outbound", sender_type: "user", sender_user_id: "me" }),
          ],
          loaded: true,
        },
      },
      typingByConversation: {},
    })
    await renderPanel()
    expect(screen.queryByRole("region", { name: "Por qué está aquí" })).not.toBeInTheDocument()
    expect(screen.getByTitle("Axi te la pasó · El cliente pidió hablar con una persona.")).toBeInTheDocument()
    expect(screen.getByText("Atendiste la conversación", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("Axi")).toBeInTheDocument()
    expect(screen.getByText("Tú")).toBeInTheDocument()
  })

  it("los eventos se piden solo para la conversación abierta, una vez al abrirla", async () => {
    getConversationEvents.mockResolvedValue({ data: [] })
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation(),
      messagesById: { c1: { items: [message("m1", today)], loaded: true } },
      typingByConversation: {},
    })
    await renderPanel()
    expect(getConversationEvents).toHaveBeenCalledTimes(1)
    expect(getConversationEvents).toHaveBeenCalledWith("c1", expect.objectContaining({ limit: 50 }))
  })
})
