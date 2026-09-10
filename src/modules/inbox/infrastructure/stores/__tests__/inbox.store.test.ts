import { resetListRefreshSchedulerForTests, useInboxStore } from "../inbox.store"
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

const { listInboxConversations, getInboxCounts, getConversationMessages } = jest.requireMock(
  "@/modules/inbox/infrastructure/services/inbox-service.adapter",
) as { listInboxConversations: jest.Mock; getInboxCounts: jest.Mock; getConversationMessages: jest.Mock }

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
  resetListRefreshSchedulerForTests()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("inbox.store — mensajería optimista", () => {
  it("sendOptimistic inserta un mensaje pending con local_id", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola mundo" })
    const items = useInboxStore.getState().messagesById[CID].items

    expect(items).toHaveLength(1)
    expect(items[0].local_id).toBe(localId)
    expect(items[0].delivery).toBe("pending")
    expect(items[0].body).toBe("hola mundo")
    expect(items[0].direction).toBe("outbound")
  })

  it("reconcileSent reemplaza el optimista por el mensaje real del ack", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola" })
    const real = makeMessage({ id: "real-1", direction: "outbound", sender_type: "user", status: "queued", body: "hola" })

    useInboxStore.getState().reconcileSent(CID, localId, real)
    const items = useInboxStore.getState().messagesById[CID].items

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe("real-1")
    expect(items[0].local_id).toBe(localId) // conserva la clave estable de render
    expect(items[0].delivery).toBe("pending") // hasta conversation.message_sent
  })

  it("confirmMessage marca sent/confirmed al llegar conversation.message_sent", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola" })
    useInboxStore.getState().reconcileSent(CID, localId, makeMessage({ id: "real-1", direction: "outbound", status: "queued" }))

    useInboxStore.getState().confirmMessage(CID, "real-1")
    const [message] = useInboxStore.getState().messagesById[CID].items

    expect(message.status).toBe("sent")
    expect(message.delivery).toBe("confirmed")
  })

  it("sin ACK en 60 s → failed (el envío nunca se aceptó); a los 15 s todavía no", () => {
    useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola" })
    jest.advanceTimersByTime(15_001)
    expect(useInboxStore.getState().messagesById[CID].items[0].delivery).toBe("pending")

    jest.advanceTimersByTime(45_000)
    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.delivery).toBe("failed")
    expect(message.status).toBe("failed")
  })

  it("con ACK pero sin confirmación en 60 s NO se marca failed: se re-consulta el hilo y decide el servidor", async () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola" })
    useInboxStore.getState().reconcileSent(CID, localId, makeMessage({ id: "real-1", direction: "outbound", status: "queued" }))
    useInboxStore.setState((state) => ({
      messagesById: { ...state.messagesById, [CID]: { ...state.messagesById[CID], loaded: true } },
    }))
    // El servidor ya lo envió (la confirmación WS se perdió): el resync lo trae como sent
    getConversationMessages.mockResolvedValueOnce({
      data: [makeMessage({ id: "real-1", direction: "outbound", status: "sent" })],
    })

    await jest.advanceTimersByTimeAsync(60_001)

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.delivery).toBe("confirmed")
    expect(message.status).toBe("sent")
  })

  it("appendMessage deduplica por id (re-join del WS)", () => {
    const incoming = makeMessage({ id: "dup" })
    useInboxStore.getState().appendMessage(CID, incoming)
    useInboxStore.getState().appendMessage(CID, incoming)

    expect(useInboxStore.getState().messagesById[CID].items).toHaveLength(1)
  })

  it("F9.1: message_created llegó antes del ack → reconcileSent elimina el optimista (sin duplicado)", () => {
    const localId = useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola" })
    // El evento realtime insertó el mensaje REAL antes de que llegara el ack
    const real = makeMessage({ id: "real-9", direction: "outbound", sender_type: "user", status: "queued", body: "hola" })
    useInboxStore.getState().appendMessage(CID, real)
    expect(useInboxStore.getState().messagesById[CID].items).toHaveLength(2)

    useInboxStore.getState().reconcileSent(CID, localId, real)

    const items = useInboxStore.getState().messagesById[CID].items
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe("real-9")
  })

  it("F9.1: markMessageFailed marca failed por id real (evento message_status)", () => {
    const real = makeMessage({ id: "real-10", direction: "outbound", status: "queued" })
    useInboxStore.getState().appendMessage(CID, real)

    useInboxStore.getState().markMessageFailed(CID, "real-10")

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.status).toBe("failed")
    expect(message.delivery).toBe("failed")
  })

  it("media optimista (F9): reconcileSent preserva previews locales y payload de retry", () => {
    const preview = { object_url: "blob:x", mime_type: "image/png", filename: "foto.png", size_bytes: 10 }
    const payload = { type: "media" as const, upload_id: "up-1", caption: "mira" }
    const localId = useInboxStore.getState().sendOptimistic(CID, {
      content_type: "image",
      body: "mira",
      local_previews: [preview],
      local_payload: payload,
    })

    // El 202/ack del backend trae el attachment real pero SIN previews locales
    const real = makeMessage({
      id: "real-media-1",
      direction: "outbound",
      content_type: "image",
      status: "queued",
      body: "mira",
      attachments: [{ id: "a1", filename: "foto.png", mime_type: "image/png", size_bytes: 10 }],
    })
    useInboxStore.getState().reconcileSent(CID, localId, real)

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.id).toBe("real-media-1")
    expect(message.local_previews).toEqual([preview]) // sin flash del thumbnail
    expect(message.local_payload).toEqual(payload) // retry sin re-subir
    expect(message.attachments).toHaveLength(1)
  })
})

