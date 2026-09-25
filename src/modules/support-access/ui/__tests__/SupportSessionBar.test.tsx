import { act, render, screen } from "@testing-library/react"

const showAlert = jest.fn()
let user: { support_session?: { expires_at: string; tenant_name: string; company_suspended?: boolean } } | null = null

jest.mock("@/shared/auth/auth.hooks", () => ({ useSession: () => ({ user }) }))
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))
jest.mock("../../infrastructure/support-access.service", () => ({ endSupportSession: jest.fn(async () => {}) }))
let lastSocketCode: string | null = null
jest.mock("@/core/realtime/socket-manager", () => ({
  socketManager: { getLastConnectErrorCode: () => lastSocketCode },
}))

import { SUPPORT_SESSION_EVENT } from "@/core/api/problem"
import { SupportSessionBar } from "../SupportSessionBar"

beforeEach(() => showAlert.mockReset())

describe("SupportSessionBar", () => {
  it("la sesión normal del cliente (sin support_session) no pinta nada", () => {
    user = {}
    const { container } = render(<SupportSessionBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it("bajo soporte: «Soporte · negocio · quedan N min · Salir»", () => {
    user = { support_session: { tenant_name: "Panadería La Espiga", expires_at: new Date(Date.now() + 58 * 60_000 - 5_000).toISOString() } }
    render(<SupportSessionBar />)
    expect(screen.getByRole("region", { name: "Sesión de soporte" })).toHaveTextContent("Soporte · Panadería La Espiga · quedan 58 min")
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument()
  })

  it("una acción bloqueada muestra «No disponible en soporte»", () => {
    user = { support_session: { tenant_name: "La Espiga", expires_at: new Date(Date.now() + 30 * 60_000).toISOString() } }
    render(<SupportSessionBar />)
    act(() => {
      window.dispatchEvent(new CustomEvent(SUPPORT_SESSION_EVENT, { detail: "auth/support_action_forbidden" }))
    })
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "warning", title: "No disponible en soporte" }))
  })

  it("el tiempo real sobre una cuenta suspendida avisa «solo lectura, sin tiempo real»", () => {
    user = { support_session: { tenant_name: "La Espiga", expires_at: new Date(Date.now() + 30 * 60_000).toISOString() } }
    render(<SupportSessionBar />)
    act(() => {
      window.dispatchEvent(new CustomEvent(SUPPORT_SESSION_EVENT, { detail: "auth/support_readonly_suspended" }))
    })
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cuenta suspendida: solo lectura, sin tiempo real" }),
    )
  })
})

describe("SupportSessionBar: cuenta suspendida (QA H2-2)", () => {
  it("avisa al montar si el servidor dice company_suspended", () => {
    user = {
      support_session: { tenant_name: "La Espiga", expires_at: new Date(Date.now() + 30 * 60_000).toISOString(), company_suspended: true },
    } as typeof user
    render(<SupportSessionBar />)
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cuenta suspendida: solo lectura, sin tiempo real" }),
    )
    expect(screen.getByRole("region", { name: "Sesión de soporte" })).toHaveTextContent("solo lectura, sin tiempo real")
  })

  it("avisa al montar si el socket se rechazó ANTES de que la barra existiera", () => {
    lastSocketCode = "auth/support_readonly_suspended"
    user = { support_session: { tenant_name: "La Espiga", expires_at: new Date(Date.now() + 30 * 60_000).toISOString() } }
    render(<SupportSessionBar />)
    expect(showAlert).toHaveBeenCalledTimes(1)
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cuenta suspendida: solo lectura, sin tiempo real" }),
    )
    lastSocketCode = null
  })
})
