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
    // Tanda B (B-D7): si dejó un plan elegido, el enlace de pago ya viajó por
    // correo y WhatsApp al vencer la prueba. Sin sesión no se sabe si lo dejó,
    // así que el copy lo condiciona en vez de prometer un correo que quizá no salió.
    expect(screen.getByRole("alert")).toHaveTextContent(/Si dejaste un plan elegido/)
    expect(screen.getByRole("alert")).toHaveTextContent(/correo y al WhatsApp/)
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

describe("CompanySuspendedScreen · variante de pago vencido", () => {
  it("manda a pagar, NO a soporte", () => {
    // El backend devuelve un code distinto del genérico precisamente para
    // esto: mandar a soporte a un moroso es fricción que cuesta dinero.
    render(<CompanySuspendedScreen variant="payment_overdue" />)

    expect(
      screen.getByText("Tu servicio está suspendido por un pago pendiente"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/administrador de la plataforma/)).not.toBeInTheDocument()
  })

  it("dice por dónde le llegó el enlace, porque desde aquí no se puede emitir", () => {
    // Sin sesión no hay forma de emitir un enlace de pago, y el aviso de
    // cobranza ya lo llevaba.
    render(<CompanySuspendedScreen variant="payment_overdue" />)

    const body = screen.getByText(/enlace de pago/)
    expect(body.textContent).toContain("correo")
    expect(body.textContent).toContain("WhatsApp")
  })

  it("promete que la reactivación es automática, y no regaña", () => {
    render(<CompanySuspendedScreen variant="payment_overdue" />)

    expect(screen.getByText(/se reactiva solo/)).toBeInTheDocument()
    expect(screen.getByText(/datos siguen intactos/)).toBeInTheDocument()
  })

  it("ofrece escribir por WhatsApp además de reintentar el login", () => {
    render(<CompanySuspendedScreen variant="payment_overdue" />)

    expect(screen.getByRole("link", { name: "Escríbenos por WhatsApp" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Volver a intentar iniciar sesión" }),
    ).toBeInTheDocument()
  })
})