describe("inbox.store — media entrante sin attachment (resolvePendingMedia)", () => {
  const getConversationMessages = jest.requireMock(
    "@/modules/inbox/infrastructure/services/inbox-service.adapter",
  ).getConversationMessages as jest.Mock

  const withAttachment = (id: string) =>
    makeMessage({
      id,
      content_type: "image",
      body: null,
      attachments: [{ id: "att-1", filename: "foto.png", mime_type: "image/png", size_bytes: 10 }],
    })

  afterEach(() => getConversationMessages.mockReset())

  it("upsertMessage reemplaza attachments por id preservando local_previews y transcripción", () => {
    const preview = { object_url: "blob:x", mime_type: "image/png", filename: "f.png", size_bytes: 1 }
    useInboxStore.getState().appendMessage(
      CID,
      makeMessage({
        id: "up-1",
        content_type: "audio",
        body: null,
        payload: { transcription: { status: "done", text: "hola" } },
        local_previews: [preview],
      }),
    )

    useInboxStore.getState().upsertMessage(
      CID,
      makeMessage({
        id: "up-1",
        content_type: "audio",
        body: null,
        payload: { media: { id: "m1" } },
        attachments: [{ id: "att-9", filename: "a.ogg", mime_type: "audio/ogg", size_bytes: 5 }],
      }),
    )

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.attachments).toHaveLength(1)
    expect(message.local_previews).toEqual([preview]) // local preservado
    expect((message.payload as { transcription?: unknown }).transcription).toEqual({ status: "done", text: "hola" })
    expect((message.payload as { media?: unknown }).media).toEqual({ id: "m1" })
    expect(message.media_pending).toBe(false)
  })

  it("reintenta el fetch y hace upsert cuando el attachment aparece", async () => {
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "px-1", content_type: "image", body: null }))
    // 1er intento sin attachment, 2º con attachment.
    getConversationMessages
      .mockResolvedValueOnce({ data: [makeMessage({ id: "px-1", content_type: "image", attachments: [] })] })
      .mockResolvedValueOnce({ data: [withAttachment("px-1")] })

    useInboxStore.getState().resolvePendingMedia(CID, "px-1")
    expect(useInboxStore.getState().messagesById[CID].items[0].media_pending).toBe(true)

    await jest.advanceTimersByTimeAsync(4_000) // 1er intento (vacío)
    await jest.advanceTimersByTimeAsync(12_000) // 2º intento (con attachment)

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.attachments).toHaveLength(1)
    expect(message.media_pending).toBe(false)
    expect(getConversationMessages).toHaveBeenCalledTimes(2)
  })

  it("agota los reintentos y baja media_pending (cae a MediaUnavailable)", async () => {
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "px-2", content_type: "image", body: null }))
    getConversationMessages.mockResolvedValue({
      data: [makeMessage({ id: "px-2", content_type: "image", attachments: [] })],
    })

    useInboxStore.getState().resolvePendingMedia(CID, "px-2")
    // Avanza más allá de la suma de todos los delays de backoff.
    await jest.advanceTimersByTimeAsync(4_000 + 12_000 + 30_000 + 100)

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.attachments).toHaveLength(0)
    expect(message.media_pending).toBe(false)
  })

  it("no lanza un segundo bucle para el mismo mensaje", () => {
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "px-3", content_type: "image", body: null }))
    getConversationMessages.mockResolvedValue({ data: [] })

    useInboxStore.getState().resolvePendingMedia(CID, "px-3")
    useInboxStore.getState().resolvePendingMedia(CID, "px-3")

    // Ambas llamadas comparten el mismo bucle (Set de ids en curso); el flag está activo una vez.
    expect(useInboxStore.getState().messagesById[CID].items[0].media_pending).toBe(true)
  })
})

