import { act, render, screen } from "@testing-library/react"
import { HttpError } from "@/core/api/problem"
import { InboxDayProvider, STATS_MIN_INTERVAL_MS, useInboxDay } from "../inbox-day.context"
import { useInboxStore } from "../inbox.store"

jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getInboxStats: jest.fn(),
  listInboxConversations: jest.fn(),
}))

const { getInboxStats, listInboxConversations } = jest.requireMock(
  "@/modules/inbox/infrastructure/services/inbox-service.adapter",
) as { getInboxStats: jest.Mock; listInboxConversations: jest.Mock }

const STATS = {
  period: "today",
  period_start: "2026-09-26T05:00:00.000Z",
  period_end: "2026-09-26T14:00:00.000Z",
  new_count: 42,
  resolved_count: 31,
  open_now: 24,
  queued_now: 3,
  ai_resolved_pct: 74.2,
  human_resolved_pct: 25.8,
  series: [],
}

const head = { id: "h1", contact: { full_name: "Mariana" }, channel: { name: "WhatsApp" } }

function Probe() {
  const day = useInboxDay()
  return (
    <p>
      <span data-testid="status">{day.statsStatus}</span>
      <span data-testid="head">{day.head?.id ?? "none"}</span>
    </p>
  )
}

/** Simula una relectura de `/inbox/counts` (lo que dispara un evento de handoff del socket). */
async function countsArrive(queued: number) {
  await act(async () => {
    useInboxStore.setState((state) => ({
      counts: { queued, mine: 0, ai: 1, all_open: queued + 1, unread_total: 0 },
      countsVersion: state.countsVersion + 1,
    }))
  })
}

async function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state })
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

beforeEach(async () => {
  jest.useFakeTimers()
  getInboxStats.mockReset().mockResolvedValue(STATS)
  listInboxConversations.mockReset().mockResolvedValue({ data: [head], meta: { total: 1, page: 1, page_size: 1 } })
  useInboxStore.setState({ counts: null, countsVersion: 0 })
  await setVisibility("visible")
})

afterEach(() => {
  jest.useRealTimers()
})

describe("InboxDayProvider — frescura sin evento propio", () => {
  it("stats: una al montar; los cambios de la bandeja dentro del minuto no la repiten; pasado el minuto sí", async () => {
    render(
      <InboxDayProvider>
        <Probe />
      </InboxDayProvider>,
    )
    await act(async () => {})
    expect(getInboxStats).toHaveBeenCalledTimes(1)
    expect(getInboxStats).toHaveBeenCalledWith("today")
    expect(screen.getByTestId("status")).toHaveTextContent("ready")

    await countsArrive(2)
    await countsArrive(3)
    expect(getInboxStats).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(STATS_MIN_INTERVAL_MS)
    })
    await countsArrive(1)
    expect(getInboxStats).toHaveBeenCalledTimes(2)
  })

  it("volver a la pestaña relee al instante si ya pasó el intervalo; oculta, no relee", async () => {
    render(
      <InboxDayProvider>
        <Probe />
      </InboxDayProvider>,
    )
    await act(async () => {})
    act(() => {
      jest.advanceTimersByTime(STATS_MIN_INTERVAL_MS + 1)
    })
    await setVisibility("hidden")
    expect(getInboxStats).toHaveBeenCalledTimes(1)
    await setVisibility("visible")
    expect(getInboxStats).toHaveBeenCalledTimes(2)
    // Otra vuelta enseguida: dentro del intervalo, no.
    await setVisibility("hidden")
    await setVisibility("visible")
    expect(getInboxStats).toHaveBeenCalledTimes(2)
  })

  it("403: el día queda «forbidden» (la UI esconde el bento); otro error sin dato: «error»", async () => {
    getInboxStats.mockRejectedValueOnce(new HttpError({ status: 403, code: "auth/forbidden", message: "no" }))
    const { unmount } = render(
      <InboxDayProvider>
        <Probe />
      </InboxDayProvider>,
    )
    await act(async () => {})
    expect(screen.getByTestId("status")).toHaveTextContent("forbidden")
    unmount()

    getInboxStats.mockRejectedValueOnce(new Error("boom"))
    render(
      <InboxDayProvider>
        <Probe />
      </InboxDayProvider>,
    )
    await act(async () => {})
    expect(screen.getByTestId("status")).toHaveTextContent("error")
  })

  it("la cabeza de la cola: una fila de «queued» por tiempo en cola, con cada relectura de counts; sin cola no se pide", async () => {
    render(
      <InboxDayProvider>
        <Probe />
      </InboxDayProvider>,
    )
    await act(async () => {})
    expect(listInboxConversations).not.toHaveBeenCalled()

    await countsArrive(0)
    expect(listInboxConversations).not.toHaveBeenCalled()
    expect(screen.getByTestId("head")).toHaveTextContent("none")

    await countsArrive(2)
    await act(async () => {})
    expect(listInboxConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "human_queued", sort: "waiting", page_size: 1 }),
    )
    expect(screen.getByTestId("head")).toHaveTextContent("h1")

    // Mismo número en cola pero la bandeja cambió (un claim y un escalamiento): se relee.
    await countsArrive(2)
    await act(async () => {})
    expect(listInboxConversations).toHaveBeenCalledTimes(2)

    await countsArrive(0)
    expect(screen.getByTestId("head")).toHaveTextContent("none")
  })
})
