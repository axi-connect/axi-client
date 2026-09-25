import { render, screen } from "@testing-library/react"

import { buildKitView } from "../../domain/kit-view"
import type { WelcomeKitData } from "../../domain/welcome-kit"
import { KitGoneView } from "../KitGoneView"
import { WelcomeKitView } from "../WelcomeKitView"

const DATA: WelcomeKitData = {
  businessName: "Panadería La Espiga",
  ownerFirstName: "Andrés",
  agentName: "Sofía",
  agentTone: "Cercano y claro",
  teamHours: "7:00 a. m. – 7:00 p. m.",
  loginEmail: "hola@laespiga.co",
  panelUrl: "https://app.axi-connect.co",
  paymentMethods: ["nequi", "pse"],
  catalog: { fileName: "catalogo.xlsx", fileSizeBytes: 1258291, productCount: 48 },
  advisor: { fullName: "Camila Restrepo", whatsappE164: "+573004821937", digestTime: "07:30" },
  trial: { startDate: "2026-09-29", conversations: 75 },
  plan: { name: "Small Business Suite", monthlyPriceCop: 150000, listPriceCop: 250000, conversationsPerMonth: 300 },
}

describe("WelcomeKitView", () => {
  it("pinta el titular aprobado, un solo h1 y el párrafo con el literal «Axi»", () => {
    render(<WelcomeKitView view={buildKitView(DATA)} />)
    const h1 = screen.getAllByRole("heading", { level: 1 })
    expect(h1).toHaveLength(1)
    expect(h1[0]).toHaveTextContent("Hoy empieza un negocio que vende sin detenerse.")
    expect(screen.getByText(/Desde hoy, Axi atiende el WhatsApp de Panadería La Espiga/)).toBeInTheDocument()
  })

  it("no muestra ninguna contraseña y enlaza el WhatsApp del asesor", () => {
    const { container } = render(<WelcomeKitView view={buildKitView(DATA)} />)
    expect(container.textContent).not.toMatch(/contraseña:/i)
    const wa = screen.getByRole("link", { name: /Escribirle a Camila por WhatsApp/ })
    expect(wa).toHaveAttribute("href", "https://wa.me/573004821937")
    expect(wa).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })

  it("la tabla del plan y la semana salen con los datos del cliente", () => {
    render(<WelcomeKitView view={buildKitView(DATA)} />)
    expect(screen.getByText("Nequi o PSE")).toBeInTheDocument()
    expect(screen.getByText("6 oct 2026, si decides seguir")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(8)
  })
})

describe("KitGoneView", () => {
  it("el kit vencido lleva al panel", () => {
    render(<KitGoneView reason="gone" />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu kit ya cumplió su semana")
    expect(screen.getByRole("link", { name: /Entrar a mi panel/ })).toHaveAttribute("href", "/auth/login")
  })

  it("el throttle pide recargar, no manda al panel", () => {
    render(<KitGoneView reason="busy" reloadHref="/bienvenida/tok" />)
    expect(screen.getByText("Estamos con mucho tráfico; recarga en unos segundos.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Recargar/ })).toHaveAttribute("href", "/bienvenida/tok")
    expect(screen.queryByRole("link", { name: /Entrar a mi panel/ })).not.toBeInTheDocument()
  })
})