describe("inbox.store — transcripción de audio (STT)", () => {
  it("markTranscribing enciende el flag efímero del audio inbound", () => {
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "au-1", content_type: "audio", body: null }))
    useInboxStore.getState().markTranscribing(CID, "au-1")

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.transcription_pending).toBe(true)
  })

  it("el flag se limpia solo si no llega la transcripción en 30s", () => {
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "au-2", content_type: "audio", body: null }))
    useInboxStore.getState().markTranscribing(CID, "au-2")
    jest.advanceTimersByTime(30_001)

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.transcription_pending).toBe(false)
  })

  it("applyTranscription mergea payload.transcription y apaga el flag pending", () => {
    useInboxStore.getState().appendMessage(
      CID,
      makeMessage({ id: "au-3", content_type: "audio", body: null, payload: { media: { id: "x" } } }),
    )
    useInboxStore.getState().markTranscribing(CID, "au-3")

    useInboxStore.getState().applyTranscription(CID, "au-3", { status: "done", text: "quiero dos pizzas" })

    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.transcription_pending).toBe(false)
    expect(message.payload).toEqual({ media: { id: "x" }, transcription: { status: "done", text: "quiero dos pizzas" } })
  })

  it("applyTranscription actualiza el preview de la lista cuando el audio es el último mensaje", () => {
    useInboxStore.setState({
      conversations: [{ id: CID, last_message_preview: "[audio]" } as never],
    })
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "au-4", content_type: "audio", body: null }))

    useInboxStore.getState().applyTranscription(CID, "au-4", { status: "done", text: "hola qué tal" })

    expect(useInboxStore.getState().conversations[0].last_message_preview).toBe("🎤 hola qué tal")
  })

  it("applyTranscription con status failed no rompe ni cambia el preview", () => {
    useInboxStore.setState({
      conversations: [{ id: CID, last_message_preview: "[audio]" } as never],
    })
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "au-5", content_type: "audio", body: null }))

    useInboxStore.getState().applyTranscription(CID, "au-5", { status: "failed" })

    expect(useInboxStore.getState().conversations[0].last_message_preview).toBe("[audio]")
    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.transcription_pending).toBe(false)
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

