import { act, fireEvent, render, screen } from "@testing-library/react"
import { InboxDayPanel } from "../InboxDayPanel"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { InboxDay } from "@/modules/inbox/infrastructure/stores/inbox-day.context"

let day: InboxDay
jest.mock("@/modules/inbox/infrastructure/stores/inbox-day.context", () => ({
  useInboxDay: () => day,
}))
let permissions: string[] = ["conversations:claim"]
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (p: string) => permissions.includes(p) }),
}))
const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))
jest.mock("@/modules/companies/public", () => ({
  useMyCompany: () => ({ company: { timezone: "America/Bogota" } }),
}))

const NOW = new Date("2026-09-26T14:42:00Z") // 9:42 a. m. en Bogotá
const head = {
  id: "c-mariana",
  contact: { full_name: "Mariana Restrepo Villegas", phone: null },
  channel: { name: "WhatsApp Ventas" },
  queued_at: "2026-09-26T14:28:00Z",
  last_inbound_at: "2026-09-26T14:28:00Z",
} as unknown as NonNullable<InboxDay["head"]>

const stats = {
  period: "today",
  period_start: "2026-09-26T05:00:00.000Z",
  period_end: NOW.toISOString(),
  new_count: 42,
  resolved_count: 31,
  open_now: 24,
  queued_now: 3,
  ai_resolved_pct: 74.2,
  human_resolved_pct: 25.8,
  series: [
    { bucket: "2026-09-26T13:00:00.000Z", new: 9, resolved: 4 },
    { bucket: "2026-09-26T14:00:00.000Z", new: 7, resolved: 2 },
  ],
} as unknown as NonNullable<InboxDay["stats"]>

const claim = jest.fn()
const commands = { claim } as never
const select = jest.fn(async () => {})

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW)
  permissions = ["conversations:claim"]
  claim.mockReset().mockResolvedValue({ ok: true, data: {} })
  select.mockClear()
  showAlert.mockClear()
  day = { stats, statsStatus: "ready", head, reloadStats: jest.fn() }
  useInboxStore.setState({ view: "all_open", counts: { queued: 3, mine: 5, ai: 12, all_open: 24, unread_total: 7 }, select })
})

afterEach(() => jest.useRealTimers())

describe("InboxDayPanel", () => {
  it("la isla dice cuántos esperan y quién lleva más; «Atender a Mariana» la toma y la abre", async () => {
    render(<InboxDayPanel commands={commands} />)
    expect(screen.getByRole("region", { name: "Lo próximo" })).toHaveTextContent("3 esperan")
    expect(screen.getByText("La que más lleva: Mariana Restrepo Villegas · WhatsApp Ventas · hace 14 min.")).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Atender a Mariana" }))
    })
    expect(claim).toHaveBeenCalledWith("c-mariana")
    expect(select).toHaveBeenCalledWith("c-mariana")
  })

  it("si otra persona la tomó primero, se dice y no se abre", async () => {
    claim.mockResolvedValueOnce({ ok: false, error: { code: "conversations/handoff_conflict", message: "ya asignada" } })
    render(<InboxDayPanel commands={commands} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Atender a Mariana" }))
    })
    expect(select).not.toHaveBeenCalled()
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }))
  })

  it("sin permiso de handoff solo la abre", async () => {
    permissions = []
    render(<InboxDayPanel commands={commands} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Abrir a Mariana" }))
    })
    expect(claim).not.toHaveBeenCalled()
    expect(select).toHaveBeenCalledWith("c-mariana")
  })

  it("el bento: entradas, resueltas con el reparto entero de Axi y abiertas desde counts", () => {
    render(<InboxDayPanel commands={commands} />)
    const tile = (label: string) => screen.getByRole("heading", { name: label }).closest("section")
    expect(tile("Entraron hoy")).toHaveTextContent("42")
    expect(screen.getByRole("img", { name: "Axi resolvió el 74 % y el equipo el 26 %" })).toBeInTheDocument()
    expect(screen.getByText("Axi cerró 23 sin pedir ayuda.")).toBeInTheDocument()
    expect(tile("Abiertas ahora")).toHaveTextContent("Con el equipo9")
    // La fecha del encabezado sale de la zona del negocio.
    expect(screen.getByText(/Hoy · sábado, 26 de septiembre|Hoy · sábado 26 de septiembre/)).toBeInTheDocument()
  })

  it("sin cola: «Nadie espera», sin botón de atender y con el camino a lo que atiende Axi", () => {
    day = { ...day, head: null }
    useInboxStore.setState({ counts: { queued: 0, mine: 0, ai: 12, all_open: 12, unread_total: 0 } })
    render(<InboxDayPanel commands={commands} />)
    expect(screen.getByRole("region", { name: "Lo próximo" })).toHaveTextContent("Nadie espera")
    expect(screen.queryByRole("button", { name: /Atender/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ver lo que atiende Axi" }))
    expect(useInboxStore.getState().view).toBe("ai")
  })

  it("las cifras fallan: la isla se queda y hay «Reintentar»; con 403 el bento se esconde sin ruido", () => {
    day = { ...day, stats: null, statsStatus: "error" }
    const { unmount } = render(<InboxDayPanel commands={commands} />)
    expect(screen.getByRole("region", { name: "Lo próximo" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(day.reloadStats).toHaveBeenCalled()
    unmount()

    day = { ...day, stats: null, statsStatus: "forbidden" }
    render(<InboxDayPanel commands={commands} />)
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument()
    expect(screen.queryByText("Entraron hoy")).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Lo próximo" })).toBeInTheDocument()
  })

  it("IB1-H2: sin la primera lectura de counts no dice «Nadie espera» (silueta); con counts en cero, sí", () => {
    day = { ...day, head: null }
    useInboxStore.setState({ counts: null })
    const { unmount } = render(<InboxDayPanel commands={commands} />)
    expect(screen.getByRole("status", { name: "Cargando lo próximo" })).toBeInTheDocument()
    expect(screen.queryByText("Nadie espera")).not.toBeInTheDocument()
    unmount()
    useInboxStore.setState({ counts: { queued: 0, mine: 0, ai: 0, all_open: 0, unread_total: 0 } })
    render(<InboxDayPanel commands={commands} />)
    expect(screen.getByText("Nadie espera")).toBeInTheDocument()
  })
})
