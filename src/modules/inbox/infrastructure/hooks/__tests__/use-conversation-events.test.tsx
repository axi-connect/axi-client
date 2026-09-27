import { act, renderHook } from "@testing-library/react"
import { EVENTS_TICK_MS, mergeEvents, useConversationEvents } from "../use-conversation-events"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { ConversationEvent } from "@/modules/inbox/domain/inbox"

jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getConversationEvents: jest.fn(),
}))
const { getConversationEvents } = jest.requireMock("@/modules/inbox/infrastructure/services/inbox-service.adapter") as {
  getConversationEvents: jest.Mock
}

const ev = (id: string, created_at: string): ConversationEvent =>
  ({ id, conversation_id: "c1", type: "claimed", actor_type: "user", actor_user_id: null, payload: null, created_at }) as ConversationEvent

async function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state })
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

beforeEach(async () => {
  jest.useFakeTimers()
  getConversationEvents.mockReset().mockResolvedValue({ data: [ev("a", "2026-09-26T14:00:00Z")] })
  useInboxStore.setState({ eventsVersion: {} })
  await setVisibility("visible")
})
afterEach(() => jest.useRealTimers())

describe("useConversationEvents — note_added y priority_changed NO son en vivo", () => {
  it("abrir hace 1; cada minuto visible suma 1; oculta no suma; volver a visible suma 1 de inmediato", async () => {
    renderHook(() => useConversationEvents("c1"))
    await act(async () => {})
    expect(getConversationEvents).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(EVENTS_TICK_MS)
    })
    expect(getConversationEvents).toHaveBeenCalledTimes(2)

    await setVisibility("hidden")
    await act(async () => {
      jest.advanceTimersByTime(EVENTS_TICK_MS * 3)
    })
    expect(getConversationEvents).toHaveBeenCalledTimes(2)

    await setVisibility("visible")
    expect(getConversationEvents).toHaveBeenCalledTimes(3)
  })

  it("un aviso del socket (eventsVersion) relee en el acto; el de otra conversación, no", async () => {
    renderHook(() => useConversationEvents("c1"))
    await act(async () => {})
    await act(async () => {
      useInboxStore.getState().bumpEvents("otra")
    })
    expect(getConversationEvents).toHaveBeenCalledTimes(1)
    await act(async () => {
      useInboxStore.getState().bumpEvents("c1")
    })
    expect(getConversationEvents).toHaveBeenCalledTimes(2)
  })

  it("sin conversación no pide nada; al cambiar de conversación empieza de cero", async () => {
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useConversationEvents(id), { initialProps: { id: null as string | null } })
    await act(async () => {})
    expect(getConversationEvents).not.toHaveBeenCalled()
    rerender({ id: "c1" })
    await act(async () => {})
    expect(result.current.events.map((e) => e.id)).toEqual(["a"])
    getConversationEvents.mockResolvedValueOnce({ data: [ev("b", "2026-09-26T15:00:00Z")] })
    rerender({ id: "c2" })
    await act(async () => {})
    expect(result.current.events.map((e) => e.id)).toEqual(["b"])
  })

  it("reachBack pagina con el cursor hasta cubrir el mensaje más viejo", async () => {
    getConversationEvents
      .mockReset()
      .mockResolvedValueOnce({ data: [ev("n", "2026-09-26T14:00:00Z")], next_cursor: "n" })
      .mockResolvedValueOnce({ data: [ev("o", "2026-09-25T10:00:00Z")], next_cursor: "o" })
      .mockResolvedValueOnce({ data: [ev("p", "2026-09-20T10:00:00Z")], next_cursor: undefined })
    const { result } = renderHook(() => useConversationEvents("c1"))
    await act(async () => {})
    await act(async () => {
      result.current.reachBack("2026-09-24T00:00:00Z")
    })
    expect(getConversationEvents).toHaveBeenNthCalledWith(2, "c1", expect.objectContaining({ cursor: "n" }))
    expect(getConversationEvents).toHaveBeenNthCalledWith(3, "c1", expect.objectContaining({ cursor: "o" }))
    expect(result.current.events.map((e) => e.id).sort()).toEqual(["n", "o", "p"])
  })

  it("mergeEvents une por id sin duplicar", () => {
    expect(mergeEvents([ev("a", "t")], [ev("a", "t"), ev("b", "t")]).map((e) => e.id)).toEqual(["a", "b"])
  })
})