/**
 * Regresión del hilo desfasado: el timeline abierto era una caché write-once
 * que se reemplazaba en bloque y no se resincronizaba nunca. Un solo delta
 * perdido dejaba un hueco permanente hasta recargar la página, mientras la
 * lista de conversaciones sí se actualizaba.
 */
describe("inbox.store — resincronización del hilo", () => {
  const { getConversationMessages } = jest.requireMock(
    "@/modules/inbox/infrastructure/services/inbox-service.adapter",
  ) as { getConversationMessages: jest.Mock }

  beforeEach(() => getConversationMessages.mockReset())

  it("fetchMessages fusiona en vez de reemplazar: no pierde lo que llegó por WS", async () => {
    // El hilo ya tiene un mensaje que el servidor todavía no devuelve en su página.
    useInboxStore.setState({
      messagesById: {
        [CID]: {
          items: [makeMessage({ id: "ws-1", created_at: "2026-07-09T00:00:05Z" })],
          loaded: true,
        },
      },
    })
    getConversationMessages.mockResolvedValueOnce({
      data: [makeMessage({ id: "srv-1", created_at: "2026-07-09T00:00:00Z" })],
    })

    await useInboxStore.getState().fetchMessages(CID)

    const items = useInboxStore.getState().messagesById[CID].items
    expect(items.map((m) => m.id)).toEqual(["srv-1", "ws-1"])
  })

  it("conserva los optimistas en vuelo, que el servidor aún no conoce", async () => {
    const localId = useInboxStore
      .getState()
      .sendOptimistic(CID, { content_type: "text", body: "ahí voy" })
    useInboxStore.setState((s) => ({
      messagesById: { [CID]: { ...s.messagesById[CID], loaded: true } },
    }))
    getConversationMessages.mockResolvedValueOnce({
      data: [makeMessage({ id: "srv-1", created_at: "2026-07-09T00:00:00Z" })],
    })

    await useInboxStore.getState().fetchMessages(CID)

    const items = useInboxStore.getState().messagesById[CID].items
    expect(items.some((m) => m.local_id === localId)).toBe(true)
    expect(items.some((m) => m.id === "srv-1")).toBe(true)
  })

  it("la versión del servidor gana en los ids que coinciden, sin perder el preview local", async () => {
    useInboxStore.setState({
      messagesById: {
        [CID]: {
          items: [
            makeMessage({ id: "m1", attachments: [], local_previews: ["blob:local"] as never }),
          ],
          loaded: true,
        },
      },
    })
    getConversationMessages.mockResolvedValueOnce({
      data: [makeMessage({ id: "m1", attachments: [{ id: "att-1" }] as never })],
    })

    await useInboxStore.getState().fetchMessages(CID)

    const [item] = useInboxStore.getState().messagesById[CID].items
    expect(item.attachments).toHaveLength(1)
    expect(item.local_previews).toEqual(["blob:local"])
  })

  it("descarta la respuesta de una petición superada (anti-race)", async () => {
    useInboxStore.setState({ messagesById: { [CID]: { items: [], loaded: true } } })
    let resolveFirst: (value: unknown) => void = () => {}
    getConversationMessages
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce({ data: [makeMessage({ id: "nueva" })] })

    const stale = useInboxStore.getState().fetchMessages(CID)
    await useInboxStore.getState().fetchMessages(CID)
    resolveFirst({ data: [makeMessage({ id: "vieja" })] })
    await stale

    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual(["nueva"])
  })

  it("resyncMessages rellena el hueco y es idempotente", async () => {
    useInboxStore.setState({
      messagesById: { [CID]: { items: [makeMessage({ id: "m1" })], loaded: true } },
    })
    getConversationMessages.mockResolvedValue({
      data: [
        makeMessage({ id: "perdido", created_at: "2026-07-09T00:00:10Z" }),
        makeMessage({ id: "m1" }),
      ],
    })

    await useInboxStore.getState().resyncMessages(CID)
    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual([
      "m1",
      "perdido",
    ])

    await useInboxStore.getState().resyncMessages(CID)
    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual([
      "m1",
      "perdido",
    ])
  })

  it("resyncMessages no pinta banner de error: es recuperación de fondo", async () => {
    useInboxStore.setState({ messagesById: { [CID]: { items: [], loaded: true } }, error: null })
    getConversationMessages.mockRejectedValueOnce(new Error("429"))

    await useInboxStore.getState().resyncMessages(CID)

    expect(useInboxStore.getState().error).toBeNull()
  })

  it("resyncMessages es no-op sobre un hilo que nunca se cargó", async () => {
    await useInboxStore.getState().resyncMessages("sin-cargar")
    expect(getConversationMessages).not.toHaveBeenCalled()
  })

  it("appendMessage ordena por created_at cuando el mensaje llega fuera de orden", () => {
    useInboxStore.setState({
      messagesById: {
        [CID]: {
          items: [makeMessage({ id: "m2", created_at: "2026-07-09T00:00:10Z" })],
          loaded: true,
        },
      },
    })

    useInboxStore
      .getState()
      .appendMessage(CID, makeMessage({ id: "m1", created_at: "2026-07-09T00:00:05Z" }))

    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual(["m1", "m2"])
  })
})

