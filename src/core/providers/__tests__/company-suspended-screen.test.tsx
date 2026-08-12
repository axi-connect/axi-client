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
    // El CTA comercial sale del número configurado en NEXT_PUBLIC_SALES_WHATSAPP,
    // que es obligatorio (jest.env.ts lo fija); el botón de re-login queda
    // siempre disponible como salida
    expect(screen.getByRole("link", { name: /hablar con ventas/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/573224970950?text="),
    )
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })
})
