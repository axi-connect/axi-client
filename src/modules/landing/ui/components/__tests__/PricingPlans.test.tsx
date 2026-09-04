import { fireEvent, render, screen, within } from "@testing-library/react"

import { PricingPlans } from "../PricingPlans"
import {
  DEFAULT_VOLUME_ID,
  FOUNDERS,
  MONTHS_PER_YEAR,
  annualTotalCop,
  formatCop,
  formatDeadlineLong,
  planById,
  planListCop,
  planMonthlyCop,
  pricingPackages,
  volumeById,
  type PricingPlan,
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

/**
 * El EJE DE VOLUMEN no se ejercita desde aquí. Su control es el `Select` de
 * Radix, que abre por eventos de puntero con `hasPointerCapture` y `scrollIntoView`
 * — jsdom no implementa ninguno de los dos, así que un test de interacción ahí
 * probaría los polyfills y no el precio. La aritmética de los dos ejes se
 * verifica entera en `content/__tests__/pricing.test.ts`; esto prueba lo que la
 * sección PINTA en el tramo por defecto.
 */
const VOLUME = DEFAULT_VOLUME_ID

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
const listOf = (plan: PricingPlan) => planListCop(plan, VOLUME) as number
const monthlyOf = (plan: PricingPlan) => planMonthlyCop(plan, VOLUME) as number

describe("PricingPlans", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(BEFORE_DEADLINE)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("pinta TRES tarjetas comparables: ni la prueba ni Enterprise ocupan fila", () => {
    // La versión de cinco tarjetas partía la rejilla en dos filas y dejaba a
    // cada una por debajo de un ancho legible. La prueba se mudó al rail y
    // Enterprise a su franja: ninguna de las dos reacciona al volumen.
    render(<PricingPlans />)

    expect(pricingPackages()).toHaveLength(3)
    expect(screen.queryByTestId("plan-free_trial")).not.toBeInTheDocument()
    for (const plan of pricingPackages()) {
      expect(screen.getByTestId(`plan-${plan.id}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId(`plan-${ENTERPRISE_PLAN.id}`)).toBeInTheDocument()
  })

  it("cada paquete muestra su propio precio, su tachado y el sello de fundador", () => {
    render(<PricingPlans />)

    for (const plan of [ENTRY_PLAN, FEATURED_PLAN, UPPER_PLAN]) {
      const card = cardOf(plan.id)
      expect(card.getByText(formatCop(listOf(plan)))).toBeInTheDocument()
      expect(card.getByText(formatCop(monthlyOf(plan)))).toBeInTheDocument()
      expect(card.getByText(FOUNDERS.discountBadge)).toBeInTheDocument()
    }
  })

  it("los tres escalones tienen precios distintos y crecientes al mismo volumen", () => {
    // Con dos ejes, lo que separa a los tres paquetes es SOLO la tarifa de
    // funciones: al mismo volumen tienen que seguir ordenados.
    render(<PricingPlans />)
    const prices = [ENTRY_PLAN, FEATURED_PLAN, UPPER_PLAN].map(listOf)
    expect(new Set(prices).size).toBe(3)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it("la prueba gratuita se anuncia en el rail y en los botones, no como tarjeta", () => {
    render(<PricingPlans />)

    expect(screen.getByText(/Empieza con 7 días gratis/i)).toBeInTheDocument()
    expect(screen.getByText(/No se necesita tarjeta de crédito/i)).toBeInTheDocument()
    for (const plan of pricingPackages()) {
      expect(cardOf(plan.id).getByRole("link")).toHaveTextContent(/7 días gratis/i)
    }
  })

  it("el botón arrastra los DOS ejes elegidos al registro", () => {
    // Sin ellos el alta empieza de cero y el visitante vuelve a elegir lo que
    // ya eligió aquí.
    render(<PricingPlans />)

    for (const plan of pricingPackages()) {
      expect(cardOf(plan.id).getByRole("link")).toHaveAttribute(
        "href",
        `/comenzar?plan=${plan.id}&volumen=${VOLUME}&periodo=monthly`,
      )
    }
  })

  it("el conmutador anual factura once meses y pone el ahorro en pesos", () => {
    render(<PricingPlans />)

    fireEvent.click(screen.getByRole("radio", { name: /anual/i }))

    const card = cardOf(FEATURED_PLAN.id)
    const monthly = monthlyOf(FEATURED_PLAN)
    // La cifra grande NO cambia: el beneficio es un mes gratis, no una tarifa
    // menor. Sale DOS veces —el precio y el ahorro— justamente porque el mes
    // que se regala vale exactamente una mensualidad.
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
    // Con dos ejes, repetir el volumen en las viñetas lo desincroniza del
    // selector en cuanto alguien edita una de las dos.
    render(<PricingPlans />)

    const card = cardOf(ENTRY_PLAN.id)
    // «conversaciones/mes» y no «conversaciones»: el texto para lector de
    // pantalla dice «al mes» y competiría por la misma búsqueda.
    expect(
      card.getByText(new RegExp(`${volumeById(VOLUME).label} conversaciones/mes`)),
    ).toBeInTheDocument()
    for (const bullet of ENTRY_PLAN.bullets) expect(bullet).not.toMatch(/conversaciones\/mes/i)
  })

  it("cada tarjeta declara lo que hereda de la anterior", () => {
    render(<PricingPlans />)

    expect(cardOf(ENTRY_PLAN.id).getByText("Incluye")).toBeInTheDocument()
    expect(cardOf(FEATURED_PLAN.id).getByText(/Todo lo de Esencial/)).toBeInTheDocument()
    expect(cardOf(UPPER_PLAN.id).getByText(/Todo lo de Crecimiento/)).toBeInTheDocument()
  })

  it("Enterprise sigue en ventas: nunca entra al registro autoservicio", () => {
    render(<PricingPlans />)
    const band = cardOf(ENTERPRISE_PLAN.id)
    expect(band.getByRole("link", { name: ENTERPRISE_PLAN.cta.label })).toHaveAttribute("href", "/contacto")
    expect(band.getByText(String(ENTERPRISE_PLAN.priceValue))).toBeInTheDocument()
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

    expect(card.getByText(formatCop(listOf(ENTRY_PLAN)))).toBeInTheDocument()
    expect(card.queryByText(FOUNDERS.discountBadge)).not.toBeInTheDocument()
  })
})
