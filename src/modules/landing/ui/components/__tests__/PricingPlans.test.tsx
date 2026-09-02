import { fireEvent, render, screen, within } from "@testing-library/react"

import { PricingPlans } from "../PricingPlans"
import {
  FOUNDERS,
  PRICING,
  SBS_TIERS,
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
const AFTER_DEADLINE = new Date("2026-10-15T10:00:00")

/** Busca por id y falla ruidosamente si el content cambió de forma. */
function byId<T extends { readonly id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id)
  if (!found) throw new Error(`El content ya no tiene el id "${id}"`)
  return found
}

/**
 * Las aserciones se DERIVAN del content: este test no vuelve a escribir a mano
 * precios, cupos ni fechas. Si el negocio cambia un tramo o el descuento, el
 * test sigue siendo verdad; si cambia el comportamiento, falla.
 */
const ENTRY_TIER = SBS_TIERS[0]
const UPPER_TIER = byId(SBS_TIERS, "t3000")
const SBS_PLAN = byId(PRICING.plans, "sbs")
const ENTERPRISE_PLAN = byId(PRICING.plans, "enterprise")

const choiceLabel = (id: string) => byId(VOLUME_ESTIMATOR.choices, id).label

function selectVolume(id: string) {
  fireEvent.click(screen.getByRole("radio", { name: choiceLabel(id) }))
}

const sbsCard = () => within(screen.getByTestId(`plan-${SBS_PLAN.id}`))

describe("PricingPlans", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(BEFORE_DEADLINE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("arranca en 'Desde' con el tramo de entrada y el descuento de fundador", () => {
    render(<PricingPlans />)
    const sbs = sbsCard()

    expect(sbs.getByText("Desde")).toBeInTheDocument()
    expect(sbs.getByText(formatCop(ENTRY_TIER.listCop))).toBeInTheDocument()
    expect(sbs.getByText(formatCop(founderCop(ENTRY_TIER.listCop)))).toBeInTheDocument()
    expect(sbs.getByText(ENTRY_TIER.volumeBullet)).toBeInTheDocument()
    expect(sbs.getByText(FOUNDERS.discountBadge)).toBeInTheDocument()
  })

  it("cambia precio, tachado y bullet de volumen al elegir un tramo", () => {
    render(<PricingPlans />)
    selectVolume("300_3k")
    const sbs = sbsCard()

    expect(sbs.getByText(formatCop(UPPER_TIER.listCop))).toBeInTheDocument()
    expect(sbs.getByText(formatCop(founderCop(UPPER_TIER.listCop)))).toBeInTheDocument()
    expect(sbs.getByText(UPPER_TIER.volumeBullet)).toBeInTheDocument()
    // Con tramo elegido el precio deja de ser aproximado
    expect(sbs.queryByText("Desde")).not.toBeInTheDocument()
  })

  it("mueve el sello 'Tu plan' a Enterprise sin quitarle su badge a SBS", () => {
    render(<PricingPlans />)

    selectVolume("lt_300")
    expect(sbsCard().getByText(VOLUME_ESTIMATOR.recommendedBadge)).toBeInTheDocument()

    selectVolume("gt_3k")
    expect(
      within(screen.getByTestId(`plan-${ENTERPRISE_PLAN.id}`)).getByText(
        VOLUME_ESTIMATOR.recommendedBadge,
      ),
    ).toBeInTheDocument()

    const sbs = sbsCard()
    expect(sbs.queryByText(VOLUME_ESTIMATOR.recommendedBadge)).not.toBeInTheDocument()
    expect(sbs.getByText(String(SBS_PLAN.badge))).toBeInTheDocument()
    // Sin tramo aplicable, SBS vuelve a su precio de entrada aproximado
    expect(sbs.getByText("Desde")).toBeInTheDocument()
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

    for (const id of ["free_trial", "sbs"]) {
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
    const sbs = sbsCard()

    expect(sbs.getByText(formatCop(ENTRY_TIER.listCop))).toBeInTheDocument()
    expect(sbs.queryByText(FOUNDERS.discountBadge)).not.toBeInTheDocument()
    expect(sbs.queryByText(formatCop(founderCop(ENTRY_TIER.listCop)))).not.toBeInTheDocument()
  })
})
