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

  it("marca failed si no hay confirmación en 15s", () => {
    useInboxStore.getState().sendOptimistic(CID, { content_type: "text", body: "hola" })
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

    await jest.advanceTimersByTimeAsync(800) // 1er intento (vacío)
    await jest.advanceTimersByTimeAsync(1_500) // 2º intento (con attachment)

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
    await jest.advanceTimersByTimeAsync(800 + 1_500 + 3_000 + 5_000 + 8_000 + 100)

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
