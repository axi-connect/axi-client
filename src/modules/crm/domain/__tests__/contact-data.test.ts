import {
  capturedAtLabel,
  completenessTone,
  dataCompleteness,
  defineFieldHref,
  fieldLabel,
  formatFieldValue,
  groupByFlow,
  humanizeCode,
  isVerified,
  needsReview,
  summarize,
  type ContactDataField,
} from "../contact-data";

function field(overrides: Partial<ContactDataField> = {}): ContactDataField {
  return {
    code: "company",
    label: "Empresa",
    defined: true,
    storage: "custom",
    type: "text",
    options: null,
    required: false,
    flow: "contact_registration",
    value: "Kodecol",
    state: "captured",
    protected: false,
    source: "ai_agent",
    captured_at: "2026-09-15T10:12:00.000Z",
    conversation_id: "conv-1",
    actor_user_id: null,
    canonical_from: null,
    raw_value: null,
    invalid_reason: null,
    attempts: 0,
    proposal: null,
    ...overrides,
  };
}

describe("contact-data — predicados", () => {
  it("verificado = confirmado o corregido, nada más", () => {
    expect(isVerified(field({ state: "confirmed" }))).toBe(true);
    expect(isVerified(field({ state: "corrected" }))).toBe(true);
    expect(isVerified(field({ state: "captured" }))).toBe(false);
    expect(isVerified(field({ state: "missing" }))).toBe(false);
  });

  it("por revisar: inválido, propuesta pendiente u obligatorio ya pedido sin respuesta", () => {
    expect(needsReview(field({ state: "invalid", value: null }))).toBe(true);
    expect(
      needsReview(
        field({
          state: "confirmed",
          proposal: { value: "20", captured_at: "2026-09-15T10:00:00Z", conversation_id: null },
        }),
      ),
    ).toBe(true);
    expect(needsReview(field({ state: "missing", value: null, required: true, attempts: 3 }))).toBe(true);
    // Obligatorio que aún no se ha pedido: falta, pero nadie tiene que revisar nada.
    expect(needsReview(field({ state: "missing", value: null, required: true, attempts: 0 }))).toBe(false);
    // Opcional pedido sin respuesta tampoco es una alerta.
    expect(needsReview(field({ state: "missing", value: null, required: false, attempts: 2 }))).toBe(false);
    expect(needsReview(field())).toBe(false);
  });
});

describe("summarize", () => {
  it("total = definidos + huérfanos con valor; filled = con valor; review = por revisar", () => {
    const summary = summarize([
      field(),
      field({ code: "sector", state: "confirmed" }),
      field({ code: "nit", value: null, state: "missing", required: true, attempts: 3 }),
      field({ code: "fecha", value: null, state: "missing" }),
      // Huérfano con valor: cuenta en total y en filled.
      field({ code: "instagram", defined: false, flow: null, label: "" }),
      // Definido pero inválido: cuenta en total y en review, no en filled.
      field({ code: "alt_phone", value: null, state: "invalid", raw_value: "+57 3 00" }),
    ]);
    expect(summary).toEqual({ filled: 3, total: 6, review: 2 });
  });

  it("sin campos devuelve ceros", () => {
    expect(summarize([])).toEqual({ filled: 0, total: 0, review: 0 });
  });
});

describe("groupByFlow", () => {
  it("agrupa en el orden Registro · Pedido · Cita, omite grupos vacíos y manda los huérfanos a Registro", () => {
    const groups = groupByFlow([
      field({ code: "budget", flow: "order_intake" }),
      field({ code: "company" }),
      field({ code: "instagram", defined: false, flow: null }),
    ]);
    expect(groups.map((group) => group.label)).toEqual(["Registro", "Pedido"]);
    expect(groups[0].fields.map((f) => f.code)).toEqual(["company", "instagram"]);
    expect(groups[1].fields.map((f) => f.code)).toEqual(["budget"]);
  });
});

