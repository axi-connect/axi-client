import { pricingSchema } from "../landing-schema"
import { MODULES, PRICING, publishableModules } from "@/modules/landing/ui/content/landing.content"

describe("pricingSchema", () => {
  it("declara la prueba, los tramos de SBS y solo los módulos con precio final", () => {
    const offers = pricingSchema().offers
    expect(Array.isArray(offers)).toBe(true)
    const paidPackages = PRICING.plans.filter((plan) => plan.priceKind === "fixed")
    expect(offers).toHaveLength(1 + paidPackages.length + publishableModules().length)
  })

  it("no publica a Google un precio de módulo que aún está en borrador", () => {
    const names = (pricingSchema().offers as unknown as Array<{ name?: string }>).map((offer) => offer.name ?? "")

    for (const offer of MODULES) {
      const declared = names.some((name) => name.includes(offer.name))
      expect(declared).toBe(offer.priceStatus === "final")
    }
  })
})
