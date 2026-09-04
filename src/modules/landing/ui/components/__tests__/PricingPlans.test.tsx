import { fireEvent, render, screen, within } from "@testing-library/react"

import { PricingPlans } from "../PricingPlans"
import {
  FOUNDERS,
  PRICING,
  VOLUME_ESTIMATOR,
  formatCop,
  formatDeadlineLong,
  founderCop,
} from "@/modules/landing/ui/content/landing.content"

/**
 * El reloj va CONGELADO en una fecha anterior al cierre del programa.
 *
 * Dos razones, ambas de fondo:
 * 1. `FlipCountdown` corre un `setInterval` y pinta cifras de dos dígitos. Con
 *    el reloj real, cualquier ficha que marcara el mismo número que los cupos
 *    tomados volvía ambigua la búsqueda por texto — los segundos lo hacen una
 *    vez por minuto, así que el test era flaky por diseño.
 * 2. Los precios de fundador dependen de que la oferta esté abierta. Sin
 *    congelar el reloj, estos tests empezarían a fallar solos el día que pase
 *    `FOUNDERS.deadline`, con el código intacto.
 *
 * Mismo patrón que `FlipCountdown.test.tsx`.
 */
const BEFORE_DEADLINE = new Date("2026-09-01T10:00:00")
/** Después del 31 de diciembre de 2026, que es el cierre del programa. */
const AFTER_DEADLINE = new Date("2027-01-15T10:00:00")

/** Busca por id y falla ruidosamente si el content cambió de forma. */
function byId<T extends { readonly id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id)
  if (!found) throw new Error(`El content ya no tiene el id "${id}"`)
  return found
}

/** Paquetes con precio fijo, ya estrechados: los de prueba y Enterprise no lo tienen. */
const FIXED_PLANS = PRICING.plans.filter((plan) => plan.priceKind === "fixed")

function fixedById(id: string) {
  return byId(FIXED_PLANS, id)
}

/**
 * Las aserciones se DERIVAN del content: este test no vuelve a escribir a mano
 * precios, cupos ni fechas. Si el negocio cambia un precio o el descuento, el
 * test sigue siendo verdad; si cambia el comportamiento, falla.
 */
const ENTRY_PLAN = fixedById("esencial")
const FEATURED_PLAN = fixedById("crecimiento")
const UPPER_PLAN = fixedById("escala")
const ENTERPRISE_PLAN = byId(PRICING.plans, "enterprise")

const choiceLabel = (id: string) => byId(VOLUME_ESTIMATOR.choices, id).label

function selectVolume(id: string) {
  fireEvent.click(screen.getByRole("radio", { name: choiceLabel(id) }))
}

const cardOf = (id: string) => within(screen.getByTestId(`plan-${id}`))

describe("PricingPlans", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(BEFORE_DEADLINE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("cada paquete de pago muestra su propio precio, su tachado y el sello de fundador", () => {
    render(<PricingPlans />)

    for (const plan of [ENTRY_PLAN, FEATURED_PLAN, UPPER_PLAN]) {
      const card = cardOf(plan.id)
      expect(card.getByText(formatCop(plan.listCop))).toBeInTheDocument()
      expect(card.getByText(formatCop(founderCop(plan.listCop)))).toBeInTheDocument()
      expect(card.getByText(FOUNDERS.discountBadge)).toBeInTheDocument()
    }
  })

  it("los tres escalones tienen precios distintos y crecientes", () => {
    // El catálogo anterior era UN plan con dos etiquetas y un salto de 3,4×
    // sin nada en medio. Que sean tres tarjetas con tres cifras es el cambio.
    render(<PricingPlans />)
    const prices = [ENTRY_PLAN, FEATURED_PLAN, UPPER_PLAN].map((plan) => plan.listCop)
    expect(new Set(prices).size).toBe(3)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it("mueve el sello 'Tu plan' según el volumen, sin quitarle su badge al destacado", () => {
    render(<PricingPlans />)

    selectVolume("lt_500")
    expect(cardOf(ENTRY_PLAN.id).getByText(VOLUME_ESTIMATOR.recommendedBadge)).toBeInTheDocument()

    selectVolume("gt_4000")
    expect(cardOf(ENTERPRISE_PLAN.id).getByText(VOLUME_ESTIMATOR.recommendedBadge)).toBeInTheDocument()
    expect(
      cardOf(ENTRY_PLAN.id).queryByText(VOLUME_ESTIMATOR.recommendedBadge),
    ).not.toBeInTheDocument()
    expect(cardOf(FEATURED_PLAN.id).getByText(String(FEATURED_PLAN.badge))).toBeInTheDocument()
  })

  it("no recomienda ningún plan mientras el visitante no declare su volumen", () => {
    render(<PricingPlans />)
    expect(screen.queryByText(VOLUME_ESTIMATOR.recommendedBadge)).not.toBeInTheDocument()
  })

  it("cada paquete lleva al destino que declara el content", () => {
    render(<PricingPlans />)

    for (const plan of PRICING.plans) {
      expect(screen.getByRole("link", { name: plan.cta.label })).toHaveAttribute("href", plan.cta.href)
    }
  })

  it("los paquetes autoservicio abren el registro con la oferta preseleccionada", () => {
    render(<PricingPlans />)

    for (const id of ["free_trial", "esencial", "crecimiento", "escala"]) {
      const plan = byId(PRICING.plans, id)
      expect(screen.getByRole("link", { name: plan.cta.label })).toHaveAttribute("href", `/comenzar?plan=${id}`)
    }
  })

  it("Enterprise sigue en ventas: nunca entra al registro autoservicio", () => {
    render(<PricingPlans />)
    expect(screen.getByRole("link", { name: ENTERPRISE_PLAN.cta.label })).toHaveAttribute("href", "/contacto")
  })

  it("publica el estado real de los cupos y la fecha de cierre", () => {
    render(<PricingPlans />)

    // El contador se consulta acotado a su propio nodo: la cuenta atrás de al
    // lado también pinta números y competiría por la misma búsqueda.
    const slots = within(screen.getByTestId("founders-slots"))
    expect(slots.getByText(String(FOUNDERS.claimed))).toBeInTheDocument()
    expect(slots.getByText(`de ${FOUNDERS.slots} tomados`)).toBeInTheDocument()

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", String(FOUNDERS.claimed))
    expect(bar).toHaveAttribute("aria-valuemax", String(FOUNDERS.slots))
    expect(bar.getAttribute("aria-label")).toContain(`${FOUNDERS.claimed} de ${FOUNDERS.slots}`)

    expect(screen.getByText(`Hasta el ${formatDeadlineLong(FOUNDERS.deadline)}`)).toBeInTheDocument()
  })

  it("vencida la fecha cae sola a precio de lista, sin tocar nada más", () => {
    // El "fallo seguro" que documenta el content: si nadie renueva el ciclo, la
    // landing deja de prometer un descuento que ya no aplica.
    jest.setSystemTime(AFTER_DEADLINE)
    render(<PricingPlans />)
    const card = cardOf(ENTRY_PLAN.id)

    expect(card.getByText(formatCop(ENTRY_PLAN.listCop))).toBeInTheDocument()
    expect(card.queryByText(FOUNDERS.discountBadge)).not.toBeInTheDocument()
    expect(card.queryByText(formatCop(founderCop(ENTRY_PLAN.listCop)))).not.toBeInTheDocument()
  })
})
