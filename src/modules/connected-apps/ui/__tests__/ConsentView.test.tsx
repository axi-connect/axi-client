import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { HttpError } from "@/core/api/problem"
import type { ConsentRequest } from "@/modules/connected-apps/domain/connected-apps"
import { ConsentView } from "../ConsentView"
import {
  decideConsent,
  getConsentRequest,
} from "../../infrastructure/services/connected-apps-service.adapter"

jest.mock("../../infrastructure/services/connected-apps-service.adapter", () => ({
  getConsentRequest: jest.fn(),
  decideConsent: jest.fn(),
}))
const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))
jest.mock("@/core/providers/auth-provider", () => ({ useAuthContext: () => ({ logout: jest.fn() }) }))

const get = getConsentRequest as jest.MockedFunction<typeof getConsentRequest>
const decide = decideConsent as jest.MockedFunction<typeof decideConsent>

const REQUEST: ConsentRequest = {
  id: "req-1",
  client: {
    client_id: "https://claude.ai/oauth/mcp-client-metadata.json",
    name: "Claude",
    uri: "https://claude.ai",
    logo_uri: null,
    source: "cimd",
  },
  redirect_host: "claude.ai",
  loopback: false,
  scopes: [
    { scope: "catalogo:escribir", toolset: "catalogo", title: "Catálogo e inventario", summary: "Productos", level: "escribir" },
    { scope: "pedidos:leer", toolset: "pedidos", title: "Pedidos", summary: "Pedidos", level: "leer" },
  ],
  person: { name: "Camila Pérez", company: "Norte Studio", role: "Dueña" },
  expires_at: "2026-11-18T20:00:00.000Z",
}

describe("ConsentView", () => {
  const assign = jest.fn()
  beforeAll(() => {
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true })
  })
  beforeEach(() => jest.resetAllMocks())

  it("muestra la app verificada, quién decide y las áreas pedidas", async () => {
    get.mockResolvedValue(REQUEST)
    render(<ConsentView requestId="req-1" />)
    expect(await screen.findByRole("heading", { name: "Claude quiere conectarse a tu cuenta de Axi" })).toBeInTheDocument()
    expect(screen.getByText(/Verificado por su dominio/)).toBeInTheDocument()
    // El dominio verificado y el destino de la vuelta
    expect(screen.getAllByText("claude.ai", { selector: "b" })).toHaveLength(2)
    expect(screen.getByText("Camila Pérez")).toBeInTheDocument()
    expect(screen.getByText("Norte Studio · Dueña")).toBeInTheDocument()
    expect(screen.getByRole("radiogroup", { name: "Acceso a Pedidos" })).toBeInTheDocument()
    // Lo que pidió solo «ver» no se puede subir a «ver y cambiar»
    const pedidos = screen.getByRole("radiogroup", { name: "Acceso a Pedidos" })
    expect(pedidos.querySelector('[aria-checked="true"]')?.textContent).toBe("Ver")
  })

  it("permitir manda los alcances elegidos y sigue a la app", async () => {
    get.mockResolvedValue(REQUEST)
    decide.mockResolvedValue({ redirect_to: "https://claude.ai/api/mcp/auth_callback?code=x&state=s" })
    render(<ConsentView requestId="req-1" />)
    fireEvent.click(await screen.findByRole("button", { name: "Permitir acceso" }))
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith("req-1", { approve: true, scopes: ["catalogo:escribir", "pedidos:leer"] }),
    )
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://claude.ai/api/mcp/auth_callback?code=x&state=s"))
  })

  it("quitar todas las áreas deshabilita «Permitir acceso»", async () => {
    get.mockResolvedValue(REQUEST)
    render(<ConsentView requestId="req-1" />)
    await screen.findByRole("button", { name: "Permitir acceso" })
    for (const group of screen.getAllByRole("radiogroup")) {
      fireEvent.click(group.querySelector('[role="radio"]') as HTMLElement)
    }
    expect(screen.getByRole("button", { name: "Permitir acceso" })).toBeDisabled()
    expect(screen.getByText("Elige al menos un área para permitir el acceso.")).toBeInTheDocument()
  })

  it("cancelar rechaza y vuelve a la app", async () => {
    get.mockResolvedValue(REQUEST)
    decide.mockResolvedValue({ redirect_to: "https://claude.ai/cb?error=access_denied" })
    render(<ConsentView requestId="req-1" />)
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(decide).toHaveBeenCalledWith("req-1", { approve: false }))
  })

  it("app local sin verificar: nombre entre comillas y aviso", async () => {
    get.mockResolvedValue({
      ...REQUEST,
      client: { ...REQUEST.client, name: "Mi asistente", source: "dcr" },
      loopback: true,
      redirect_host: "127.0.0.1:33418",
    })
    render(<ConsentView requestId="req-1" />)
    expect(await screen.findByText(/Nombre declarado por la propia app/)).toBeInTheDocument()
    expect(screen.getByText("Esta app corre en un computador")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "«Mi asistente» quiere conectarse a tu cuenta de Axi" })).toBeInTheDocument()
  })

  it.each([
    [404, "Esta solicitud ya no está activa"],
    [403, "Entra con un usuario de la empresa"],
    [400, "No podemos conectar esta app"],
  ])("error %s → %s", async (status, title) => {
    get.mockRejectedValue(new HttpError({ status, code: "x", message: "x" }))
    render(<ConsentView requestId="req-1" />)
    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument()
  })

  it("sin solicitud en la URL: inválida, sin pedir nada", () => {
    render(<ConsentView requestId={null} />)
    expect(screen.getByRole("heading", { name: "No podemos conectar esta app" })).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })
})