describe("inbox.store — fila en vivo (patchConversation / applyMessageEvent)", () => {
  const row = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      id: "x",
      unread_count: 0,
      last_message_at: "2026-09-10T10:00:00Z",
      last_message_preview: "hola",
      priority: "normal",
      queued_at: null,
      status: "open",
      mode: "ai_active",
      ...overrides,
    }) as never

  beforeEach(() => {
    useInboxStore.setState({
      sort: "recent",
      conversations: [
        row({ id: "a", last_message_at: "2026-09-10T10:00:00Z" }),
        row({ id: "b", last_message_at: "2026-09-10T09:00:00Z", unread_count: 2 }),
      ],
      counts: { queued: 0, mine: 0, ai: 0, all_open: 2, unread_total: 2 },
      selected: row({ id: "b", unread_count: 2 }),
      selectedId: "b",
    })
    listInboxConversations.mockClear()
  })

  it("patchConversation actualiza fila + seleccionada, ajusta unread_total y reordena", () => {
    useInboxStore.getState().patchConversation("b", {
      unread_count: 3,
      last_message_at: "2026-09-10T11:00:00Z",
      last_message_preview: "nuevo",
    })
    const state = useInboxStore.getState()
    expect(state.conversations.map((c) => c.id)).toEqual(["b", "a"]) // b subió (recent)
    expect(state.conversations[0].last_message_preview).toBe("nuevo")
    expect(state.selected?.unread_count).toBe(3)
    expect(state.counts?.unread_total).toBe(3) // 2 → 3
  })

  it("las filas no tocadas conservan su referencia (React.memo)", () => {
    const before = useInboxStore.getState().conversations.find((c) => c.id === "a")
    useInboxStore.getState().patchConversation("b", { unread_count: 5 })
    const after = useInboxStore.getState().conversations.find((c) => c.id === "a")
    expect(after).toBe(before)
  })

  it("una conversación fuera de la lista programa un refresco (puede estar en otra página)", () => {
    useInboxStore.getState().patchConversation("zzz", { unread_count: 1 })
    expect(listInboxConversations).not.toHaveBeenCalled()
    jest.advanceTimersByTime(401)
    expect(listInboxConversations).toHaveBeenCalledTimes(1)
  })

  it("applyMessageEvent con patch del servidor lo aplica; sin patch deriva preview y suma no leído si no está abierta", () => {
    useInboxStore.getState().applyMessageEvent("a", undefined, {
      unread_count: 7,
      last_message_at: "2026-09-10T12:00:00Z",
      last_message_preview: "del servidor",
    })
    expect(useInboxStore.getState().conversations[0]).toMatchObject({ id: "a", unread_count: 7, last_message_preview: "del servidor" })

    useInboxStore.getState().applyMessageEvent(
      "a",
      makeMessage({ id: "m9", body: "derivado", created_at: "2026-09-10T13:00:00Z" }),
    )
    const a = useInboxStore.getState().conversations.find((c) => c.id === "a")
    expect(a).toMatchObject({ unread_count: 8, last_message_preview: "derivado", last_message_at: "2026-09-10T13:00:00Z" })

    // Para la conversación ABIERTA no se suma: la va a leer ahora mismo
    useInboxStore.getState().applyMessageEvent("b", makeMessage({ id: "m10", body: "abierta" }))
    expect(useInboxStore.getState().conversations.find((c) => c.id === "b")?.unread_count).toBe(2)
  })

  it("markReadLocal baja a 0 fila, seleccionada y total; rollbackUnread lo devuelve", () => {
    const previous = useInboxStore.getState().markReadLocal("b")
    expect(previous).toBe(2)
    let state = useInboxStore.getState()
    expect(state.conversations.find((c) => c.id === "b")?.unread_count).toBe(0)
    expect(state.selected?.unread_count).toBe(0)
    expect(state.counts?.unread_total).toBe(0)
    expect(useInboxStore.getState().markReadLocal("b")).toBe(0) // idempotente

    useInboxStore.getState().rollbackUnread("b", previous)
    state = useInboxStore.getState()
    expect(state.conversations.find((c) => c.id === "b")?.unread_count).toBe(2)
    expect(state.counts?.unread_total).toBe(2)
  })

  it("applyUnreadChanged (evento de otra pestaña) no descuenta dos veces tras un optimista", () => {
    useInboxStore.getState().markReadLocal("b")
    useInboxStore.getState().applyUnreadChanged({
      conversation_id: "b",
      company_id: "co",
      unread_count: 0,
      previous_unread_count: 2,
      read_by_user_id: "u1",
    })
    expect(useInboxStore.getState().counts?.unread_total).toBe(0)
  })
})

