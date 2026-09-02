import {
  FOUNDERS,
  MODULES,
  PRICING,
  SBS_TIERS,
  VOLUME_ESTIMATOR,
  countdownParts,
  daysUntil,
  formatCop,
  formatDeadline,
  formatDeadlineLong,
  founderCop,
  foundersRemaining,
  offerByCode,
  publishableModules,
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

describe("validación de la fecha de cierre", () => {
  // Un "2026-09-31" NO lanza error en JS: el parser laxo de V8 lo rueda al 1 de
  // octubre. Así se publicó una vez una fecha equivocada que además adelantaba
  // el cierre del programa. Estas pruebas son la red que faltaba.
  const IMPOSSIBLE = ["2026-09-31", "2026-02-30", "2026-04-31", "2026-13-01"]

  it.each(IMPOSSIBLE)("rechaza %s en vez de rodar al día siguiente", (iso) => {
    expect(() => formatDeadline(iso)).toThrow(/no existe en el calendario/)
    expect(() => formatDeadlineLong(iso)).toThrow(/no existe en el calendario/)
    expect(() => daysUntil(iso, new Date("2026-01-01T10:00:00"))).toThrow(
      /no existe en el calendario/,
    )
    expect(() => countdownParts(iso, new Date("2026-01-01T10:00:00"))).toThrow(
      /no existe en el calendario/,
    )
  })

  it("acepta el último día de un mes de 30 y un 29 de febrero bisiesto", () => {
    expect(formatDeadline("2026-09-30")).toBe("30 de septiembre")
    // 2028 sí es bisiesto: el guard no debe pasarse de estricto.
    expect(formatDeadline("2028-02-29")).toBe("29 de febrero")
  })

  it("FOUNDERS.deadline es una fecha real del calendario", () => {
    // La aserción que habría atrapado el bug el día que se introdujo, y la que
    // protege cada renovación del ciclo del programa.
    expect(() => formatDeadlineLong(FOUNDERS.deadline)).not.toThrow()
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

describe("catálogo de módulos", () => {
  it("cada módulo tiene un offer_code único que no choca con un Paquete", () => {
    const codes = MODULES.map((offer) => offer.offer_code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const plan of PRICING.plans) expect(codes).not.toContain(plan.id)
  })

  it("resuelve Paquetes por id y Módulos por offer_code", () => {
    expect(offerByCode("sbs")).toBe(PRICING.plans[1])
    expect(offerByCode("calls")).toBe(MODULES[0])
    expect(offerByCode("no-existe")).toBeNull()
  })

  it("la equivalencia de una cuota usa otra unidad, o no dice nada", () => {
    for (const offer of MODULES) {
      const { allowance } = offer
      if (allowance.equivalent) expect(allowance.equivalent.unit).not.toBe(allowance.unit)
    }
  })

  it("todo módulo abre el registro con su id preseleccionado y tiene precio positivo", () => {
    for (const offer of MODULES) {
      expect(offer.cta.href).toBe(`/comenzar?modulo=${offer.id}`)
      expect(offer.listCop).toBeGreaterThan(0)
    }
  })

  it("solo publica al JSON-LD los módulos con precio final", () => {
    for (const offer of publishableModules()) expect(offer.priceStatus).toBe("final")
    expect(publishableModules().length).toBeLessThanOrEqual(MODULES.length)
  })
})
