import { fireEvent, render, screen, within } from "@testing-library/react"

import { PricingPlans } from "../PricingPlans"
import {
  FIXTURE_CATALOG,
  FIXTURE_CATALOG_LEGACY,
  FIXTURE_CATALOG_SOLD_OUT,
  FIXTURE_NOW,
} from "@/modules/landing/domain/testing/catalog.fixture"
import {
  MONTHS_PER_YEAR,
  annualTotalCop,
  discountLabel,
  planListCop,
  planMonthlyCop,
  promotionLastDay,
  volumeById,
  type PublicCatalog,
} from "@/modules/landing/domain/public-catalog"
import {
  formatCop,
  formatDeadlineLong,
  foundersDiscountBadge,
  planById,
  pricingPackages,
  type PricingPlan,
} from "@/modules/landing/ui/content/landing.content"

/**
 * Las cifras salen de un catálogo de EJEMPLO con la forma exacta del API
 * (`catalog.fixture.ts`): el código de producción ya no tiene ninguna.
 *
 * El reloj va CONGELADO dentro de la promoción del fixture. Dos razones:
 * 1. `FlipCountdown` corre un `setInterval` y pinta cifras de dos dígitos; con
 *    el reloj real cualquier ficha podía coincidir con el contador de cupos.
 * 2. El precio de fundador depende de que la oferta esté abierta; sin congelar
 *    el reloj estos tests caducarían solos el 1 de enero con el código intacto.
 */
const AFTER_DEADLINE = new Date("2027-01-15T10:00:00")

const CATALOG = FIXTURE_CATALOG
const PROMOTION = CATALOG.promotion!
/** Tramo con el que abre la sección: contra él se derivan las aserciones. */
const VOLUME = CATALOG.defaultVolumeId

/** Los chips son radios nativos: se eligen por su etiqueta, como el visitante. */
function selectVolume(catalog: PublicCatalog, id: string) {
  fireEvent.click(screen.getByRole("radio", { name: volumeById(catalog, id).label }))
}

function planOrFail(id: string): PricingPlan {
  const plan = planById(id)
  if (!plan) throw new Error(`El content ya no tiene el plan "${id}"`)
  return plan
}

const ENTRY_PLAN = planOrFail("esencial")
const FEATURED_PLAN = planOrFail("crecimiento")
const UPPER_PLAN = planOrFail("escala")
const ENTERPRISE_PLAN = planOrFail("enterprise")

const cardOf = (id: string) => within(screen.getByTestId(`plan-${id}`))

/** Precio de lista / de fundador ya resueltos al tramo por defecto. */
const listOf = (plan: PricingPlan, volume = VOLUME) => planListCop(CATALOG, plan.id, volume) as number
const monthlyOf = (plan: PricingPlan, volume = VOLUME) =>
  planMonthlyCop(CATALOG, plan.id, volume, FIXTURE_NOW) as number

