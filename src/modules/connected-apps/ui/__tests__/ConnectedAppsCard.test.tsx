import { render, screen, waitFor } from "@testing-library/react"

import type { ConnectedApp } from "@/modules/connected-apps/domain/connected-apps"
import { ConnectedAppsCard } from "../ConnectedAppsCard"
import {
  disconnectApp,
  listConnectedApps,
} from "../../infrastructure/services/connected-apps-service.adapter"

jest.mock("../../infrastructure/services/connected-apps-service.adapter", () => ({
  listConnectedApps: jest.fn(),
  disconnectApp: jest.fn(),
}))
const showAlert = jest.fn()
const showModal = jest.fn()
const closeModal = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal }),
}))
jest.mock("@/shared/components/ui/relative-date", () => ({
  RelativeDate: ({ iso }: { iso: string | null }) => <time>{iso}</time>,
}))

const list = listConnectedApps as jest.MockedFunction<typeof listConnectedApps>
const disconnect = disconnectApp as jest.MockedFunction<typeof disconnectApp>

const CLAUDE: ConnectedApp = {
  id: "grant-1",
  client: {
    client_id: "https://claude.ai/oauth/mcp-client-metadata.json",
    name: "Claude",
    uri: "https://claude.ai",
    logo_uri: null,
    source: "cimd",
  },
  scopes: ["catalogo:escribir", "pedidos:leer"],
  areas: [
    { scope: "catalogo:escribir", title: "Catálogo e inventario", level: "escribir" },
    { scope: "pedidos:leer", title: "Pedidos", level: "leer" },
  ],
  connected_at: "2026-11-18T15:00:00.000Z",
  last_used_at: null,
}

describe("ConnectedAppsCard", () => {
  beforeEach(() => jest.resetAllMocks())

  it("lista cada app con su verificación y sus áreas", async () => {
    list.mockResolvedValue([CLAUDE])
    render(<ConnectedAppsCard />)
    expect(await screen.findByText("Claude")).toBeInTheDocument()
    expect(screen.getByText("Verificada · claude.ai")).toBeInTheDocument()
    expect(screen.getByText("Catálogo e inventario · ver y cambiar")).toBeInTheDocument()
    expect(screen.getByText("Pedidos · ver")).toBeInTheDocument()
    expect(screen.getByText(/Sin uso todavía/)).toBeInTheDocument()
  })

  it("sin apps: estado vacío", async () => {
    list.mockResolvedValue([])
    render(<ConnectedAppsCard />)
    expect(await screen.findByText("Ninguna app conectada")).toBeInTheDocument()
  })

  it("desconectar pide confirmación y, al confirmar, la quita de la lista", async () => {
    list.mockResolvedValue([CLAUDE])
    disconnect.mockResolvedValue(undefined)
    render(<ConnectedAppsCard />)
    ;(await screen.findByRole("button", { name: "Desconectar" })).click()
    expect(showModal).toHaveBeenCalledTimes(1)
    const config = showModal.mock.calls[0]?.[0] as {
      title: string
      actions: { label: string; keepOpen?: boolean; onClick?: () => void }[]
    }
    expect(config.title).toBe("¿Desconectar Claude?")
    const confirm = config.actions.find((action) => action.label === "Desconectar")
    expect(confirm?.keepOpen).toBe(true)
    confirm?.onClick?.()
    await waitFor(() => expect(disconnect).toHaveBeenCalledWith("grant-1"))
    await waitFor(() => expect(screen.queryByText("Claude")).not.toBeInTheDocument())
    expect(closeModal).toHaveBeenCalled()
    expect(showAlert).toHaveBeenCalledWith({ tone: "success", title: "Claude quedó desconectada" })
  })

  it("un error al cargar ofrece reintentar", async () => {
    list.mockRejectedValue(new Error("caída"))
    render(<ConnectedAppsCard />)
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })
})
