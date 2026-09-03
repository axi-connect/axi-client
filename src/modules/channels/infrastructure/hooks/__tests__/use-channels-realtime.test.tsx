import { renderHook } from "@testing-library/react"

import { API_ERROR_CODES, COMPANY_SUSPENDED_EVENT } from "@/core/api/problem"

/** Handlers registrados por nombre de evento: el test los dispara a mano. */
const handlers = new Map<string, (payload: unknown) => void>()
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected: true }),
  useSocketEvent: (_socket: unknown, event: string, handler: (payload: unknown) => void) => {
    handlers.set(event, handler)
  },
}))

const setChannelStatus = jest.fn()
jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: (selector: (state: unknown) => unknown) => selector({ setChannelStatus }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useChannelsRealtime } = require("../use-channels-realtime") as typeof import("../use-channels-realtime")

/**
 * El único puente entre el namespace `/channels` y el store. Sin spec hasta
 * ahora: un evento mal enrutado deja la lista mintiendo hasta recargar.
 */
describe("useChannelsRealtime", () => {
  beforeEach(() => {
    handlers.clear()
    jest.clearAllMocks()
  })

  it("`channel.status_changed` va al store con el número si viene", () => {
    const view = renderHook(() => useChannelsRealtime())

    handlers.get("channel.status_changed")?.({
      channel_id: "ch-1",
      status: "disconnected",
      phone_number: "+57 300",
    })
    expect(setChannelStatus).toHaveBeenCalledWith("ch-1", "disconnected", "+57 300")

    // `null` se normaliza a `undefined`: el store no debe borrar el número que ya tenía
    handlers.get("channel.status_changed")?.({ channel_id: "ch-1", status: "connected", phone_number: null })
    expect(setChannelStatus).toHaveBeenLastCalledWith("ch-1", "connected", undefined)
    expect(view.result.current.connected).toBe(true)
  })

  it("`company.suspended` avisa al AuthProvider por CustomEvent con el código según el motivo", () => {
    renderHook(() => useChannelsRealtime())
    const received: unknown[] = []
    const listener = (event: Event) => received.push((event as CustomEvent).detail)
    window.addEventListener(COMPANY_SUSPENDED_EVENT, listener)

    handlers.get("company.suspended")?.({ reason: "trial_expired" })
    handlers.get("company.suspended")?.({ reason: "manual" })

    window.removeEventListener(COMPANY_SUSPENDED_EVENT, listener)
    expect(received).toEqual([API_ERROR_CODES.trialExpired, API_ERROR_CODES.companySuspended])
    // La suspensión no toca el store de canales
    expect(setChannelStatus).not.toHaveBeenCalled()
  })
})
