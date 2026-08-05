import { act, render } from "@testing-library/react"
import { useInboxSocket } from "../use-inbox-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

/**
 * Socket falso: registra listeners como el real y permite disparar eventos
 * (incluidos `connect`/`disconnect`) desde el test.
 */
function makeFakeSocket() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const socket = {
    connected: true,
    on(event: string, listener: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener)
    },
    off(event: string, listener: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(listener)
    },
    emitServer(event: string, payload?: unknown) {
      if (event === "connect") socket.connected = true
      if (event === "disconnect") socket.connected = false
      // Copia: un listener puede darse de baja durante el despacho.
      for (const listener of [...(listeners.get(event) ?? [])]) listener(payload)
    },
    listenerCount(event: string) {
      return listeners.get(event)?.size ?? 0
    },
  }
  return socket
}

const fakeSocket = makeFakeSocket()
// El factory de jest.mock se iza: solo puede tocar bindings con prefijo `mock`.
const mockSocketRef = { current: fakeSocket }

/**
 * `useSocket` con el MISMO ciclo de estado que el real: `connected` es estado de
 * React alimentado por los eventos del socket. Reproducirlo importa — el bug
 * del re-join solo aparece cuando `connected` pasa a false y provoca el
 * re-render que ejecuta el cleanup del efecto.
 */
jest.mock("@/core/realtime/use-socket", () => {
  const actual = jest.requireActual("@/core/realtime/use-socket")
  const React = jest.requireActual("react") as typeof import("react")
  return {
    ...actual,
    useSocket: () => {
      const socket = mockSocketRef.current
      const [connected, setConnected] = React.useState(socket.connected)
      React.useEffect(() => {
        const onConnect = () => setConnected(true)
        const onDisconnect = () => setConnected(false)
        socket.on("connect", onConnect)
        socket.on("disconnect", onDisconnect)
        return () => {
          socket.off("connect", onConnect)
          socket.off("disconnect", onDisconnect)
        }
      }, [socket])
      return { socket, connected }
    },
  }
})

const emitWithAck = jest.fn()
jest.mock("@/core/realtime/socket-manager", () => ({
  socketManager: {
    emitWithAck: (...args: unknown[]) => emitWithAck(...args),
  },
}))

jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  listInboxConversations: jest.fn(async () => ({
    data: [],
    meta: { total: 0, page: 1, page_size: 25 },
  })),
  getInboxCounts: jest.fn(async () => ({ queued: 0, mine: 0, ai: 0, all_open: 0, unread_total: 0 })),
  getConversation: jest.fn(async () => null),
  getConversationMessages: jest.fn(),
}))

const { getConversationMessages } = jest.requireMock(
  "@/modules/inbox/infrastructure/services/inbox-service.adapter",
) as { getConversationMessages: jest.Mock }

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
    created_at: "2026-08-05T00:00:00Z",
    ...overrides,
  }
}

function Harness() {
  useInboxSocket()
  return null
}

beforeEach(() => {
  fakeSocket.connected = true
  emitWithAck.mockReset().mockResolvedValue({ ok: true, data: null })
  getConversationMessages.mockReset()
  jest.spyOn(console, "warn").mockImplementation(() => {})
  useInboxStore.setState({
    conversations: [],
    messagesById: { [CID]: { items: [], loaded: true } },
    typingByConversation: {},
    selected: null,
    selectedId: CID,
  })
})

afterEach(() => jest.restoreAllMocks())

