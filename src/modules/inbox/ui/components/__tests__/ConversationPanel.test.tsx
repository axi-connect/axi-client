import { render, screen } from "@testing-library/react"
import { ConversationPanel } from "../ConversationPanel"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { ConversationDTO, UiMessage } from "@/modules/inbox/domain/inbox"

jest.mock("../composer/Composer", () => ({ Composer: () => <div data-testid="composer" /> }))
jest.mock("../header/ConversationHeader", () => ({ ConversationHeader: () => <div data-testid="header" /> }))
jest.mock("@/modules/inbox/infrastructure/realtime/use-send-message", () => ({
  useSendMessage: () => ({ send: jest.fn(), retry: jest.fn() }),
}))
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getAttachmentUrl: jest.fn(),
  getConversationMessages: jest.fn(async () => ({ data: [] })),
  listInboxConversations: jest.fn(async () => ({ data: [], meta: { total: 0, page: 1, page_size: 25 } })),
  getInboxCounts: jest.fn(async () => ({ queued: 0, mine: 0, ai: 0, all_open: 0, unread_total: 0 })),
  getConversation: jest.fn(),
}))

const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString()
const now = new Date()
const today = local(now.getFullYear(), now.getMonth() + 1, now.getDate(), 9)
const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9)
const yesterday = yesterdayDate.toISOString()

function conversation(overrides: Partial<ConversationDTO> = {}): ConversationDTO {
  return {
    id: "c1",
    status: "open",
    mode: "human_active",
    unread_count: 0,
    last_message_at: today,
    closed_at: null,
    queued_at: null,
    contact: { id: "k", full_name: "Ana", phone: null, avatar_url: null },
    channel: { id: "ch", name: "WhatsApp", kind: "whatsapp_cloud" },
    ...overrides,
  } as ConversationDTO
}
const message = (id: string, created_at: string): UiMessage =>
  ({ id, direction: "inbound", sender_type: "contact", content_type: "text", body: `msg ${id}`, status: "received", attachments: [], payload: null, created_at }) as UiMessage

const commands = { markRead: jest.fn(async () => ({ ok: true, data: null })) } as never

describe("ConversationPanel — solo lectura y separadores de día", () => {
  beforeEach(() => {
    ;(commands as { markRead: jest.Mock }).markRead.mockClear()
  })

  it("cerrada: sin composer, con el pie de solo lectura y sin mark_read", () => {
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ status: "closed", unread_count: 2, closed_at: today }),
      messagesById: { c1: { items: [message("m1", today)], loaded: true } },
      typingByConversation: {},
    })
    render(<ConversationPanel commands={commands} socketConnected />)
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/Conversación cerrada el/)
    expect((commands as { markRead: jest.Mock }).markRead).not.toHaveBeenCalled()
  })

  it("abierta con no leídos: composer presente y mark_read optimista", () => {
    useInboxStore.setState({
      selectedId: "c1",
      selected: conversation({ unread_count: 2 }),
      conversations: [],
      messagesById: { c1: { items: [message("m1", yesterday), message("m2", today)], loaded: true } },
      typingByConversation: {},
    })
    render(<ConversationPanel commands={commands} socketConnected />)
    expect(screen.getByTestId("composer")).toBeInTheDocument()
    expect((commands as { markRead: jest.Mock }).markRead).toHaveBeenCalledWith("c1")
    expect(useInboxStore.getState().selected?.unread_count).toBe(0)
    // Un separador por día
    expect(screen.getByRole("heading", { name: "Ayer" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Hoy" })).toBeInTheDocument()
  })
})
