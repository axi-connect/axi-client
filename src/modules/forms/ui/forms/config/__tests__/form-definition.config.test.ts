import type { FlowForm } from "@/modules/forms/domain/form";
import {
  flowIssues,
  fromDto,
  newEditableField,
  toFormsValues,
  toUpsertDto,
  type FormDefinitionValues,
} from "../form-definition.config";

const field = (overrides: Partial<FormDefinitionValues["fields"][number]> = {}) => ({
  code: "address",
  label: "Dirección",
  type: "text" as const,
  required: true,
  persisted: false,
  key: "k1",
  ...overrides,
});

const values = (overrides: Partial<FormDefinitionValues> = {}): FormDefinitionValues => ({
  is_active: true,
  fields: [field()],
  ...overrides,
});

describe("toUpsertDto — las tres trampas del contrato", () => {
  it("is_active viaja SIEMPRE (omitirlo reactivaría un formulario pausado)", () => {
    expect("is_active" in toUpsertDto(values())).toBe(true);
    expect("is_active" in toUpsertDto(values({ is_active: false }))).toBe(true);
  });

  it("respeta is_active: false", () => {
    expect(toUpsertDto(values({ is_active: false })).is_active).toBe(false);
  });

  it("deriva position del índice, contiguo desde 0", () => {
    const dto = toUpsertDto(
      values({
        fields: [
          field({ code: "a", key: "k1" }),
          field({ code: "b", key: "k2" }),
          field({ code: "c", key: "k3" }),
        ],
      }),
    );

    expect(dto.fields.map((f) => f.position)).toEqual([0, 1, 2]);
  });

  it("omite ai_prompt cuando está vacío (el backend exige min(1) si está presente → 400)", () => {
    expect("ai_prompt" in toUpsertDto(values({ fields: [field({ ai_prompt: "" })] })).fields[0]).toBe(
      false,
    );
    expect(
      "ai_prompt" in toUpsertDto(values({ fields: [field({ ai_prompt: "   " })] })).fields[0],
    ).toBe(false);
    expect(
      "ai_prompt" in toUpsertDto(values({ fields: [field({ ai_prompt: undefined })] })).fields[0],
    ).toBe(false);
  });

  it("recorta ai_prompt cuando tiene contenido", () => {
    expect(toUpsertDto(values({ fields: [field({ ai_prompt: "  Pide calle  " })] })).fields[0]).toMatchObject(
      { ai_prompt: "Pide calle" },
    );
  });

  it("omite options si el tipo no es select (el backend lo rechaza)", () => {
    const dto = toUpsertDto(values({ fields: [field({ type: "text", options: ["residual"] })] }));
    expect("options" in dto.fields[0]).toBe(false);
  });

  it("envía options solo en select, sin las vacías", () => {
    const dto = toUpsertDto(
      values({ fields: [field({ type: "select", options: ["Domicilio", "  ", "Recoger"] })] }),
    );
    expect(dto.fields[0]).toMatchObject({ options: ["Domicilio", "Recoger"] });
  });

  it("recorta el label", () => {
    expect(toUpsertDto(values({ fields: [field({ label: "  Dirección  " })] })).fields[0].label).toBe(
      "Dirección",
    );
  });
});

