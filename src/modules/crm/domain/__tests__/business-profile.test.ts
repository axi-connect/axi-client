import type { ContactDataField } from "../contact-data";
import {
  businessDecisionMakerOf,
  businessProfileOf,
  hasBusinessProfile,
  isBusinessProfileField,
  safeHttpUrl,
} from "../business-profile";

function field(code: string, value: string | null, overrides: Partial<ContactDataField> = {}): ContactDataField {
  return {
    code,
    label: "",
    defined: false,
    storage: "custom",
    type: null,
    options: null,
    required: false,
    flow: null,
    value,
    state: "captured",
    protected: false,
    source: "system",
    captured_at: "2026-11-22T13:00:00.000Z",
    conversation_id: null,
    actor_user_id: null,
    canonical_from: null,
    from_web: false,
    raw_value: null,
    invalid_reason: null,
    attempts: 0,
    proposal: null,
    ...overrides,
  };
}

describe("business-profile", () => {
  it("arma las filas en orden, con texto legible y enlaces seguros; solo las que tienen dato", () => {
    const view = businessProfileOf([
      field("google_maps_url", "https://www.google.com/maps/place/?q=place_id:ChIJ123"),
      field("instagram", "https://instagram.com/almejatours/"),
      field("website", "https://www.almejatours.com/"),
      field("facebook", ""),
      field("whatsapp", "300 314 8451"),
      field("tiktok", "@almeja.viajes"),
      field("category", "Agencia de viajes"),
      field("original_name", "Agencia de viajes en Bogotá Almejatours | Vuelos"),
      field("company", "Kodecol", { defined: true }),
    ]);
    expect(view.web.map((row) => [row.key, row.display, row.href])).toEqual([
      ["website", "almejatours.com", "https://www.almejatours.com/"],
      ["instagram", "@almejatours", "https://instagram.com/almejatours/"],
      ["tiktok", "@almeja.viajes", "https://tiktok.com/@almeja.viajes"],
      ["whatsapp", "+57 300 314 8451", "https://wa.me/573003148451"],
    ]);
    expect(view.ficha.map((row) => [row.key, row.display, row.href])).toEqual([
      ["category", "Agencia de viajes", null],
      ["google_maps_url", "Abrir su ficha en Maps", "https://www.google.com/maps/place/?q=place_id:ChIJ123"],
    ]);
    expect(view.originalName).toBe("Agencia de viajes en Bogotá Almejatours | Vuelos");
    expect(view.capturedAt).toBe("2026-11-22T13:00:00.000Z");
    expect(hasBusinessProfile(view)).toBe(true);
  });

  it("un dato corregido o confirmado por el equipo se marca", () => {
    const view = businessProfileOf([field("instagram", "@almeja_oficial", { state: "corrected", source: "user" })]);
    expect(view.web[0]).toMatchObject({ display: "@almeja_oficial", corrected: true });
  });

  it("un campo de formulario con el mismo código no es del perfil: se queda en «Datos del cliente»", () => {
    expect(isBusinessProfileField({ code: "website", defined: true })).toBe(false);
    expect(isBusinessProfileField({ code: "website", defined: false })).toBe(true);
    expect(isBusinessProfileField({ code: "company", defined: false })).toBe(false);
    expect(hasBusinessProfile(businessProfileOf([field("website", "x.co", { defined: true })]))).toBe(false);
  });

  it("solo enlaces http/https: un javascript: no se vuelve enlace", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("almejatours.com")).toBe("https://almejatours.com/");
    const view = businessProfileOf([field("website", "javascript:alert(1)")]);
    expect(view.web[0]).toMatchObject({ href: null, display: "javascript:alert(1)" });
  });
});

describe("business-profile — quién decide", () => {
  const DECIDER = [
    field("quien_decide", "Mariana Restrepo Gil"),
    field("quien_decide_cargo", "Representante legal"),
    field("quien_decide_fuente", "Registro mercantil (RUES)"),
  ];

  it("las tres claves son de «El negocio»: «Datos del cliente» deja de pintarlas sueltas", () => {
    for (const item of DECIDER) expect(isBusinessProfileField(item)).toBe(true);
    // Si un formulario del negocio define un campo con ese nombre, es del formulario.
    expect(isBusinessProfileField(field("quien_decide", "x", { defined: true }))).toBe(false);
  });

  it("lee nombre, cargo y de dónde se sabe", () => {
    expect(businessDecisionMakerOf(DECIDER)).toEqual({
      name: "Mariana Restrepo Gil",
      title: "Representante legal",
      evidence: "según el registro mercantil",
    });
    expect(businessProfileOf(DECIDER).decisionMaker?.name).toBe("Mariana Restrepo Gil");
    // Basta con quien decide para que haya tarjeta.
    expect(hasBusinessProfile(businessProfileOf(DECIDER))).toBe(true);
  });

  it("UNA PISTA NO SE NOMBRA: «(sin confirmar)» en la fuente es como no tenerlo", () => {
    const hint = [
      field("quien_decide", "Julián Cárdenas Mora"),
      field("quien_decide_fuente", "Sitio web del negocio (sin confirmar)"),
    ];
    expect(businessDecisionMakerOf(hint)).toBeNull();
    expect(hasBusinessProfile(businessProfileOf(hint))).toBe(false);
  });

  it("la pista confirmada por el equipo sí se nombra", () => {
    expect(
      businessDecisionMakerOf([
        field("quien_decide", "Julián Cárdenas Mora"),
        field("quien_decide_fuente", "Sitio web del negocio, confirmado por tu equipo"),
      ]),
    ).toEqual({
      name: "Julián Cárdenas Mora",
      title: null,
      evidence: "de su sitio web, confirmado por tu equipo",
    });
  });

  it("sin nombre no hay quien decide, aunque haya cargo o fuente", () => {
    expect(businessDecisionMakerOf([field("quien_decide_cargo", "Gerente")])).toBeNull();
    expect(businessDecisionMakerOf([field("quien_decide", "   ")])).toBeNull();
  });
});
