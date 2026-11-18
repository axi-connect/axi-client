import { render, screen, waitFor } from "@testing-library/react"

import type { ConnectedApp } from "@/modules/connected-apps/domain/connected-apps"
import { ConnectedAppsCard } from "../ConnectedAppsCard"
import type { AppActionDTO } from "@/modules/connected-apps/domain/app-actions"
import {
  confirmAppAction,
  disconnectApp,
  listAppActions,
  listConnectedApps,
  rejectAppAction,
} from "../../infrastructure/services/connected-apps-service.adapter"

jest.mock("../../infrastructure/services/connected-apps-service.adapter", () => ({
  listConnectedApps: jest.fn(),
  disconnectApp: jest.fn(),
  listAppActions: jest.fn(),
  confirmAppAction: jest.fn(),
  rejectAppAction: jest.fn(),
}))
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: jest.fn(),
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
const listActions = listAppActions as jest.MockedFunction<typeof listAppActions>
const confirm = confirmAppAction as jest.MockedFunction<typeof confirmAppAction>
const reject = rejectAppAction as jest.MockedFunction<typeof rejectAppAction>

function appAction(patch: Partial<AppActionDTO> = {}): AppActionDTO {
  return {
    id: "act-1",
    assistant: "mcp",
    door: "mcp",
    origin_label: "Claude",
    thread_id: null,
    tool: "producto_guardar",
    risk: "write",
    status: "pending",
    preview: {
      summary: "Subir el precio de la Joao's Mixta a $ 29.000",
      lines: [{ label: "Precio de venta", before: "$ 27.000", after: "$ 29.000" }],
      effects: null,
    },
    outcome_text: null,
    expires_at: "2099-01-01T00:00:00.000Z",
    decided_at: null,
    created_at: "2026-11-18T15:00:00.000Z",
    ...patch,
  }
}

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
  beforeEach(() => {
    jest.resetAllMocks()
    listActions.mockResolvedValue([])
  })

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

  describe("pendientes de confirmar (lo que pidió Claude)", () => {
    it("muestra la tarjeta con su origen y el antes → después", async () => {
      list.mockResolvedValue([CLAUDE])
      listActions.mockResolvedValue([appAction()])
      render(<ConnectedAppsCard />)
      expect(await screen.findByText("Pendientes de confirmar")).toBeInTheDocument()
      expect(screen.getByText("Pedido desde Claude (app conectada)")).toBeInTheDocument()
      expect(screen.getByText("$ 29.000")).toBeInTheDocument()
      expect(screen.getByText("1 por decidir")).toBeInTheDocument()
    })

    it("confirmar → desenlace visible; nada se marca hecho antes de la respuesta", async () => {
      list.mockResolvedValue([CLAUDE])
      listActions.mockResolvedValue([appAction()])
      confirm.mockResolvedValue({ action_id: "act-1", outcome: "executed", text: "Hecho: la Mixta ya cuesta $ 29.000." })
      render(<ConnectedAppsCard />)
      ;(await screen.findByRole("button", { name: "Confirmar" })).click()
      await waitFor(() => expect(confirm).toHaveBeenCalledWith("act-1"))
      // La línea visible y la región viva del lector de pantalla
      expect(await screen.findAllByText("Hecho: la Mixta ya cuesta $ 29.000.")).toHaveLength(2)
      expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument()
    })

    it("descartar llama reject y deja el desenlace", async () => {
      list.mockResolvedValue([CLAUDE])
      listActions.mockResolvedValue([appAction()])
      reject.mockResolvedValue({ action_id: "act-1", outcome: "rejected", text: null })
      render(<ConnectedAppsCard />)
      ;(await screen.findByRole("button", { name: "Descartar" })).click()
      await waitFor(() => expect(reject).toHaveBeenCalledWith("act-1"))
      expect(await screen.findAllByText("Descartado. No se cambió nada.")).toHaveLength(2)
    })

    it("sin pendientes no se pinta el bloque; lo ya decidido antes tampoco", async () => {
      list.mockResolvedValue([CLAUDE])
      listActions.mockResolvedValue([appAction({ status: "executed", outcome_text: "Hecho." })])
      render(<ConnectedAppsCard />)
      await screen.findByText("Claude")
      expect(screen.queryByText("Pendientes de confirmar")).not.toBeInTheDocument()
    })
  })
})
