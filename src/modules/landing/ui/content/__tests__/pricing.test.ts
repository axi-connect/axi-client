import {
  BILLING_PERIODS,
  FOUNDERS,
  MODULES,
  PRICING,
  countdownParts,
  daysUntil,
  formatCop,
  formatDeadline,
  formatDeadlineLong,
  foundersDiscountBadge,
  foundersHeadline,
  offerByCode,
  planById,
  pricingPackages,
} from "../landing.content"

/**
 * El content ya no tiene CIFRAS: solo copy y estructura. Las cifras y su
 * aritmética se prueban en `landing/domain/__tests__/public-catalog.test.ts`
 * sobre un catálogo de ejemplo con la forma exacta del API.
 */
describe("copy del Programa Fundadores", () => {
  it("el titular y el sello se derivan del descuento y los cupos del catálogo", () => {
    expect(foundersHeadline("−40 %", 20)).toBe("−40 % de descuento para las primeras 20 empresas.")
    expect(foundersHeadline("−40 %", null)).toBe("−40 % de descuento para las primeras empresas.")
    expect(foundersDiscountBadge("−40 %")).toBe("−40 % precio fundador")
  })

  it("la promesa es la del ajuste por inflación, no la de «congelada mientras sigas»", () => {
    // D6 del plan de alineación: la promesa perpetua sin ajuste no era sostenible.
    expect(FOUNDERS.promise).toMatch(/inflación/i)
    expect(FOUNDERS.promise).not.toMatch(/congelada/i)
  })

  it("no queda ninguna cifra del programa en el content", () => {
    expect(FOUNDERS).not.toHaveProperty("slots")
    expect(FOUNDERS).not.toHaveProperty("claimed")
    expect(FOUNDERS).not.toHaveProperty("discount")
    expect(FOUNDERS).not.toHaveProperty("deadline")
  })

  it("formatea pesos sin decimales y con separador de miles", () => {
    expect(formatCop(113_900)).toBe("$113.900")
    expect(formatCop(2_899_900)).toBe("$2.899.900")
  })
})

describe("fecha de cierre", () => {
  it("cuenta los días hasta el final del día de cierre", () => {
    expect(daysUntil("2026-12-31", new Date("2026-12-30T10:00:00"))).toBe(2)
    expect(daysUntil("2026-12-31", new Date("2027-01-01T10:00:00"))).toBeLessThanOrEqual(0)
  })

  it("formatea la fecha de cierre en español", () => {
    expect(formatDeadline("2026-12-31")).toMatch(/31 de diciembre/)
    expect(formatDeadlineLong("2026-12-31")).toMatch(/31 de diciembre de 2026/)
  })

  it("descompone el tiempo restante y clampa a cero una fecha vencida", () => {
    const parts = countdownParts("2026-12-31", new Date("2026-12-30T22:59:58"))
    expect(parts).toEqual({ days: 1, hours: 1, minutes: 0, seconds: 1 })
    expect(countdownParts("2026-12-31", new Date("2027-02-01T00:00:00"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })

  it("con el instante exacto del API la cuenta atrás no cierra antes que la promoción", () => {
    // El API cierra a las 05:00Z (medianoche en Bogotá). A las 03:00Z del 1 de
    // enero la promoción sigue abierta y faltan dos horas, en cualquier zona.
    const endsAt = "2027-01-01T05:00:00.000Z"
    expect(countdownParts(endsAt, new Date("2027-01-01T03:00:00.000Z"))).toEqual({
      days: 0,
      hours: 2,
      minutes: 0,
      seconds: 0,
    })
    expect(daysUntil(endsAt, new Date("2026-12-30T05:00:00.000Z"))).toBe(2)
  })

  it("una fecha imposible rompe el build en vez de rodar en silencio al día siguiente", () => {
    expect(() => formatDeadline("2026-09-31")).toThrow(/no existe/)
  })
})

describe("periodicidad", () => {
  it("el anual anuncia un mes gratis, derivado de los meses facturados", () => {
    expect(BILLING_PERIODS.find((period) => period.id === "annual")?.badge).toBe("1 mes gratis")
  })
})

describe("catálogo de planes (copy)", () => {
  it("usa los nombres oficiales del backend", () => {
    expect(PRICING.plans.map((plan) => plan.id)).toEqual([
      "free_trial",
      "esencial",
      "crecimiento",
      "escala",
      "enterprise",
    ])
  })

  it("solo tres planes se comparan como tarjeta; la prueba y Enterprise no", () => {
    expect(pricingPackages().map((plan) => plan.id)).toEqual(["esencial", "crecimiento", "escala"])
  })

  it("cada paquete declara de cuál hereda, y el de entrada no hereda de nadie", () => {
    expect(planById("esencial")?.inheritsFrom).toBeNull()
    expect(planById("crecimiento")?.inheritsFrom).toBe("Esencial")
    expect(planById("escala")?.inheritsFrom).toBe("Crecimiento")
  })

  it("destaca exactamente un plan", () => {
    expect(PRICING.plans.filter((plan) => plan.featured)).toHaveLength(1)
  })

  it("ninguna viñeta de paquete habla de volumen: ese es el OTRO eje", () => {
    for (const plan of pricingPackages()) {
      for (const bullet of plan.bullets) expect(bullet).not.toMatch(/conversaciones/i)
    }
  })

  it("ningún plan ni módulo lleva una cifra en pesos en el content", () => {
    for (const plan of PRICING.plans) {
      expect(plan).not.toHaveProperty("planFeeCop")
      if (plan.id !== "free_trial") expect(plan.priceValue).toBeNull()
    }
    for (const offer of MODULES) {
      expect(offer).not.toHaveProperty("listCop")
      expect(offer).not.toHaveProperty("priceStatus")
    }
  })
})

describe("catálogo de módulos (copy)", () => {
  it("cada módulo tiene un offer_code único que no choca con un Paquete", () => {
    const codes = MODULES.map((offer) => offer.offer_code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(planById(code)).toBeNull()
  })

  it("resuelve Paquetes por id y Módulos por offer_code", () => {
    expect(offerByCode("crecimiento")?.name).toBe("Crecimiento")
    expect(offerByCode("calls")?.name).toBe("Llamadas con IA")
    expect(offerByCode("inventado")).toBeNull()
  })

  it("la equivalencia de una cuota usa otra unidad, o no dice nada", () => {
    for (const offer of MODULES) {
      if (offer.allowance.equivalent) expect(offer.allowance.equivalent.unit).not.toBe(offer.allowance.unit)
    }
  })

  it("todo módulo abre el registro con su id preseleccionado", () => {
    for (const offer of MODULES) expect(offer.cta.href).toBe(`/comenzar?modulo=${offer.id}`)
  })
})
