import {
  FOUNDERS,
  PRICING,
  SBS_TIERS,
  VOLUME_ESTIMATOR,
  countdownParts,
  daysUntil,
  formatCop,
  formatDeadline,
  founderCop,
  foundersRemaining,
  sbsTier,
} from "../landing.content"

describe("precios de fundador", () => {
  it("aplica el descuento del content y redondea al millar", () => {
    // El descuento vive en un solo sitio: si cambia, estos precios cambian
    // con él. Nada de cifras escritas dos veces en la tarjeta.
    expect(FOUNDERS.discount).toBe(0.4)
    expect(founderCop(250_000)).toBe(150_000)
    expect(founderCop(850_000)).toBe(510_000)
  })

  it("nunca deja un precio de fundador por encima del de lista", () => {
    for (const tier of SBS_TIERS) {
      expect(founderCop(tier.listCop)).toBeLessThan(tier.listCop)
    }
  })

  it("formatea pesos sin decimales y con separador de miles", () => {
    expect(formatCop(150_000)).toBe("$150.000")
    expect(formatCop(1_250_000)).toBe("$1.250.000")
  })
})

describe("cupos y fecha de cierre", () => {
  it("cuenta los cupos restantes sin bajar de cero", () => {
    expect(foundersRemaining()).toBe(FOUNDERS.slots - FOUNDERS.claimed)
    expect(foundersRemaining()).toBeGreaterThanOrEqual(0)
  })

  it("no publica más cupos tomados que ofrecidos", () => {
    expect(FOUNDERS.claimed).toBeLessThanOrEqual(FOUNDERS.slots)
  })

  it("cuenta los días hasta el final del día de cierre", () => {
    // El día de cierre cuenta entero: la víspera quedan 2 días (hoy y mañana)
    // y el propio 31 todavía queda 1.
    expect(daysUntil("2026-10-31", new Date("2026-10-30T10:00:00"))).toBe(2)
    expect(daysUntil("2026-10-31", new Date("2026-10-31T10:00:00"))).toBe(1)
    // Vencida: el valor no positivo es lo que cierra la oferta y la devuelve
    // a precios de lista.
    expect(daysUntil("2026-10-31", new Date("2026-11-02T10:00:00"))).toBeLessThanOrEqual(0)
  })

  it("formatea la fecha de cierre en español, sin año", () => {
    expect(formatDeadline("2026-10-31")).toBe("31 de octubre")
  })

  it("descompone el tiempo restante en días, horas, minutos y segundos", () => {
    expect(countdownParts("2026-10-31", new Date("2026-10-28T18:00:00"))).toEqual({
      days: 3,
      hours: 5,
      minutes: 59,
      seconds: 59,
    })
  })

  it("clampa a cero una fecha ya vencida — nunca cifras negativas", () => {
    expect(countdownParts("2026-10-31", new Date("2026-11-05T10:00:00"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })

  it("mantiene coherentes daysUntil y countdownParts", () => {
    const now = new Date("2026-10-28T18:00:00")
    // daysUntil redondea hacia arriba (cuenta el día en curso); countdownParts
    // trunca, porque las horas sueltas van en su propia ficha.
    expect(daysUntil("2026-10-31", now)).toBe(countdownParts("2026-10-31", now).days + 1)
  })
})

describe("estimador de volumen", () => {
  it("apunta siempre a un tramo y a un plan que existen", () => {
    const planIds = PRICING.plans.map((plan) => plan.id)
    const tierIds = SBS_TIERS.map((tier) => tier.id)

    for (const choice of VOLUME_ESTIMATOR.choices) {
      if (choice.recommends) expect(planIds).toContain(choice.recommends)
      if (choice.tier) expect(tierIds).toContain(choice.tier)
      // Un tramo solo tiene sentido sobre el plan por volumen.
      if (choice.tier) expect(choice.recommends).toBe("sbs")
    }
  })

  it("resuelve el tramo por id y cae al de entrada si no existe", () => {
    expect(sbsTier("t3000").listCop).toBe(850_000)
    // @ts-expect-error — id inexistente: el fallback protege de un content mal editado
    expect(sbsTier("t9999")).toBe(SBS_TIERS[0])
  })
})

describe("catálogo de planes", () => {
  it("usa los nombres oficiales del backend", () => {
    const names = PRICING.plans.map((plan) => plan.name)
    expect(names).toEqual(["Free Trial", "Small Business Suite", "Enterprise"])
  })

  it("destaca exactamente un plan", () => {
    expect(PRICING.plans.filter((plan) => plan.featured)).toHaveLength(1)
  })

  it("el plan por tramos no lleva su volumen en los bullets (lo aporta el tramo)", () => {
    const sbs = PRICING.plans.find((plan) => plan.priceKind === "tiered")
    expect(sbs?.bullets.some((bullet) => bullet.includes("conversaciones/mes"))).toBe(false)
  })
})
