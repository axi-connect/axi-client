import { act, fireEvent, render, screen } from "@testing-library/react"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { WorkspaceRail } from "../WorkspaceRail"
import { RAIL_STORAGE_KEY } from "../use-rail-mode"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"

const push = jest.fn()
let pathname = "/workspace/inbox"
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}))

const channels = [
  { id: "a", name: "WhatsApp Ventas", kind: "whatsapp_cloud", status: "connected" },
  { id: "b", name: "Messenger", kind: "facebook_messenger", status: "disconnected" },
]
jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: () => ({ fetchChannels: jest.fn(async () => {}), channels, loading: false }),
}))
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getInboxCounts: jest.fn(async () => ({ queued: 3, mine: 5, ai: 12, all_open: 24, unread_total: 7 })),
  listInboxConversations: jest.fn(async () => ({ data: [], meta: { total: 0, page: 1, page_size: 25 } })),
}))

const renderRail = (props: Parameters<typeof WorkspaceRail>[0] = {}) =>
  render(
    <TooltipProvider>
      <WorkspaceRail {...props} />
    </TooltipProvider>,
  )

/** jsdom no tiene media queries: se simula el ancho (`xl` o menos). */
function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes("80rem"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  setWide(false)
  push.mockReset()
  pathname = "/workspace/inbox"
  window.localStorage.clear()
  useInboxStore.setState({ view: "all_open", counts: { queued: 3, mine: 5, ai: 12, all_open: 24, unread_total: 7 } })
})

describe("WorkspaceRail", () => {
  it("sin preferencia el modo es automático (lo resuelve el CSS por ancho)", () => {
    renderRail()
    expect(screen.getByRole("navigation", { name: "Vistas y canales" })).toHaveAttribute("data-mode", "auto")
  })

  it("desde xl el botón pliega y despliega en su sitio, y se recuerda en el navegador", () => {
    setWide(true)
    const { unmount } = renderRail()
    const nav = screen.getByRole("navigation", { name: "Vistas y canales" })
    // En automático, desde xl va desplegada: el botón pliega.
    const toggle = screen.getByRole("button", { name: "Plegar el panel" })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(toggle).toHaveAttribute("aria-controls", nav.id)

    fireEvent.click(toggle)
    expect(nav).toHaveAttribute("data-mode", "compact")
    expect(nav).not.toHaveAttribute("data-peek")
    expect(window.localStorage.getItem(RAIL_STORAGE_KEY)).toBe("compact")

    fireEvent.click(screen.getByRole("button", { name: "Desplegar el panel" }))
    expect(nav).toHaveAttribute("data-mode", "expanded")
    expect(window.localStorage.getItem(RAIL_STORAGE_KEY)).toBe("expanded")
    fireEvent.click(screen.getByRole("button", { name: "Plegar el panel" }))
    unmount()

    // La siguiente visita arranca como la dejó.
    renderRail()
    expect(screen.getByRole("navigation", { name: "Vistas y canales" })).toHaveAttribute("data-mode", "compact")
  })

  it("por debajo de xl el botón la asoma sobre la lista sin guardarlo; Escape, tocar fuera o elegir la cierran", async () => {
    renderRail()
    const nav = screen.getByRole("navigation", { name: "Vistas y canales" })
    fireEvent.click(screen.getByRole("button", { name: "Desplegar el panel" }))
    expect(nav).toHaveAttribute("data-peek", "true")
    expect(screen.getByRole("button", { name: "Plegar el panel" })).toHaveAttribute("aria-expanded", "true")
    expect(window.localStorage.getItem(RAIL_STORAGE_KEY)).toBeNull()

    fireEvent.keyDown(nav, { key: "Escape" })
    expect(nav).not.toHaveAttribute("data-peek")

    fireEvent.click(screen.getByRole("button", { name: "Desplegar el panel" }))
    fireEvent.pointerDown(document.body)
    expect(nav).not.toHaveAttribute("data-peek")

    fireEvent.click(screen.getByRole("button", { name: "Desplegar el panel" }))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "En cola, 3" }))
    })
    expect(nav).not.toHaveAttribute("data-peek")
    expect(useInboxStore.getState().view).toBe("queued")
  })

  it("un almacenamiento bloqueado no rompe el botón: el modo vale para la visita", () => {
    setWide(true)
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    renderRail()
    fireEvent.click(screen.getByRole("button", { name: "Plegar el panel" }))
    expect(screen.getByRole("navigation", { name: "Vistas y canales" })).toHaveAttribute("data-mode", "compact")
    setItem.mockRestore()
  })

  it("las vistas llevan su conteo; la activa es la del store, y elegir una cambia la lista", async () => {
    renderRail()
    expect(screen.getByRole("button", { name: "Todas abiertas, 24" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "En cola, 3" })).not.toHaveAttribute("aria-current")
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "En cola, 3" }))
    })
    expect(useInboxStore.getState().view).toBe("queued")
    expect(push).not.toHaveBeenCalled()
  })

  it("fuera del inbox, elegir una vista entra por la URL (y ninguna se marca activa)", () => {
    pathname = "/workspace"
    renderRail()
    expect(screen.getByRole("button", { name: "Todas abiertas, 24" })).not.toHaveAttribute("aria-current")
    fireEvent.click(screen.getByRole("button", { name: "Contigo, 5" }))
    expect(push).toHaveBeenCalledWith("/workspace/inbox?view=mine")
  })

  it("el riel pone cápsula solo a lo accionable (En cola y Contigo)", () => {
    renderRail()
    const queued = screen.getByRole("button", { name: "En cola, 3" })
    const ai = screen.getByRole("button", { name: "Axi atiende, 12" })
    // La cápsula es aria-hidden: el nombre accesible ya lleva el número.
    expect(queued.querySelector("[aria-hidden].bg-foreground")).not.toBeNull()
    expect(ai.querySelector("[aria-hidden].bg-foreground")).toBeNull()
  })

  it("los canales dicen su estado; el que no está conectado lo dice también en texto", () => {
    renderRail()
    expect(screen.getByRole("button", { name: "Abrir canal WhatsApp Ventas, estado: Conectado" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Abrir canal Messenger, estado: Desconectado" })).toHaveTextContent("Desconectado")
  })

  it("en el drawer va desplegada, sin botón, y avisa al elegir para cerrarse", async () => {
    const onNavigate = jest.fn()
    renderRail({ variant: "drawer", onNavigate })
    expect(screen.getByRole("navigation", { name: "Vistas y canales" })).toHaveAttribute("data-mode", "expanded")
    expect(screen.queryByRole("button", { name: /el panel/ })).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerradas" }))
    })
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
