import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WhatsAppStep } from "../steps/WhatsAppStep"

let user: { email: string; email_verified?: boolean } = { email: "joao@laparrilla.co", email_verified: true }
const refresh = jest.fn()
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ user, refresh }),
}))

// El flujo real abre el popup de Meta: aquí se dobla por dos botones que
// simulan sus dos salidas (canal conectado / alta manual).
jest.mock("@/modules/channels/public", () => ({
  ConnectChannelFlow: ({
    embedded,
    onConnected,
    onManualCreated,
  }: {
    embedded?: boolean
    onConnected?: (channel: { id: string }) => void
    onManualCreated: () => void
  }) => (
    <div data-testid="connect-flow" data-embedded={String(Boolean(embedded))}>
      <button type="button" onClick={() => onConnected?.({ id: "ch1" })}>
        Simular conexión
      </button>
      <button type="button" onClick={onManualCreated}>
        Simular alta manual
      </button>
    </div>
  ),
}))

const resendVerificationEmail = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  resendVerificationEmail: (...args: unknown[]) => resendVerificationEmail(...args),
}))

const props = () => ({ saving: false, onBack: jest.fn(), onSkip: jest.fn(), onDone: jest.fn() })

describe("WhatsAppStep", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    user = { email: "joao@laparrilla.co", email_verified: true }
  })

  it("embebe el mismo flujo de canales y cierra el paso con el canal conectado", () => {
    const p = props()
    render(<WhatsAppStep {...p} />)

    expect(screen.getByTestId("connect-flow")).toHaveAttribute("data-embedded", "true")
    expect(screen.queryByRole("button", { name: /^continuar/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /simular conexión/i }))
    fireEvent.click(screen.getByRole("button", { name: /^continuar/i }))
    expect(p.onDone).toHaveBeenCalledWith({ channel_id: "ch1" })
  })

  it("el alta manual también cierra el paso, sin id de canal", () => {
    const p = props()
    render(<WhatsAppStep {...p} />)
    fireEvent.click(screen.getByRole("button", { name: /simular alta manual/i }))
    fireEvent.click(screen.getByRole("button", { name: /^continuar/i }))
    expect(p.onDone).toHaveBeenCalledWith({ channel_id: null })
  })

  it("«Conectar después» omite el paso", () => {
    const p = props()
    render(<WhatsAppStep {...p} />)
    fireEvent.click(screen.getByRole("button", { name: /conectar después/i }))
    expect(p.onSkip).toHaveBeenCalled()
  })

  it("sin correo verificado no muestra el flujo: pide verificar, reenvía y comprueba", async () => {
    user = { email: "joao@laparrilla.co", email_verified: false }
    resendVerificationEmail.mockResolvedValueOnce(undefined)
    refresh.mockResolvedValueOnce(undefined)
    render(<WhatsAppStep {...props()} />)

    expect(screen.queryByTestId("connect-flow")).not.toBeInTheDocument()
    expect(screen.getByText(/verifica tu correo para conectar whatsapp/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /reenviar el correo/i }))
    await waitFor(() => expect(resendVerificationEmail).toHaveBeenCalledWith("joao@laparrilla.co"))
    expect(await screen.findByRole("button", { name: /correo reenviado/i })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: /ya verifiqué mi correo/i }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("si el contrato aún no informa la verificación, no bloquea", () => {
    user = { email: "joao@laparrilla.co" }
    render(<WhatsAppStep {...props()} />)
    expect(screen.getByTestId("connect-flow")).toBeInTheDocument()
  })
})