describe("inbox.store — lista: paginación y refresco", () => {
  const page = (ids: string[], total: number, pageNo: number, size = 25) => ({
    data: ids.map((id) => ({ id, unread_count: 0, last_message_at: null, priority: "normal" }) as never),
    meta: { total, page: pageNo, page_size: size },
  })

  beforeEach(() => {
    listInboxConversations.mockReset()
    useInboxStore.setState({ view: "all_open", sort: "recent", q: "", filters: {}, conversations: [], page: 1, hasMore: true, total: 0 })
  })

  it("fetchFirstPage + loadMore encadenan páginas con dedupe y calculan hasMore", async () => {
    listInboxConversations
      .mockResolvedValueOnce(page(["1", "2"], 5, 1, 2))
      .mockResolvedValueOnce(page(["2", "3"], 5, 2, 2))
      .mockResolvedValueOnce(page(["4"], 5, 3, 2))
    await useInboxStore.getState().fetchFirstPage()
    expect(useInboxStore.getState().hasMore).toBe(true)
    await useInboxStore.getState().loadMore()
    expect(useInboxStore.getState().conversations.map((c) => c.id)).toEqual(["1", "2", "3"])
    expect(useInboxStore.getState().page).toBe(2)
    await useInboxStore.getState().loadMore()
    expect(useInboxStore.getState().conversations.map((c) => c.id)).toEqual(["1", "2", "3", "4"])
    expect(useInboxStore.getState().hasMore).toBe(false)
    await useInboxStore.getState().loadMore() // no-op
    expect(listInboxConversations).toHaveBeenCalledTimes(3)
    expect(listInboxConversations.mock.calls[1][0]).toMatchObject({ page: 2, status: "open", sort: "recent" })
  })

  it("una respuesta de la lista anterior (cambio de vista en vuelo) se descarta", async () => {
    let resolveOld: (value: unknown) => void = () => {}
    listInboxConversations
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce(page(["closed-1"], 1, 1))
    const first = useInboxStore.getState().fetchFirstPage()
    useInboxStore.getState().setView("closed")
    await Promise.resolve()
    resolveOld(page(["open-1"], 1, 1))
    await first
    await Promise.resolve()
    expect(useInboxStore.getState().conversations.map((c) => c.id)).toEqual(["closed-1"])
  })

  it("scheduleListRefresh coalesce N llamadas en UNA petición del tamaño de lo cargado", async () => {
    useInboxStore.setState({
      conversations: Array.from({ length: 60 }, (_, i) => ({ id: String(i), unread_count: 0, last_message_at: null }) as never),
      page: 3,
    })
    listInboxConversations.mockResolvedValue(page(["0"], 100, 1, 60))
    const store = useInboxStore.getState()
    store.scheduleListRefresh()
    store.scheduleListRefresh({ counts: true })
    store.scheduleListRefresh()
    expect(listInboxConversations).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(401)
    expect(listInboxConversations).toHaveBeenCalledTimes(1)
    expect(listInboxConversations.mock.calls[0][0]).toMatchObject({ page: 1, page_size: 60 })
    expect(getInboxCounts).toHaveBeenCalled()
  })

  it("resyncList conserva la cola más allá de la ventana y recalcula la página", async () => {
    useInboxStore.setState({
      conversations: Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, unread_count: 0, last_message_at: null }) as never),
      page: 2,
    })
    listInboxConversations.mockResolvedValue(page(["c1", "c0", "nuevo"], 31, 1, 30))
    await useInboxStore.getState().resyncList()
    const ids = useInboxStore.getState().conversations.map((c) => c.id)
    expect(ids.slice(0, 3)).toEqual(["c1", "c0", "nuevo"])
    expect(ids).toHaveLength(3) // la ventana era 30: no había cola más allá
    expect(useInboxStore.getState().page).toBe(1)
    expect(useInboxStore.getState().hasMore).toBe(true)
  })
})

