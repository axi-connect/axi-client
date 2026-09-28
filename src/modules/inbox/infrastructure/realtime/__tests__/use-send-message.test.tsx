import { act, renderHook } from "@testing-library/react"
import { HttpError } from "@/core/api/problem"
import { useSendMessage } from "../use-send-message"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useWindowRejections } from "@/modules/inbox/infrastructure/hooks/use-reply-window"

const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({ sendMessageRest: jest.fn() }))
const { sendMessageRest } = jest.requireMock("@/modules/inbox/infrastructure/services/inbox-service.adapter") as { sendMessageRest: jest.Mock }

const LAST_INBOUND = "2026-09-27T12:00:00Z"

beforeEach(() => {
  showAlert.mockClear()
  useWindowRejections.setState({ byConversation: {} })
  useInboxStore.setState({
    conversations: [],
    selectedId: "c1",
    selected: { id: "c1", last_inbound_at: LAST_INBOUND } as never,
    messagesById: { c1: { items: [], loaded: true, next_cursor: null } as never },
  })
})

describe("useSendMessage — manda el servidor sobre la ventana (F3)", () => {
  it("un ack con channels/outside_service_window cierra la ventana con el last_inbound_at de ese momento y lo dice", async () => {
    const commands = { sendMessage: jest.fn(async () => ({ ok: false, error: { code: "channels/outside_service_window", message: "Fuera" } })) }
    const { result } = renderHook(() => useSendMessage("c1", commands as never, true))
    await act(async () => {
      await result.current.send({ kind: "text", body: "hola" })
    })
    expect(useWindowRejections.getState().byConversation.c1).toBe(LAST_INBOUND)
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "La ventana de 24 h está cerrada: el mensaje no salió" }))
    expect(useInboxStore.getState().messagesById.c1?.items[0]).toMatchObject({ delivery: "failed" })
  })

  it("por HTTP (sin socket) el HttpError con el mismo código hace lo mismo", async () => {
    sendMessageRest.mockRejectedValueOnce(new HttpError({ status: 422, code: "channels/outside_service_window", message: "Fuera" }))
    const { result } = renderHook(() => useSendMessage("c1", {} as never, false))
    await act(async () => {
      await result.current.send({ kind: "text", body: "hola" })
    })
    expect(useWindowRejections.getState().byConversation.c1).toBe(LAST_INBOUND)
  })

  it("otro error no toca la ventana y deja su propio mensaje", async () => {
    const commands = { sendMessage: jest.fn(async () => ({ ok: false, error: { code: "conversations/rate_limited", message: "Muy rápido" } })) }
    const { result } = renderHook(() => useSendMessage("c1", commands as never, true))
    await act(async () => {
      await result.current.send({ kind: "text", body: "hola" })
    })
    expect(useWindowRejections.getState().byConversation.c1).toBeUndefined()
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Muy rápido" }))
  })
})
