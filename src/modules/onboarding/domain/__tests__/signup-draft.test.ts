import {
  EMPTY_SIGNUP_DRAFT,
  blockerForSignupStep,
  reachableSignupStep,
  normalizeNit,
  normalizeVolumeId,
  offerAxes,
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
import { FIXTURE_CATALOG, FIXTURE_CATALOG_SOLD_OUT, FIXTURE_NOW } from "@/modules/landing/domain/testing/catalog.fixture"
import { MODULES, formatCop, planMonthlyCop, volumeById } from "@/modules/landing/public"

const params = (query: string) => new URLSearchParams(query)
const CATALOG = FIXTURE_CATALOG

describe("parseOfferQuery", () => {
  it("arrastra los dos ejes que eligió el visitante en la sección de precios", () => {
    expect(parseOfferQuery(params("plan=escala&volumen=t5000&periodo=annual"), CATALOG).selection).toEqual({
      kind: "package",
      code: "escala",
      volume: "t5000",
      period: "annual",
    })
  })

  it("un enlace del catálogo viejo con el volumen numérico aterriza en el tramo (B9)", () => {
    // Los CTAs publicados llevaban `volumen=5000`; hoy el tramo se llama `t5000`.
    expect(normalizeVolumeId("5000")).toBe("t5000")
    expect(normalizeVolumeId("t5000")).toBe("t5000")
    expect(parseOfferQuery(params("plan=escala&volumen=5000"), CATALOG).selection).toEqual({
      kind: "package",
      code: "escala",
      volume: "t5000",
    })
  })

  it("un eje con un valor inventado se ignora en vez de romper el alta", () => {
    expect(parseOfferQuery(params("plan=escala&volumen=9x9&periodo=bienal"), CATALOG).selection).toEqual({
      kind: "package",
      code: "escala",
    })
  })

  it("sin catálogo no valida el volumen: el alta sigue, el precio queda a confirmar", () => {
    expect(parseOfferQuery(params("plan=escala&volumen=t5000"), null).selection).toEqual({
      kind: "package",
      code: "escala",
    })
  })

  it("preselecciona un paquete autoservicio", () => {
    expect(parseOfferQuery(params("plan=crecimiento"), CATALOG)).toEqual({
      selection: { kind: "package", code: "crecimiento" },
      redirectTo: null,
    })
  })

  it("manda Enterprise a ventas en vez de intentar el alta", () => {
    expect(parseOfferQuery(params("plan=enterprise"), CATALOG).redirectTo).toBe("/contacto")
  })

  it("preselecciona módulos e ignora los códigos que no existen", () => {
    expect(parseOfferQuery(params("modulo=calls,inventado,crm"), CATALOG).selection).toEqual({
      kind: "modules",
      codes: ["calls", "crm"],
    })
  })

  it("sin query ni códigos válidos no preselecciona nada", () => {
    expect(parseOfferQuery(params(""), CATALOG).selection).toBeNull()
    expect(parseOfferQuery(params("modulo=inventado"), CATALOG).selection).toBeNull()
    expect(parseOfferQuery(params("plan=inventado"), CATALOG).selection).toBeNull()
  })

  it("un enlace publicado del catálogo viejo aterriza en su equivalente", () => {
    // Hay CTAs con `?plan=sbs` en enlaces compartidos y marcadores. Quien
    // llegue por ahí debe encontrar el paquete equivalente, no un error.
    expect(parseOfferQuery(params("plan=sbs"), CATALOG).selection).toEqual({
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

  it("con dos o más módulos avisa de que el paquete sale mejor, si hay catálogo", () => {
    expect(packageBeatsModules({ kind: "modules", codes: ["calls"] }, CATALOG)).toBe(false)
    expect(packageBeatsModules({ kind: "modules", codes: ["calls", "leads"] }, CATALOG)).toBe(true)
    // Sin cifras no hay comparación que hacer: no se afirma nada.
    expect(packageBeatsModules({ kind: "modules", codes: ["calls", "leads"] }, null)).toBe(false)
  })

  it("resume la oferta para el rail con las cifras del catálogo", () => {
    const summary = offerSummary({ kind: "modules", codes: ["crm", "scheduling"] }, CATALOG, FIXTURE_NOW)
    expect(summary.kind).toBe("Módulos")
    expect(summary.lines).toHaveLength(2)
    expect(summary.afterTrial).toBe(
      `${formatCop(CATALOG.modulePrices.crm + CATALOG.modulePrices.scheduling)} COP/mes`,
    )

    expect(offerSummary({ kind: "package", code: "free_trial" }, CATALOG, FIXTURE_NOW).afterTrial).toBeNull()

    // Un paquete lleva el precio exacto de SU tramo: el elegido o el por defecto.
    const paquete = offerSummary({ kind: "package", code: "crecimiento", volume: "t5000" }, CATALOG, FIXTURE_NOW)
    expect(paquete.approximate).toBe(false)
    expect(paquete.lines).toContainEqual({
      label: "Conversaciones",
      value: `${volumeById(CATALOG, "t5000").label} al mes`,
    })
    expect(paquete.afterTrial).toBe(
      `${formatCop(planMonthlyCop(CATALOG, "crecimiento", "t5000", FIXTURE_NOW) as number)} COP/mes`,
    )
  })

  it("sin catálogo el eje de volumen queda sin resolver, nunca en «max» (B4)", () => {
    expect(offerAxes({ kind: "package", code: "crecimiento" }, null).volume).toBeUndefined()
    expect(offerAxes({ kind: "package", code: "crecimiento" }, CATALOG).volume).toBe(CATALOG.defaultVolumeId)
    expect(offerAxes({ kind: "package", code: "crecimiento", volume: "t5000" }, CATALOG).volume).toBe("t5000")
  })

  it("sin catálogo el rail dice «a confirmar» en vez de inventar un precio", () => {
    expect(offerSummary({ kind: "package", code: "crecimiento" }, null).afterTrial).toBe("Precio a confirmar")
    const modules = offerSummary({ kind: "modules", codes: ["crm"] }, null)
    expect(modules.afterTrial).toBe("Precio a confirmar")
    expect(modules.lines[0].value).toBe("A confirmar")
  })
})

describe("bloqueos por paso", () => {
  const withOffer: SignupDraft = { ...EMPTY_SIGNUP_DRAFT, offer: { kind: "package", code: "crecimiento" } }

  const company = { name: "La Parrilla", nit: "901.234.567-8", country_code: "CO", city: "Medellín", timezone: "America/Bogota" }

  it("no deja avanzar a Empresa sin oferta ni a Cuenta sin empresa", () => {
    expect(blockerForSignupStep("company", EMPTY_SIGNUP_DRAFT)).not.toBeNull()
    expect(blockerForSignupStep("company", withOffer)).toBeNull()
    expect(blockerForSignupStep("account", withOffer)).toMatch(/empresa/i)
  })

  it("cada pantalla exige la anterior respondida: identidad, ubicación y persona", () => {
    const identity: SignupDraft = { ...withOffer, company: { ...company, city: "" } }
    expect(blockerForSignupStep("location", withOffer)).toMatch(/empresa/i)
    expect(blockerForSignupStep("location", identity)).toBeNull()
    expect(blockerForSignupStep("owner", identity)).toMatch(/empresa/i)
    const located: SignupDraft = { ...withOffer, company }
    expect(blockerForSignupStep("owner", located)).toBeNull()
    expect(blockerForSignupStep("account", located)).toMatch(/quién eres/i)
    const owner: SignupDraft = { ...located, account: { name: "Joao", email: "joao@laparrilla.co", password: "", accept_terms: false } }
    expect(blockerForSignupStep("account", owner)).toBeNull()
  })

  it("al recargar se vuelve al paso más lejano que las respuestas permitan", () => {
    expect(reachableSignupStep(4, withOffer)).toBe(1)
    expect(reachableSignupStep(4, { ...withOffer, company })).toBe(3)
    expect(reachableSignupStep(2, { ...withOffer, company })).toBe(2)
    expect(reachableSignupStep(3, EMPTY_SIGNUP_DRAFT)).toBe(0)
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

  it("con catálogo manda lo que el visitante vio: tramo, periodo y promoción abierta (Tanda B)", () => {
    const pkg: SignupDraft = { ...draft, offer: { kind: "package", code: "crecimiento", volume: "t1000", period: "annual" } }
    expect(toSignupPayload(pkg, { captcha_token: "tok", website: "" }, CATALOG, FIXTURE_NOW).offer).toEqual({
      kind: "package",
      codes: ["crecimiento"],
      volume_tier: "t1000",
      interval: "annual",
      promotion_code: "founders_2026",
    })
    // Sin ejes elegidos viaja el tramo por defecto del catálogo y el periodo mensual.
    const plain: SignupDraft = { ...draft, offer: { kind: "package", code: "esencial" } }
    expect(toSignupPayload(plain, { captcha_token: "tok", website: "" }, CATALOG, FIXTURE_NOW).offer).toEqual({
      kind: "package",
      codes: ["esencial"],
      volume_tier: CATALOG.defaultVolumeId,
      interval: "monthly",
      promotion_code: "founders_2026",
    })
  })

  it("la promoción no viaja si cerró; sin catálogo no viaja nada y el servidor decide; los módulos no llevan tramo", () => {
    const pkg: SignupDraft = { ...draft, offer: { kind: "package", code: "crecimiento", volume: "t1000" } }
    expect(toSignupPayload(pkg, { captcha_token: "tok", website: "" }, FIXTURE_CATALOG_SOLD_OUT, FIXTURE_NOW).offer).toEqual({
      kind: "package",
      codes: ["crecimiento"],
      volume_tier: "t1000",
      interval: "monthly",
    })
    expect(toSignupPayload(pkg, { captcha_token: "tok", website: "" }, null, FIXTURE_NOW).offer).toEqual({ kind: "package", codes: ["crecimiento"] })
    expect(toSignupPayload(draft, { captcha_token: "tok", website: "" }, CATALOG, FIXTURE_NOW).offer).toEqual({
      kind: "module",
      codes: ["crm"],
      promotion_code: "founders_2026",
    })
    const trial: SignupDraft = { ...draft, offer: { kind: "package", code: "free_trial" } }
    expect(toSignupPayload(trial, { captcha_token: "tok", website: "" }, CATALOG, FIXTURE_NOW).offer).toEqual({ kind: "package", codes: ["free_trial"] })
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