describe("inbox.store — adjunto listo por evento (applyAttachments)", () => {
  it("pone el attachment, quita el skeleton y corta el sondeo de rescate", async () => {
    useInboxStore.setState({ conversations: [], messagesById: {}, selectedId: CID })
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "px-9", content_type: "image", body: null }))
    getConversationMessages.mockReset().mockResolvedValue({ data: [] })
    useInboxStore.getState().resolvePendingMedia(CID, "px-9")

    useInboxStore.getState().applyAttachments(CID, "px-9", {
      attachments: [{ id: "att", filename: "f.jpg", mime_type: "image/jpeg", size_bytes: 9 }],
      content_type: "image",
    })
    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.attachments).toHaveLength(1)
    expect(message.media_pending).toBe(false)

    await jest.advanceTimersByTimeAsync(4_000 + 12_000 + 30_000 + 100)
    expect(getConversationMessages).not.toHaveBeenCalled()
  })

  it("no descargable: sin attachment, con motivo en payload.media y cuerpo degradado", () => {
    useInboxStore.setState({ conversations: [], messagesById: {} })
    useInboxStore.getState().appendMessage(CID, makeMessage({ id: "px-8", content_type: "video", body: null }))
    useInboxStore.getState().applyAttachments(CID, "px-8", {
      attachments: [],
      content_type: "text",
      body: "[compartió un reel de Instagram — el contenido no se pudo descargar]",
      unavailable_reason: "provider_returned_page",
    })
    const [message] = useInboxStore.getState().messagesById[CID].items
    expect(message.content_type).toBe("text")
    expect(message.body).toMatch(/no se pudo descargar/)
    expect((message.payload as { media: { unavailable_reason: string } }).media.unavailable_reason).toBe("provider_returned_page")
  })
})
