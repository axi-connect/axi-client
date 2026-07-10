import { useInboxStore } from "../inbox.store"
import type { UiMessage } from "@/modules/inbox/domain/inbox"
import type { ConversationHandoffEvent } from "@/core/realtime/events"

// Los reducers puros del store se prueban sin red: se stubbean los fetchers.
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  listInboxConversations: jest.fn(async () => ({ data: [], meta: { total: 0, page: 1, page_size: 25 } })),
  getInboxCounts: jest.fn(async () => ({ queued: 0, mine: 0, ai: 0, all_open: 0, unread_total: 0 })),
  getConversation: jest.fn(),
  getConversationMessages: jest.fn(),
}))

const CID = "c1"

function makeMessage(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    id: "m1",
    direction: "inbound",
    sender_type: "contact",
    sender_user_id: null,
    content_type: "text",
    body: "hola",
    payload: null,
    provider_message_id: null,
    status: "received",
    status_updated_at: null,
    error: null,
    attachments: [],
    created_at: "2026-07-09T00:00:00Z",
    ...overrides,
  }
}

beforeEach(() => {
  useInboxStore.setState({
    conversations: [],
    messagesById: {},
    typingByConversation: {},
    selected: null,
    selectedId: null,
  })
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("inbox.store — mensajería optimista", () => {
  it("sendOptimistic inserta un mensaje pending con local_id", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, "hola mundo")
    const items = useInboxStore.getState().messagesById[CID].items

    expect(items).toHaveLength(1)
    expect(items[0].local_id).toBe(localId)
    expect(items[0].delivery).toBe("pending")
    expect(items[0].body).toBe("hola mundo")
    expect(items[0].direction).toBe("outbound")
  })

  it("reconcileSent reemplaza el optimista por el mensaje real del ack", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, "hola")
    const real = makeMessage({ id: "real-1", direction: "outbound", sender_type: "user", status: "queued", body: "hola" })

    useInboxStore.getState().reconcileSent(CID, localId, real)
    const items = useInboxStore.getState().messagesById[CID].items

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe("real-1")
    expect(items[0].local_id).toBe(localId) // conserva la clave estable de render
    expect(items[0].delivery).toBe("pending") // hasta conversation.message_sent
  })

  it("confirmMessage marca sent/confirmed al llegar conversation.message_sent", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, "hola")
    useInboxStore.getState().reconcileSent(CID, localId, makeMessage({ id: "real-1", direction: "outbound", status: "queued" }))

    useInboxStore.getState().confirmMessage(CID, "real-1")
    const [message] = useInboxStore.getState().messagesById[CID].items

    expect(message.status).toBe("sent")
    expect(message.delivery).toBe("confirmed")
  })

  it("marca failed si no hay confirmación en 15s", () => {
    useInboxStore.getState().sendOptimistic(CID, "hola")
    jest.advanceTimersByTime(15_001)

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.delivery).toBe("failed")
    expect(message.status).toBe("failed")
  })

  it("appendMessage deduplica por id (re-join del WS)", () => {
    const incoming = makeMessage({ id: "dup" })
    useInboxStore.getState().appendMessage(CID, incoming)
    useInboxStore.getState().appendMessage(CID, incoming)

    expect(useInboxStore.getState().messagesById[CID].items).toHaveLength(1)
  })
})

describe("inbox.store — eventos de handoff y typing", () => {
  it("onHandoffEvent actualiza fila y conversación seleccionada", () => {
    useInboxStore.setState({
      conversations: [
        { id: CID, mode: "human_queued", status: "open", assigned_user_id: null } as never,
      ],
      selected: { id: CID, mode: "human_queued", status: "open", assigned_user_id: null } as never,
    })

    const event: ConversationHandoffEvent = {
      conversation_id: CID,
      company_id: "co1",
      status: "open",
      mode: "human_active",
      assigned_user_id: "u1",
      actor_user_id: "u1",
    }
    useInboxStore.getState().onHandoffEvent(event)

    const state = useInboxStore.getState()
    expect(state.conversations[0].mode).toBe("human_active")
    expect(state.conversations[0].assigned_user_id).toBe("u1")
    expect(state.selected?.mode).toBe("human_active")
  })

  it("onTyping agrega y quita usuarios sin duplicar", () => {
    const on = { conversation_id: CID, user_id: "u1", is_typing: true }
    useInboxStore.getState().onTyping(on)
    useInboxStore.getState().onTyping(on)
    expect(useInboxStore.getState().typingByConversation[CID]).toEqual(["u1"])

    useInboxStore.getState().onTyping({ ...on, is_typing: false })
    expect(useInboxStore.getState().typingByConversation[CID]).toEqual([])
  })
})