describe("PricingPlans", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FIXTURE_NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("pinta TRES tarjetas comparables: ni la prueba ni Enterprise ocupan fila", () => {
    render(<PricingPlans catalog={CATALOG} />)

    expect(pricingPackages()).toHaveLength(3)
    expect(screen.queryByTestId("plan-free_trial")).not.toBeInTheDocument()
    for (const plan of pricingPackages()) {
      expect(screen.getByTestId(`plan-${plan.id}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId(`plan-${ENTERPRISE_PLAN.id}`)).toBeInTheDocument()
  })

  it("cada paquete muestra su propio precio, su tachado y el sello de fundador", () => {
    render(<PricingPlans catalog={CATALOG} />)

    for (const plan of [ENTRY_PLAN, FEATURED_PLAN, UPPER_PLAN]) {
      const card = cardOf(plan.id)
      expect(monthlyOf(plan)).toBeLessThan(listOf(plan))
      expect(card.getByText(formatCop(listOf(plan)))).toBeInTheDocument()
      expect(card.getByText(formatCop(monthlyOf(plan)))).toBeInTheDocument()
      expect(card.getByText(foundersDiscountBadge(discountLabel(PROMOTION)))).toBeInTheDocument()
    }
  })

  it("el precio es la SUMA de la tarifa del paquete y la del tramo (G7)", () => {
    // La landing promete «paquete + tramo»; el catálogo trae los dos
    // componentes y la celda tiene que ser exactamente su suma.
    render(<PricingPlans catalog={CATALOG} />)
    const tramo = volumeById(CATALOG, VOLUME).feeCop as number
    for (const plan of pricingPackages()) {
      expect(listOf(plan)).toBe(CATALOG.packageFees[plan.id] + tramo)
      expect(String(listOf(plan))).toMatch(/900$/)
    }
  })

  it("los tres escalones tienen precios distintos y crecientes al mismo volumen", () => {
    render(<PricingPlans catalog={CATALOG} />)
    const prices = [ENTRY_PLAN, FEATURED_PLAN, UPPER_PLAN].map((plan) => listOf(plan))
    expect(new Set(prices).size).toBe(3)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it("la prueba gratuita se anuncia en los propios botones, no como tarjeta", () => {
    render(<PricingPlans catalog={CATALOG} />)

    for (const plan of pricingPackages()) {
      const card = cardOf(plan.id)
      expect(card.getByRole("link")).toHaveTextContent(/7 días gratis/i)
      expect(card.getByText(/Sin tarjeta/i)).toBeInTheDocument()
    }
  })

  it("los chips recalculan las TRES tarjetas a la vez", () => {
    render(<PricingPlans catalog={CATALOG} />)

    selectVolume(CATALOG, "t10000")
    for (const plan of pricingPackages()) {
      expect(cardOf(plan.id).getByText(formatCop(monthlyOf(plan, "t10000")))).toBeInTheDocument()
    }

    selectVolume(CATALOG, "t500")
    for (const plan of pricingPackages()) {
      expect(cardOf(plan.id).getByText(formatCop(monthlyOf(plan, "t500")))).toBeInTheDocument()
    }
  })

  it("por encima del catálogo deja de dar cifra y manda a ventas", () => {
    render(<PricingPlans catalog={CATALOG} />)
    selectVolume(CATALOG, "max")

    for (const plan of pricingPackages()) {
      const card = cardOf(plan.id)
      expect(card.getByText("A la medida")).toBeInTheDocument()
      expect(card.getByRole("link")).toHaveAttribute("href", "/contacto")
    }
  })

  it("el botón arrastra los DOS ejes elegidos al registro", () => {
    render(<PricingPlans catalog={CATALOG} />)

    for (const plan of pricingPackages()) {
      expect(cardOf(plan.id).getByRole("link")).toHaveAttribute(
        "href",
        `/comenzar?plan=${plan.id}&volumen=${VOLUME}&periodo=monthly`,
      )
    }
  })

  it("el conmutador anual factura once meses y pone el ahorro en pesos", () => {
    render(<PricingPlans catalog={CATALOG} />)

    fireEvent.click(screen.getByRole("radio", { name: /anual/i }))

    const card = cardOf(FEATURED_PLAN.id)
    const monthly = monthlyOf(FEATURED_PLAN)
    // La cifra grande NO cambia: el beneficio es un mes gratis, no una tarifa
    // menor. Sale DOS veces —el precio y el ahorro— porque el mes que se
    // regala vale exactamente una mensualidad.
    expect(card.getAllByText(formatCop(monthly))).toHaveLength(2)
    expect(card.getByText(/Te ahorras/)).toBeInTheDocument()
    expect(card.getByText(formatCop(annualTotalCop(monthly)))).toBeInTheDocument()
    expect(card.getByText(formatCop(monthly * MONTHS_PER_YEAR))).toBeInTheDocument()
    expect(card.getByRole("link")).toHaveAttribute(
      "href",
      `/comenzar?plan=${FEATURED_PLAN.id}&volumen=${VOLUME}&periodo=annual`,
    )
  })

  it("declara el volumen vigente junto al precio, no en las viñetas", () => {
    render(<PricingPlans catalog={CATALOG} />)

    const card = cardOf(ENTRY_PLAN.id)
    expect(
      card.getByText(new RegExp(`${volumeById(CATALOG, VOLUME).label} conversaciones/mes`)),
    ).toBeInTheDocument()
    for (const bullet of ENTRY_PLAN.bullets) expect(bullet).not.toMatch(/conversaciones\/mes/i)
  })

  it("cada tarjeta declara lo que hereda de la anterior", () => {
    render(<PricingPlans catalog={CATALOG} />)

    expect(cardOf(ENTRY_PLAN.id).getByText("Incluye")).toBeInTheDocument()
    expect(cardOf(FEATURED_PLAN.id).getByText(/Todo lo de Esencial/)).toBeInTheDocument()
    expect(cardOf(UPPER_PLAN.id).getByText(/Todo lo de Crecimiento/)).toBeInTheDocument()
  })

  it("Enterprise sigue en ventas y su piso viene del catálogo", () => {
    render(<PricingPlans catalog={CATALOG} />)
    const band = cardOf(ENTERPRISE_PLAN.id)
    expect(band.getByRole("link", { name: ENTERPRISE_PLAN.cta.label })).toHaveAttribute("href", "/contacto")
    expect(band.getByText(`Desde ${formatCop(CATALOG.enterpriseFloorCop as number)}`)).toBeInTheDocument()
  })

  it("publica los cupos reales de la promoción y su fecha de cierre", () => {
    render(<PricingPlans catalog={CATALOG} />)

    const slots = within(screen.getByTestId("founders-slots"))
    expect(slots.getByText(String(PROMOTION.taken))).toBeInTheDocument()
    expect(slots.getByText(`de ${PROMOTION.slots} tomados`)).toBeInTheDocument()

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", String(PROMOTION.taken))
    expect(bar).toHaveAttribute("aria-valuemax", String(PROMOTION.slots))

    const lastDay = promotionLastDay(PROMOTION) as string
    expect(lastDay).toBe("2026-12-31")
    expect(screen.getByText(`Hasta el ${formatDeadlineLong(lastDay)}`)).toBeInTheDocument()
  })

  it("con los cupos agotados la promoción se cierra: ni franja ni descuento", () => {
    // Fecha Y cupos, lo que ocurra primero (D5): agotados los cupos la landing
    // deja de prometer un descuento que ya no puede dar.
    render(<PricingPlans catalog={FIXTURE_CATALOG_SOLD_OUT} />)

    expect(screen.queryByTestId("founders-slots")).not.toBeInTheDocument()
    const card = cardOf(ENTRY_PLAN.id)
    expect(card.getByText(formatCop(listOf(ENTRY_PLAN)))).toBeInTheDocument()
    expect(card.queryByText(foundersDiscountBadge(discountLabel(PROMOTION)))).not.toBeInTheDocument()
  })

  it("a las 03:00Z del 1 de enero la promoción sigue abierta y la cuenta atrás no está en cero", () => {
    // El instante de cierre es 05:00Z; el contador corre contra ESE instante y
    // no contra el final del día de calendario en la zona del servidor.
    jest.setSystemTime(new Date("2027-01-01T03:00:00.000Z"))
    render(<PricingPlans catalog={CATALOG} />)

    expect(screen.getByTestId("founders-slots")).toBeInTheDocument()
    expect(cardOf(ENTRY_PLAN.id).getByText(formatCop(monthlyOf(ENTRY_PLAN)))).toBeInTheDocument()
    expect(screen.getByText(/quedan 0 días/)).toBeInTheDocument()
    // Fichas: días 00, horas 02 (aria-hidden, se leen del DOM).
    const tiles = screen.getAllByText("02")
    expect(tiles.length).toBeGreaterThan(0)
  })

  it("vencida la fecha cae sola a precio de lista, sin tocar nada más", () => {
    jest.setSystemTime(AFTER_DEADLINE)
    render(<PricingPlans catalog={CATALOG} />)
    const card = cardOf(ENTRY_PLAN.id)

    expect(card.getByText(formatCop(listOf(ENTRY_PLAN)))).toBeInTheDocument()
    expect(card.queryByText(foundersDiscountBadge(discountLabel(PROMOTION)))).not.toBeInTheDocument()
    expect(screen.queryByTestId("founders-slots")).not.toBeInTheDocument()
  })

  it("antes de la vigencia de dos ejes pinta el precio legado sin chips de volumen", () => {
    render(<PricingPlans catalog={FIXTURE_CATALOG_LEGACY} />)

    expect(screen.queryByRole("radio", { name: volumeById(CATALOG, VOLUME).label })).not.toBeInTheDocument()
    for (const plan of pricingPackages()) {
      const list = planListCop(FIXTURE_CATALOG_LEGACY, plan.id, FIXTURE_CATALOG_LEGACY.defaultVolumeId) as number
      expect(list).toBe(FIXTURE_CATALOG_LEGACY.legacyPackageCop[plan.id])
      expect(cardOf(plan.id).getByText(formatCop(list))).toBeInTheDocument()
      expect(cardOf(plan.id).getByRole("link")).toHaveAttribute("href", `/comenzar?plan=${plan.id}&periodo=monthly`)
    }
  })

  it("sin catálogo no inventa cifras: «precios a consulta» y ventas", () => {
    render(<PricingPlans catalog={null} />)

    const box = within(screen.getByTestId("pricing-unavailable"))
    expect(box.getByRole("link", { name: /ventas/i })).toHaveAttribute("href", "/contacto")
    expect(screen.queryByTestId(`plan-${ENTRY_PLAN.id}`)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$\s?\d/)).not.toBeInTheDocument()
  })
})
