import {
  ANNUAL_PAID_MONTHS,
  DEFAULT_VOLUME_ID,
  FOUNDERS,
  MODULES,
  MONTHS_PER_YEAR,
  PRICING,
  PRICING_VOLUMES,
  annualTotalCop,
  countdownParts,
  daysUntil,
  formatCop,
  formatDeadline,
  formatDeadlineLong,
  founderCop,
  foundersOfferOpen,
  foundersRemaining,
  offerByCode,
  planById,
  planListCop,
  planMonthlyCop,
  pricingPackages,
  publishableModules,
  volumeById,
} from "../landing.content"

/** Tramos con cifra: `max` es «a la medida» y no tiene precio de catálogo. */
const PRICED_VOLUMES = PRICING_VOLUMES.filter((volume) => volume.feeCop !== null)

describe("precios de fundador", () => {

  it("aplica el descuento del content y termina en novecientos como el catálogo", () => {
    // El descuento vive en un solo sitio: si cambia, estos precios cambian
    // con él. Nada de cifras escritas dos veces en la tarjeta.
    expect(FOUNDERS.discount).toBe(0.4)
    expect(founderCop(189_900)).toBe(113_900)
    expect(founderCop(449_900)).toBe(269_900)
    expect(founderCop(899_900)).toBe(539_900)
  })

  it("jamás entrega un descuento MENOR al prometido", () => {
    // Redondear al millar más cercano subiría el precio por encima del 40 % en
    // la mitad de los casos, y la promesa de la página es un número exacto.
    for (const plan of pricingPackages()) {
      for (const volume of PRICED_VOLUMES) {
        const list = planListCop(plan, volume.id) as number
        expect(founderCop(list)).toBeLessThanOrEqual(list * (1 - FOUNDERS.discount))
      }
    }
  })

  it("nunca deja un precio de fundador por encima del de lista", () => {
    for (const plan of pricingPackages()) {
      for (const volume of PRICED_VOLUMES) {
        const list = planListCop(plan, volume.id) as number
        expect(founderCop(list)).toBeLessThan(list)
      }
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

  it("la oferta se cierra por cupos O por fecha, lo que ocurra primero", () => {
    // Los dos consumidores que NO comprobaban la fecha —el dato estructurado
    // que lee Google y el precio del registro— entregaban precio de fundador
    // pasado el cierre. Ahora los tres pasan por esta única puerta.
    const antes = new Date("2026-10-01T10:00:00")
    const despues = new Date("2027-01-02T10:00:00")
    expect(foundersOfferOpen(antes)).toBe(true)
    expect(foundersOfferOpen(despues)).toBe(false)
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

describe("los dos ejes del precio", () => {
  it("el precio es la suma de la tarifa del paquete y la del volumen", () => {
    // Es la regla que la sección dice en voz alta: el paquete cobra las
    // funciones y el volumen cobra las conversaciones. Si esto deja de
    // cumplirse, el discurso de la página pasa a ser falso.
    for (const plan of pricingPackages()) {
      for (const volume of PRICED_VOLUMES) {
        expect(planListCop(plan, volume.id)).toBe((plan.planFeeCop as number) + (volume.feeCop as number))
      }
    }
  })

  it("los tramos de volumen suben de conversaciones y de precio a la vez", () => {
    const fees = PRICED_VOLUMES.map((volume) => volume.feeCop as number)
    const sizes = PRICED_VOLUMES.map((volume) => volume.conversations as number)
    expect(fees).toEqual([...fees].sort((a, b) => a - b))
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
    expect(new Set(fees).size).toBe(fees.length)
  })

  it("el orden de los paquetes se sostiene en TODOS los tramos, no solo en uno", () => {
    // Un precio que se cruza en el tramo alto convierte la escalera en una
    // trampa: saldría más barato el paquete de arriba.
    for (const volume of PRICED_VOLUMES) {
      const prices = pricingPackages().map((plan) => planListCop(plan, volume.id) as number)
      expect(prices).toEqual([...prices].sort((a, b) => a - b))
      expect(new Set(prices).size).toBe(prices.length)
    }
  })

  it("por encima del catálogo no publica ninguna cifra", () => {
    // Inventar un precio ahí es renegociarlo después: se pasa a ventas.
    const over = PRICING_VOLUMES[PRICING_VOLUMES.length - 1]
    expect(over.feeCop).toBeNull()
    expect(over.conversations).toBeNull()
    for (const plan of pricingPackages()) {
      expect(planListCop(plan, over.id)).toBeNull()
      expect(planMonthlyCop(plan, over.id)).toBeNull()
    }
  })

  it("el plan anual factura once meses y regala uno: doce de servicio", () => {
    expect(MONTHS_PER_YEAR - ANNUAL_PAID_MONTHS).toBe(1)
    for (const plan of pricingPackages()) {
      const monthly = planMonthlyCop(plan, DEFAULT_VOLUME_ID) as number
      expect(annualTotalCop(monthly)).toBe(monthly * ANNUAL_PAID_MONTHS)
      // El ahorro es exactamente una mensualidad, ni un peso más.
      expect(monthly * MONTHS_PER_YEAR - annualTotalCop(monthly)).toBe(monthly)
    }
  })

  it("el tramo por defecto existe en el catálogo y tiene precio", () => {
    expect(volumeById(DEFAULT_VOLUME_ID).feeCop).not.toBeNull()
  })
})

describe("catálogo de planes", () => {
  it("usa los nombres oficiales del backend", () => {
    const names = PRICING.plans.map((plan) => plan.name)
    expect(names).toEqual(["Free Trial", "Esencial", "Crecimiento", "Escala", "Enterprise"])
  })

  it("solo tres planes se comparan como tarjeta; la prueba y Enterprise no", () => {
    expect(pricingPackages().map((plan) => plan.id)).toEqual(["esencial", "crecimiento", "escala"])
    expect(planById("free_trial")?.group).toBe("trial")
    expect(planById("enterprise")?.group).toBe("enterprise")
  })

  it("cada paquete declara de cuál hereda, y el de entrada no hereda de nadie", () => {
    // La tarjeta lo dice («Todo lo de Esencial, y además») y tiene que ser
    // verdad: las viñetas son acumulativas.
    const [entry, ...rest] = pricingPackages()
    expect(entry.inheritsFrom).toBeNull()
    const names = pricingPackages().map((plan) => plan.name)
    rest.forEach((plan, index) => expect(plan.inheritsFrom).toBe(names[index]))
  })

  it("destaca exactamente un plan", () => {
    expect(PRICING.plans.filter((plan) => plan.featured)).toHaveLength(1)
  })

  it("ninguna viñeta de paquete habla de volumen: ese es el OTRO eje", () => {
    // Antes el volumen vivía en el primer bullet. Con dos ejes, dejarlo ahí lo
    // desincroniza del selector en cuanto alguien edita uno de los dos.
    for (const plan of pricingPackages()) {
      for (const bullet of plan.bullets) {
        expect(bullet).not.toMatch(/\bconversaciones (con IA )?al mes\b/i)
      }
    }
  })
})

describe("catálogo de módulos", () => {
  it("cada módulo tiene un offer_code único que no choca con un Paquete", () => {
    const codes = MODULES.map((offer) => offer.offer_code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const plan of PRICING.plans) expect(codes).not.toContain(plan.id)
  })

  it("resuelve Paquetes por id y Módulos por offer_code", () => {
    // `sbs` NO se resuelve aquí: su alias vive en `RETIRED_PACKAGES`, dentro de
    // `signup-draft`, que es quien recibe los enlaces viejos.
    expect(offerByCode("esencial")).toBe(planById("esencial"))
    expect(offerByCode("sbs")).toBeNull()
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
