import {
  effectiveFields,
  fieldStorageHint,
  FORM_FLOWS,
  promptLine,
  RECOMMENDED_FIELDS,
  synthesizeForms,
  type FormDefinitionDTO,
  type FormsListDTO,
} from "../form";

const form = (
  flow: FormDefinitionDTO["flow"],
  overrides: Partial<FormDefinitionDTO> = {},
): FormDefinitionDTO => ({
  id: `id-${flow}`,
  flow,
  fields: [],
  is_active: true,
  created_at: "2026-08-05T00:00:00.000Z",
  updated_at: "2026-08-05T00:00:00.000Z",
  ...overrides,
});

const list = (data: FormDefinitionDTO[]): FormsListDTO => ({ data });

describe("synthesizeForms — GET /forms devuelve 0..3 filas", () => {
  it("con la lista vacía devuelve los 3 flujos como borrador", () => {
    const result = synthesizeForms(list([]));

    expect(Object.keys(result)).toEqual([...FORM_FLOWS]);
    for (const flow of FORM_FLOWS) {
      expect(result[flow]).toEqual({ flow, fields: [], is_active: true, persisted: false });
    }
  });

  it("con un solo flujo configurado, los otros dos se sintetizan", () => {
    const result = synthesizeForms(list([form("order_intake")]));

    expect(result.order_intake.persisted).toBe(true);
    expect(result.contact_registration.persisted).toBe(false);
    expect(result.appointment_booking.persisted).toBe(false);
  });

  it("con los 3 configurados no sintetiza ninguno y conserva is_active", () => {
    const result = synthesizeForms(
      list([
        form("contact_registration"),
        form("order_intake", { is_active: false }),
        form("appointment_booking"),
      ]),
    );

    expect(FORM_FLOWS.every((flow) => result[flow].persisted)).toBe(true);
    expect(result.order_intake.is_active).toBe(false);
  });

  it("el borrador nace activo: es lo que hará el PUT (is_active ?? true)", () => {
    expect(synthesizeForms(list([])).order_intake.is_active).toBe(true);
  });
});

describe("fieldStorageHint — whitelist de columnas del Contact", () => {
  it("los codes reservados aterrizan en la ficha del contacto", () => {
    expect(fieldStorageHint("address")).toBe("contact_column");
    expect(fieldStorageHint("phone")).toBe("contact_column");
  });

  it("cualquier otro code va a custom_fields", () => {
    expect(fieldStorageHint("direccion_entrega")).toBe("custom_field");
  });

  it("el catálogo recomendado solo ofrece codes que enganchan con el CRM", () => {
    for (const field of RECOMMENDED_FIELDS) {
      expect(fieldStorageHint(field.code)).toBe("contact_column");
    }
  });

  it("excluye document_type: un select con el enum cc|ce|ti|pp|nit se ofrecería literal al cliente", () => {
    expect(RECOMMENDED_FIELDS.some((field) => field.code === "document_type")).toBe(false);
    expect(RECOMMENDED_FIELDS.some((field) => field.code === "document_number")).toBe(true);
  });
});

describe("promptLine — espejo de la sección «Datos requeridos» del prompt", () => {
  const base = { label: "Dirección", code: "address", type: "text" as const, required: true };

  it("sin indicación ni opciones no abre paréntesis", () => {
    expect(promptLine(base)).toBe("- Dirección (code address): FALTA");
  });

  it("con indicación la envuelve en paréntesis", () => {
    expect(promptLine({ ...base, ai_prompt: "Pide calle y barrio" })).toBe(
      "- Dirección (code address): FALTA (Pide calle y barrio)",
    );
  });

  it("un select sin indicación abre el paréntesis con las opciones", () => {
    expect(
      promptLine({ ...base, label: "Entrega", code: "delivery", type: "select", options: ["Domicilio", "Recoger"] }),
    ).toBe("- Entrega (code delivery): FALTA (opciones: Domicilio | Recoger)");
  });

  it("indicación y opciones se separan con «; »", () => {
    expect(
      promptLine({
        ...base,
        label: "Entrega",
        code: "delivery",
        type: "select",
        options: ["Domicilio", "Recoger"],
        ai_prompt: "Pregunta si recoge",
      }),
    ).toBe("- Entrega (code delivery): FALTA (Pregunta si recoge; opciones: Domicilio | Recoger)");
  });

  it("un campo opcional lleva el marcador [opcional]", () => {
    expect(promptLine({ ...base, required: false })).toBe(
      "- Dirección (code address) [opcional]: FALTA",
    );
  });

  it("ignora las opciones si el tipo no es select (el mapper también las descarta)", () => {
    expect(promptLine({ ...base, options: ["residual"] })).toBe("- Dirección (code address): FALTA");
  });

  it("una indicación vacía se trata como ausente (el backend exige min(1) si está presente)", () => {
    expect(promptLine({ ...base, ai_prompt: "   " })).toBe("- Dirección (code address): FALTA");
  });
});

describe("effectiveFields — la herencia asimétrica del backend", () => {
  const byFlow = {
    contact_registration: ["nombre", "telefono"],
    order_intake: ["direccion"],
    appointment_booking: ["servicio"],
  };

  it("order_intake hereda los del cliente ANTES de los propios (como create_order)", () => {
    expect(effectiveFields("order_intake", byFlow)).toEqual([
      "nombre",
      "telefono",
      "direccion",
    ]);
  });

  it("appointment_booking NO hereda (como book_appointment)", () => {
    expect(effectiveFields("appointment_booking", byFlow)).toEqual(["servicio"]);
  });

  it("contact_registration devuelve solo los propios", () => {
    expect(effectiveFields("contact_registration", byFlow)).toEqual(["nombre", "telefono"]);
  });
});
