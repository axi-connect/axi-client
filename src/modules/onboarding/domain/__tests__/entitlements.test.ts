import { offerLabel, quoteLine, trialEndsLabel, type EntitlementsDTO, type EntitlementsQuote } from "../entitlements"

const base: EntitlementsDTO = {
  offer_kind: "package",
  plans: [{ id: "p1", code: "trial", public_slug: "free_trial", kind: "package", name: "Prueba gratuita" }],
  capabilities: ["core"],
  pending_offer: null,
  quote: null,
  trial: { active: true, ends_at: "2026-09-08T10:00:00Z" },
  included: [],
}

describe("entitlements", () => {
  it("formatea la fecha de fin de la prueba y calla sin trial", () => {
    expect(trialEndsLabel(base)).toBe("Vence el 8 de septiembre")
    expect(trialEndsLabel({ ...base, trial: { active: false, ends_at: null } })).toBeNull()
    expect(trialEndsLabel({ ...base, trial: { active: true, ends_at: "no-es-fecha" } })).toBeNull()
  })

  it("nombra la oferta: paquete, un módulo o N módulos", () => {
    expect(offerLabel(base)).toBe("Prueba gratuita")
    const one = { ...base, plans: [{ id: "m", code: "crm", public_slug: "crm", kind: "module" as const, name: "CRM con IA" }] }
    expect(offerLabel(one)).toBe("Módulo CRM con IA")
    expect(offerLabel({ ...one, plans: [...one.plans, { ...one.plans[0], id: "m2", name: "Agenda" }] })).toBe("2 módulos")
    expect(offerLabel({ ...base, plans: [] })).toBe("Tu prueba")
  })

  describe("quoteLine", () => {
    const quote: EntitlementsQuote = {
      amount_cents: 22_190_000,
      list_amount_cents: 36_980_000,
      currency: "COP",
      interval: "monthly",
      volume_tier_code: "t1000",
      volume_label: "1.000",
      promotion_code: "founders_2026",
      promotion_name: "Programa Fundadores",
      promotion_outcome: "applied",
      expires_at: "2026-12-31T05:00:00.000Z",
    }

    it("dice cuánto se paga tras la prueba, con el tramo, el periodo y la promoción hasta su fecha", () => {
      expect(quoteLine({ ...base, quote })).toEqual({
        text: "Tras la prueba: $221.900/mes · 1.000 conversaciones al mes · pago mensual · Programa Fundadores hasta el 31 de diciembre de 2026",
        closed: false,
      })
    })

    it("en anual muestra el total por 12 meses y calla la promoción que no se aplicó", () => {
      expect(quoteLine({ ...base, quote: { ...quote, interval: "annual", amount_cents: 244_090_000, promotion_outcome: "not_applicable", promotion_name: null } })).toEqual({
        text: "Tras la prueba: $2.440.900 por 12 meses · 1.000 conversaciones al mes · pago anual",
        closed: false,
      })
    })

    it("si la promoción cerró mientras se registraba, lo dice con el precio de lista", () => {
      expect(quoteLine({ ...base, quote: { ...quote, amount_cents: 36_980_000, promotion_outcome: "closed" } })).toEqual({
        text: "La promoción cerró mientras te registrabas: tu precio tras la prueba es $369.800/mes · 1.000 conversaciones al mes",
        closed: true,
      })
    })

    it("sin cotización no hay línea", () => {
      expect(quoteLine(base)).toBeNull()
    })
  })
})
