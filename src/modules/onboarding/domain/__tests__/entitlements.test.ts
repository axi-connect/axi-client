import { offerLabel, trialEndsLabel, type EntitlementsDTO } from "../entitlements"

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
})