describe("useInboxSocket — mensaje entrante", () => {
  it("pinta el mensaje directo del evento, sin re-consultar el timeline", async () => {
    render(<Harness />)

    await act(async () => {
      fakeSocket.emitServer("conversation.message_received", {
        conversation_id: CID,
        message_id: "m1",
        company_id: "co1",
        content_type: "text",
        message: makeMessage(),
      })
    })

    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual(["m1"])
    expect(getConversationMessages).not.toHaveBeenCalled()
  })

  it("sin `message` en el payload (backend previo) rescata del timeline", async () => {
    getConversationMessages.mockResolvedValue({ data: [makeMessage()] })
    render(<Harness />)

    await act(async () => {
      fakeSocket.emitServer("conversation.message_received", {
        conversation_id: CID,
        message_id: "m1",
        company_id: "co1",
        content_type: "text",
      })
    })

    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual(["m1"])
  })

  /**
   * Antes: el mensaje se descartaba en silencio y el hilo quedaba desfasado de
   * forma permanente mientras la lista sí se actualizaba.
   */
  it("si el rescate falla, resincroniza el hilo en vez de descartar", async () => {
    getConversationMessages
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce({ data: [makeMessage()] })
    render(<Harness />)

    await act(async () => {
      fakeSocket.emitServer("conversation.message_received", {
        conversation_id: CID,
        message_id: "m1",
        company_id: "co1",
        content_type: "text",
      })
    })

    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual(["m1"])
  })

  it("si el mensaje no está ni en la página rescatada, resincroniza", async () => {
    getConversationMessages
      .mockResolvedValueOnce({ data: [makeMessage({ id: "otro" })] })
      .mockResolvedValueOnce({ data: [makeMessage({ id: "otro" }), makeMessage({ id: "m1" })] })
    render(<Harness />)

    await act(async () => {
      fakeSocket.emitServer("conversation.message_received", {
        conversation_id: CID,
        message_id: "m1",
        company_id: "co1",
        content_type: "text",
      })
    })

    expect(getConversationMessages).toHaveBeenCalledTimes(2)
    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toContain("m1")
  })
})

describe("useInboxSocket — re-join tras reconexión", () => {
  /**
   * Regresión: el listener de `connect` vivía en un efecto que dependía del
   * estado de conexión, así que su cleanup lo quitaba justo antes de la
   * desconexión y el `connect` posterior llegaba sin nadie escuchando. El
   * socket quedaba fuera del room de la conversación de forma permanente (y el
   * token rota cada ~14 min con disconnect+connect, así que pasaba siempre).
   */
  it("vuelve a unirse a la conversación y resincroniza el hilo al reconectar", async () => {
    getConversationMessages.mockResolvedValue({ data: [makeMessage({ id: "perdido" })] })
    render(<Harness />)
    await act(async () => {})

    emitWithAck.mockClear()
    getConversationMessages.mockClear()

    // En dos `act` separados a propósito: entre la caída y la reconexión React
    // re-renderiza (`connected` pasa a false) y ejecuta los cleanups. Ahí es
    // donde el código anterior perdía el listener de `connect`.
    await act(async () => {
      fakeSocket.emitServer("disconnect")
    })
    await act(async () => {
      fakeSocket.emitServer("connect")
    })

    expect(emitWithAck).toHaveBeenCalledWith(fakeSocket, "inbox.join_conversation", {
      conversation_id: CID,
    })
    // El hilo también se resincroniza: los eventos emitidos con el socket
    // caído no llegaron a nadie.
    expect(getConversationMessages).toHaveBeenCalled()
    expect(useInboxStore.getState().messagesById[CID].items.map((m) => m.id)).toEqual(["perdido"])
  })

  it("un join sin ack ok no se da por bueno: se reintenta al reconectar", async () => {
    emitWithAck.mockResolvedValue({ ok: false, error: { code: "conversations/forbidden", message: "" } })
    render(<Harness />)
    await act(async () => {})
    emitWithAck.mockClear().mockResolvedValue({ ok: true, data: null })

    await act(async () => {
      fakeSocket.emitServer("connect")
    })

    expect(emitWithAck).toHaveBeenCalledWith(fakeSocket, "inbox.join_conversation", {
      conversation_id: CID,
    })
  })

  it("al desmontar no deja listeners colgando en el socket compartido", async () => {
    const { unmount } = render(<Harness />)
    await act(async () => {})
    expect(fakeSocket.listenerCount("connect")).toBeGreaterThan(0)

    unmount()

    expect(fakeSocket.listenerCount("connect")).toBe(0)
    expect(fakeSocket.listenerCount("disconnect")).toBe(0)
  })
})