describe("flowIssues — validación por flujo con paths anclados a la fila", () => {
  it("un flujo válido no produce issues", () => {
    expect(flowIssues(values(), "order_intake")).toEqual([]);
  });

  it("rechaza más de 8 campos", () => {
    const nine = Array.from({ length: 9 }, (_, i) => field({ code: `c${i}`, key: `k${i}` }));
    const issues = flowIssues(values({ fields: nine }), "order_intake");

    expect(issues.some((issue) => /máximo 8 datos/i.test(issue.message))).toBe(true);
  });

  it("marca el code duplicado en la fila culpable, no como error global", () => {
    const issues = flowIssues(
      values({ fields: [field({ code: "phone", key: "k1" }), field({ code: "phone", key: "k2" })] }),
      "order_intake",
    );

    expect(issues).toEqual([
      { path: "order_intake.fields.1.code", message: expect.stringContaining("«phone»") },
    ]);
  });

  it("un select sin opciones falla en el campo options de su fila", () => {
    const issues = flowIssues(
      values({ fields: [field({ type: "select", options: [] })] }),
      "contact_registration",
    );

    expect(issues).toEqual([
      { path: "contact_registration.fields.0.options", message: expect.stringMatching(/al menos una opción/i) },
    ]);
  });

  it("un select cuyas opciones están todas vacías también falla", () => {
    const issues = flowIssues(values({ fields: [field({ type: "select", options: ["  "] })] }), "order_intake");

    expect(issues.some((issue) => issue.path.endsWith("options"))).toBe(true);
  });

  it("rechaza un code que no es snake_case empezando por letra", () => {
    for (const code of ["1talla", "Talla", "talla-grande", "talla grande"]) {
      const issues = flowIssues(values({ fields: [field({ code })] }), "order_intake");
      expect(issues.some((issue) => issue.path === "order_intake.fields.0.code")).toBe(true);
    }
  });

  it("acepta un code snake_case válido", () => {
    expect(flowIssues(values({ fields: [field({ code: "talla_camisa_2" })] }), "order_intake")).toEqual([]);
  });

  it("exige label y code no vacíos", () => {
    const issues = flowIssues(values({ fields: [field({ code: "", label: "" })] }), "order_intake");

    expect(issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["order_intake.fields.0.code", "order_intake.fields.0.label"]),
    );
  });

  it("rechaza más de 12 opciones", () => {
    const options = Array.from({ length: 13 }, (_, i) => `opt${i}`);
    const issues = flowIssues(values({ fields: [field({ type: "select", options })] }), "order_intake");

    expect(issues.some((issue) => /máximo 12 opciones/i.test(issue.message))).toBe(true);
  });
});

describe("fromDto / toFormsValues — hidratación desde el backend", () => {
  const persisted: FlowForm = {
    persisted: true,
    id: "id-1",
    flow: "order_intake",
    is_active: false,
    created_at: "2026-08-05T00:00:00.000Z",
    updated_at: "2026-08-05T00:00:00.000Z",
    fields: [
      { code: "b", label: "B", type: "text", required: true, position: 1 },
      { code: "a", label: "A", type: "text", required: false, position: 0 },
    ],
  };

  it("ordena por position y marca todo como persisted (code inmutable)", () => {
    const result = fromDto(persisted);

    expect(result.fields.map((f) => f.code)).toEqual(["a", "b"]);
    expect(result.fields.every((f) => f.persisted)).toBe(true);
  });

  it("conserva is_active del backend", () => {
    expect(fromDto(persisted).is_active).toBe(false);
  });

  it("asigna keys únicas a cada fila", () => {
    const keys = fromDto(persisted).fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("un borrador se hidrata vacío y activo", () => {
    const draft: FlowForm = { persisted: false, flow: "order_intake", fields: [], is_active: true };
    expect(fromDto(draft)).toEqual({ is_active: true, fields: [] });
  });

  it("toFormsValues cubre los 3 flujos", () => {
    const draft = (flow: FlowForm["flow"]): FlowForm => ({
      persisted: false,
      flow,
      fields: [],
      is_active: true,
    });
    const result = toFormsValues({
      contact_registration: draft("contact_registration"),
      order_intake: persisted,
      appointment_booking: draft("appointment_booking"),
    });

    expect(Object.keys(result)).toEqual([
      "contact_registration",
      "order_intake",
      "appointment_booking",
    ]);
    expect(result.order_intake.fields).toHaveLength(2);
  });

  it("el ciclo fromDto → toUpsertDto es estable (round-trip)", () => {
    const dto = toUpsertDto(fromDto(persisted));

    expect(dto.is_active).toBe(false);
    expect(dto.fields).toEqual([
      { code: "a", label: "A", type: "text", required: false, position: 0 },
      { code: "b", label: "B", type: "text", required: true, position: 1 },
    ]);
  });
});

describe("newEditableField", () => {
  it("nace editable (persisted false) y requerido", () => {
    const created = newEditableField();
    expect(created.persisted).toBe(false);
    expect(created.required).toBe(true);
  });

  it("un select nace con una opción vacía para que el editor tenga dónde escribir", () => {
    expect(newEditableField({ type: "select" }).options).toEqual([""]);
  });

  it("un tipo no-select no inventa options", () => {
    expect(newEditableField({ type: "text" }).options).toBeUndefined();
  });

  it("acepta el preset del catálogo de datos recomendados", () => {
    const created = newEditableField({ code: "phone", label: "Teléfono", type: "phone" });
    expect(created).toMatchObject({ code: "phone", label: "Teléfono", type: "phone" });
  });
});
