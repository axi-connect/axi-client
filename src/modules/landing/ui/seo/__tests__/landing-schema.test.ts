import { pricingSchema } from "../landing-schema"
import {
  FIXTURE_CATALOG,
  FIXTURE_CATALOG_NO_PROMO,
  FIXTURE_NOW,
} from "@/modules/landing/domain/testing/catalog.fixture"
import { planMonthlyCop } from "@/modules/landing/domain/public-catalog"
import { MODULES, pricingPackages } from "@/modules/landing/ui/content/landing.content"

type OfferLike = {
  name?: string
  price?: string
  priceValidUntil?: string
  priceSpecification?: { minPrice?: number }
}

const offersOf = (schema: ReturnType<typeof pricingSchema>) => schema.offers as unknown as OfferLike[]

describe("pricingSchema", () => {
  it("declara la prueba, los tres paquetes y los módulos con celda publicada", () => {
    const offers = offersOf(pricingSchema(FIXTURE_CATALOG, FIXTURE_NOW))
    expect(offers).toHaveLength(1 + pricingPackages().length + MODULES.length)
  })

  it("publica el escalón de ENTRADA y lo marca como mínimo, no como precio fijo", () => {
    // Con dos ejes un paquete no tiene un precio sino una escalera. Afirmar una
    // cifra fija que la página no muestra en todos sus tramos es la
    // discrepancia por la que Google retira el resultado enriquecido.
    const paquetes = offersOf(pricingSchema(FIXTURE_CATALOG, FIXTURE_NOW)).filter((offer) =>
      offer.name?.startsWith("Paquete "),
    )
    expect(paquetes).toHaveLength(pricingPackages().length)

    const entry = FIXTURE_CATALOG.volumes[0]
    for (const [index, plan] of pricingPackages().entries()) {
      const shown = planMonthlyCop(FIXTURE_CATALOG, plan.id, entry.id, FIXTURE_NOW)
      expect(paquetes[index].price).toBe(String(shown))
      expect(paquetes[index].priceSpecification?.minPrice).toBe(shown)
    }
  })

  it("la vigencia del precio promocional es el último día de la promoción", () => {
    const withPromo = offersOf(pricingSchema(FIXTURE_CATALOG, FIXTURE_NOW)).filter((offer) =>
      offer.name?.startsWith("Paquete "),
    )
    for (const offer of withPromo) expect(offer.priceValidUntil).toBe("2026-12-31")

    const withoutPromo = offersOf(pricingSchema(FIXTURE_CATALOG_NO_PROMO, FIXTURE_NOW)).filter((offer) =>
      offer.name?.startsWith("Paquete "),
    )
    for (const offer of withoutPromo) expect(offer.priceValidUntil).toBeUndefined()
  })

  it("no publica a Google un módulo sin celda en el catálogo", () => {
    const withoutCalls = {
      ...FIXTURE_CATALOG,
      modulePrices: Object.fromEntries(
        Object.entries(FIXTURE_CATALOG.modulePrices).filter(([slug]) => slug !== "calls"),
      ),
    }
    const names = offersOf(pricingSchema(withoutCalls, FIXTURE_NOW)).map((offer) => offer.name ?? "")

    for (const offer of MODULES) {
      expect(names.some((name) => name.includes(offer.name))).toBe(offer.offer_code !== "calls")
    }
  })

  it("sin catálogo declara solo la prueba: ninguna cifra inventada", () => {
    const offers = offersOf(pricingSchema(null, FIXTURE_NOW))
    expect(offers).toHaveLength(1)
    expect(offers[0].price).toBe("0")
  })
})
