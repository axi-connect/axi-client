import { render, screen } from "@testing-library/react"

import { ConnectChannelView } from "../ConnectChannelView"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }))

let user: { email: string; email_verified?: boolean } = { email: "ana@axi.co", email_verified: false }
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ user, refresh: jest.fn() }),
}))
jest.mock("@/shared/auth/email-verification", () => ({ resendVerificationEmail: jest.fn() }))
jest.mock("../ConnectChannelFlow", () => ({ ConnectChannelFlow: () => <p data-testid="flow">flujo</p> }))

/**
 * El gate de correo existía en el paso «WhatsApp» del onboarding y no aquí: el
 * MISMO usuario, entrando por Ajustes, abría el popup, quemaba el `code` de un
 * solo uso y recibía «No pudimos conectar el canal» sin ninguna pista.
 */
describe("ConnectChannelView — gate de correo", () => {
  it("sin correo verificado no monta el flujo: pide verificar", () => {
    user = { email: "ana@axi.co", email_verified: false }
    render(<ConnectChannelView />)

    expect(screen.queryByTestId("flow")).toBeNull()
    expect(screen.getByText(/verifica tu correo para conectar un canal/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reenviar el correo/i })).toBeEnabled()
  })

  it("con el correo verificado (o sin dato) monta el flujo", () => {
    user = { email: "ana@axi.co" }
    render(<ConnectChannelView />)
    expect(screen.getByTestId("flow")).toBeInTheDocument()
  })
})
