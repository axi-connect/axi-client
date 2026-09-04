import { pricingSchema } from "../landing-schema"
import { MODULES, pricingPackages, publishableModules } from "@/modules/landing/ui/content/landing.content"

describe("pricingSchema", () => {
  it("declara la prueba, los tres paquetes y solo los módulos con precio final", () => {
    const offers = pricingSchema().offers
    expect(Array.isArray(offers)).toBe(true)
    expect(offers).toHaveLength(1 + pricingPackages().length + publishableModules().length)
  })

  it("publica el escalón de ENTRADA y lo marca como mínimo, no como precio fijo", () => {
    // Con dos ejes un paquete no tiene un precio sino una escalera. Afirmar una
    // cifra fija que la página no muestra en todos sus tramos es la
    // discrepancia por la que Google retira el resultado enriquecido.
    const offers = pricingSchema().offers as unknown as Array<{
      name?: string
      price?: string
      priceSpecification?: { minPrice?: number }
    }>
    const paquetes = offers.filter((offer) => offer.name?.startsWith("Paquete "))
    expect(paquetes).toHaveLength(pricingPackages().length)
    for (const offer of paquetes) {
      expect(offer.priceSpecification?.minPrice).toBe(Number(offer.price))
    }
  })

  it("no publica a Google un precio de módulo que aún está en borrador", () => {
    const names = (pricingSchema().offers as unknown as Array<{ name?: string }>).map((offer) => offer.name ?? "")

    for (const offer of MODULES) {
      const declared = names.some((name) => name.includes(offer.name))
      expect(declared).toBe(offer.priceStatus === "final")
    }
  })
})
