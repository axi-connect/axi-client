import { render, screen, within } from "@testing-library/react"

import { ModulePlans } from "../ModulePlans"
import { formatInteger, unitLabel } from "@/core/lib/commercial-units"
import { MODULES, MODULES_SECTION, formatCop } from "@/modules/landing/ui/content/landing.content"

/**
 * Las aserciones se DERIVAN del content, como en `PricingPlans.test`: si el
 * negocio cambia una cuota o un precio, el test sigue siendo verdad.
 */
describe("ModulePlans", () => {
  let getContext: jest.SpyInstance

  beforeEach(() => {
    // jsdom no implementa canvas 2D; sin este doble imprime un error por render.
    getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null)
  })

  afterEach(() => {
    getContext.mockRestore()
  })

  it("pinta una tarjeta por módulo con su cifra comercial y su precio", () => {
    render(<ModulePlans />)

    for (const offer of MODULES) {
      const card = within(screen.getByTestId(`module-${offer.id}`))
      expect(card.getByRole("heading", { level: 3, name: offer.name })).toBeInTheDocument()
      expect(card.getByText(formatInteger(offer.allowance.quantity))).toBeInTheDocument()
      expect(
        card.getByText(`${unitLabel(offer.allowance.unit, offer.allowance.quantity)} al mes`),
      ).toBeInTheDocument()
      expect(card.getByText(formatCop(offer.listCop))).toBeInTheDocument()
      expect(card.getByRole("link", { name: offer.cta.label })).toHaveAttribute("href", offer.cta.href)
    }
  })

  it("marca en el DOM si el precio sigue en borrador", () => {
    render(<ModulePlans />)

    for (const offer of MODULES) {
      const card = screen.getByTestId(`module-${offer.id}`)
      expect(card.querySelector("[data-price-status]")).toHaveAttribute(
        "data-price-status",
        offer.priceStatus,
      )
    }
  })

  it("no usa backdrop-filter dentro de una tarjeta con tilt", () => {
    // public-site.md §4.1: bajo un transform 3D el filtro captura otro backdrop
    // y hunde el frame rate. La superficie es `.glass-flat`, nunca `.glass`.
    render(<ModulePlans />)

    for (const offer of MODULES) {
      const card = screen.getByTestId(`module-${offer.id}`)
      expect(card.classList.contains("glass-flat")).toBe(true)
      expect(card.querySelectorAll(".glass, .glass-overlay, .glass-menu")).toHaveLength(0)
    }
  })

  it("lista lo que incluye cualquier módulo y la nota de exclusividad", () => {
    render(<ModulePlans />)

    const includes = within(screen.getByRole("list", { name: MODULES_SECTION.includesLabel }))
    for (const item of MODULES_SECTION.includes) {
      expect(includes.getByText(item)).toBeInTheDocument()
    }
    expect(screen.getByRole("link", { name: MODULES_SECTION.noteLink })).toHaveAttribute("href", "#planes")
  })
})
