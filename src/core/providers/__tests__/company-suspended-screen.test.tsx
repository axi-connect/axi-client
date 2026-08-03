import { render, screen } from "@testing-library/react"
import { CompanySuspendedScreen } from "../company-suspended-screen"

describe("CompanySuspendedScreen (polimórfica por variante)", () => {
  it("variante por defecto: copy de suspensión hacia soporte", () => {
    render(<CompanySuspendedScreen />)
    expect(screen.getByRole("alert")).toHaveTextContent("La empresa está suspendida")
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("variante trial_expired: copy comercial de activación", () => {
    render(<CompanySuspendedScreen variant="trial_expired" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Tu prueba terminó")
    expect(screen.getByRole("alert")).toHaveTextContent("tus datos siguen intactos")
    // Sin NEXT_PUBLIC_SALES_WHATSAPP el CTA comercial no aparece; el botón
    // de re-login queda siempre disponible como salida
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })
})
