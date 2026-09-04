import {
  EMPTY_SIGNUP_DRAFT,
  blockerForSignupStep,
  normalizeNit,
  offerBlocker,
  offerCodesOf,
  offerSummary,
  packageBeatsModules,
  parseOfferQuery,
  passwordStrength,
  toSignupPayload,
  toggleModule,
  type SignupDraft,
} from "../signup-draft"
import { MODULES } from "@/modules/landing/public"

const params = (query: string) => new URLSearchParams(query)

describe("parseOfferQuery", () => {
  it("preselecciona un paquete autoservicio", () => {
    expect(parseOfferQuery(params("plan=sbs"))).toEqual({
      selection: { kind: "package", code: "sbs" },
      redirectTo: null,
    })
  })

  it("manda Enterprise a ventas en vez de intentar el alta", () => {
    expect(parseOfferQuery(params("plan=enterprise")).redirectTo).toBe("/contacto")
  })

  it("preselecciona módulos e ignora los códigos que no existen", () => {
    expect(parseOfferQuery(params("modulo=calls,inventado,crm")).selection).toEqual({
      kind: "modules",
      codes: ["calls", "crm"],
    })
  })

  it("sin query ni códigos válidos no preselecciona nada", () => {
    expect(parseOfferQuery(params("")).selection).toBeNull()
    expect(parseOfferQuery(params("modulo=inventado")).selection).toBeNull()
    expect(parseOfferQuery(params("plan=inventado")).selection).toBeNull()
  })

  it("un enlace publicado del catálogo viejo aterriza en su equivalente", () => {
    // Hay CTAs con `?plan=sbs` en enlaces compartidos y marcadores. Quien
    // llegue por ahí debe encontrar el paquete equivalente, no un error.
    expect(parseOfferQuery(params("plan=sbs")).selection).toEqual({
      kind: "package",
      code: "crecimiento",
    })
  })
})

describe("selección de oferta", () => {
  it("un paquete y los módulos nunca conviven: alternar un módulo descarta el paquete", () => {
    const fromPackage = toggleModule({ kind: "package", code: "crecimiento" }, "calls")
    expect(fromPackage).toEqual({ kind: "modules", codes: ["calls"] })

    const removed = toggleModule({ kind: "modules", codes: ["calls", "crm"] }, "calls")
    expect(removed).toEqual({ kind: "modules", codes: ["crm"] })
  })

  it("explica por qué no se puede continuar", () => {
    expect(offerBlocker(null)).toMatch(/elige un paquete/i)
    expect(offerBlocker({ kind: "modules", codes: [] })).toMatch(/al menos un módulo/i)
    expect(offerBlocker({ kind: "package", code: "free_trial" })).toBeNull()
  })

  it("los códigos que viajan son el id del paquete o los offer_code de los módulos", () => {
    expect(offerCodesOf({ kind: "package", code: "free_trial" })).toEqual(["free_trial"])
    const codes = offerCodesOf({ kind: "modules", codes: ["calls", "scheduling"] })
    expect(codes).toEqual(
      MODULES.filter((offer) => offer.id === "calls" || offer.id === "scheduling").map((offer) => offer.offer_code),
    )
  })

  it("con dos o más módulos avisa de que el paquete sale mejor", () => {
    expect(packageBeatsModules({ kind: "modules", codes: ["calls"] })).toBe(false)
    expect(packageBeatsModules({ kind: "modules", codes: ["calls", "leads"] })).toBe(true)
  })

  it("resume la oferta para el rail sin duplicar cifras del content", () => {
    const summary = offerSummary({ kind: "modules", codes: ["crm", "scheduling"] })
    expect(summary.kind).toBe("Módulos")
    expect(summary.lines).toHaveLength(2)
    expect(summary.afterTrial).toContain("COP/mes")

    expect(offerSummary({ kind: "package", code: "free_trial" }).afterTrial).toBeNull()
    // Un paquete de pago ya tiene precio exacto: dejó de depender de un tramo.
    const paquete = offerSummary({ kind: "package", code: "crecimiento" })
    expect(paquete.approximate).toBe(false)
    expect(paquete.afterTrial).toContain("COP/mes")
  })
})

describe("bloqueos por paso", () => {
  const withOffer: SignupDraft = { ...EMPTY_SIGNUP_DRAFT, offer: { kind: "package", code: "crecimiento" } }

  it("no deja avanzar a Empresa sin oferta ni a Cuenta sin empresa", () => {
    expect(blockerForSignupStep("company", EMPTY_SIGNUP_DRAFT)).not.toBeNull()
    expect(blockerForSignupStep("company", withOffer)).toBeNull()
    expect(blockerForSignupStep("account", withOffer)).toMatch(/empresa/i)
  })
})

describe("wire del alta", () => {
  const draft: SignupDraft = {
    offer: { kind: "modules", codes: ["crm"] },
    company: { name: " La Parrilla de Joao ", nit: "901.234.567-8", country_code: "CO", city: "Medellín", timezone: "America/Bogota" },
    account: { name: "Joao Pereira", email: "Joao@LaParrilla.co ", password: "Parrilla2026!", accept_terms: true },
  }

  it("normaliza NIT y correo y viaja en snake_case", () => {
    const payload = toSignupPayload(draft, { captcha_token: "tok", website: "" })
    expect(payload.company.nit).toBe("901234567-8")
    expect(payload.company.name).toBe("La Parrilla de Joao")
    expect(payload.owner.email).toBe("joao@laparrilla.co")
    expect(payload.offer).toEqual({ kind: "module", codes: ["crm"] })
    expect(payload.accepted_terms).toBe(true)
  })

  it("lanza si el borrador está incompleto (bug del orquestador, no del usuario)", () => {
    expect(() => toSignupPayload(EMPTY_SIGNUP_DRAFT, { captcha_token: "", website: "" })).toThrow(/oferta/)
    expect(() =>
      toSignupPayload({ ...draft, account: { ...draft.account!, accept_terms: false } }, { captcha_token: "", website: "" }),
    ).toThrow(/términos/)
  })

  it("normaliza el NIT quitando puntos y espacios", () => {
    expect(normalizeNit(" 900.123.456-7 ")).toBe("900123456-7")
  })

  it("puntúa la contraseña por criterios, no por longitud sola", () => {
    expect(passwordStrength("corta")).toBe(0)
    expect(passwordStrength("solominusculas")).toBe(2)
    expect(passwordStrength("Parrilla2026")).toBe(3)
    expect(passwordStrength("Parrilla2026!")).toBe(4)
  })
})