describe("formato", () => {
  it("humaniza el code de un huérfano y respeta el label cuando existe", () => {
    expect(humanizeCode("direccion_entrega")).toBe("Direccion entrega");
    expect(humanizeCode("nit")).toBe("Nit");
    expect(fieldLabel(field({ label: "", code: "team_size" }))).toBe("Team size");
    expect(fieldLabel(field({ label: "Tamaño del equipo" }))).toBe("Tamaño del equipo");
  });

  it("formatea por tipo: boolean → Sí/No, number en es-CO, date sin corrimiento de zona", () => {
    expect(formatFieldValue(field({ type: "boolean", value: true }))).toBe("Sí");
    expect(formatFieldValue(field({ type: "boolean", value: "false" }))).toBe("No");
    expect(formatFieldValue(field({ type: "number", value: 3000000 }))).toBe("3.000.000");
    expect(formatFieldValue(field({ type: "number", value: "12" }))).toBe("12");
    expect(formatFieldValue(field({ type: "date", value: "2026-09-18" }))).toMatch(/18.*sept?.*2026/);
    expect(formatFieldValue(field({ type: "text", value: "Kodecol" }))).toBe("Kodecol");
    expect(formatFieldValue(field({ value: null }))).toBe("");
  });

  it("capturedAtLabel: hoy con hora, ayer, y fecha corta (con año si es otro)", () => {
    const now = new Date(2026, 8, 15, 12, 0, 0);
    expect(capturedAtLabel(new Date(2026, 8, 15, 10, 12).toISOString(), now)).toBe("hoy 10:12");
    expect(capturedAtLabel(new Date(2026, 8, 14, 23, 0).toISOString(), now)).toBe("ayer");
    expect(capturedAtLabel(new Date(2026, 8, 12, 9, 0).toISOString(), now)).toMatch(/^12 sept?$/);
    expect(capturedAtLabel(new Date(2025, 8, 12, 9, 0).toISOString(), now)).toMatch(/12 sept?.*2025/);
    expect(capturedAtLabel("no-es-fecha", now)).toBe("");
  });

  it("defineFieldHref apunta al flujo del editor (Registro por defecto)", () => {
    expect(defineFieldHref(null)).toBe("/settings/forms?flow=contact_registration");
    expect(defineFieldHref("order_intake")).toBe("/settings/forms?flow=order_intake");
  });
});

describe("dataCompleteness (columna «Datos»)", () => {
  const forms = [
    {
      flow: "contact_registration" as const,
      is_active: true,
      fields: [{ code: "company" }, { code: "city" }, { code: "email" }],
    },
    {
      flow: "order_intake" as const,
      is_active: true,
      fields: [{ code: "budget" }, { code: "company" }],
    },
    { flow: "appointment_booking" as const, is_active: false, fields: [{ code: "pet_name" }] },
  ];

  it("cuenta los codes únicos de los formularios ACTIVOS, leyendo columnas o custom_fields según el code", () => {
    const result = dataCompleteness(
      { company: "Kodecol", budget: 3000000, pet_name: "Firulais" },
      { city: "Bogotá", email: null },
      forms,
    );
    // company, city, email, budget = 4 codes; pet_name está en un formulario inactivo.
    expect(result).toEqual({ filled: 3, total: 4 });
    expect(completenessTone(result)).toBe("partial");
  });

  it("completo cuando todos los definidos tienen valor; los strings vacíos no cuentan", () => {
    const result = dataCompleteness(
      { company: "Kodecol", budget: "0" },
      { city: "Cali", email: "a@b.co" },
      forms,
    );
    expect(result).toEqual({ filled: 4, total: 4 });
    expect(completenessTone(result)).toBe("complete");
    expect(dataCompleteness({ company: "   " }, { city: null, email: null }, forms)?.filled).toBe(0);
  });

  it("sin formularios activos con campos → null («—» en la tabla)", () => {
    expect(dataCompleteness({ company: "x" }, {}, [])).toBeNull();
    expect(dataCompleteness({}, {}, [{ is_active: false, fields: [{ code: "a" }] }])).toBeNull();
    expect(completenessTone(null)).toBe("none");
  });
});
