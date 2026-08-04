import {
  parseTagsInput,
  scenarioFormSchema,
  scenarioToFormValues,
  toCreateScenarioDTO,
  toUpdateScenarioDTO,
  type ScenarioFormValues,
} from "../scenario-form.config";
import type { Scenario } from "../../../../../domain/quality";

const VALID: ScenarioFormValues = {
  code: "mi_escenario",
  name: "Mi escenario",
  description: "",
  persona: "Cliente impaciente que quiere comprar rápido.",
  goal: "Concretar una compra de dos unidades.",
  max_turns: 12,
  tags: "ventas, retención, ventas",
  success_criteria: [{ kind: "order_created", min_items: 2 }],
};

describe("parseTagsInput", () => {
  it("separa por coma, recorta, quita vacíos y deduplica", () => {
    expect(parseTagsInput(" ventas, retención ,, ventas ")).toEqual(["ventas", "retención"]);
    expect(parseTagsInput("")).toEqual([]);
  });
});

describe("scenarioFormSchema", () => {
  it("acepta valores válidos", () => {
    expect(scenarioFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("rechaza code fuera de snake_case y criterios con reglas cruzadas rotas", () => {
    expect(scenarioFormSchema.safeParse({ ...VALID, code: "MiEscenario" }).success).toBe(false);
    const crossed = scenarioFormSchema.safeParse({
      ...VALID,
      success_criteria: [{ kind: "escalated" }, { kind: "not_escalated" }],
    });
    expect(crossed.success).toBe(false);
    if (!crossed.success) {
      expect(crossed.error.issues.map((issue) => issue.message)).toContain(
        "«Escala a humano» y «No escala» son mutuamente excluyentes",
      );
    }
  });

  it("rechaza el set de criterios vacío y el exceso de etiquetas", () => {
    expect(scenarioFormSchema.safeParse({ ...VALID, success_criteria: [] }).success).toBe(false);
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`).join(", ");
    expect(scenarioFormSchema.safeParse({ ...VALID, tags }).success).toBe(false);
  });
});

describe("mappers a DTO", () => {
  it("toCreateScenarioDTO normaliza tags y omite description vacía", () => {
    const dto = toCreateScenarioDTO(VALID);
    expect(dto.tags).toEqual(["ventas", "retención"]);
    expect(dto).not.toHaveProperty("description");
    expect(dto.success_criteria).toEqual([{ kind: "order_created", min_items: 2 }]);
  });

  it("los criterios `unknown` se excluyen del DTO (no son expresables en el wire)", () => {
    const dto = toCreateScenarioDTO({
      ...VALID,
      success_criteria: [{ kind: "no_agent_error" }, { kind: "unknown", raw: { kind: "future" } }],
    });
    expect(dto.success_criteria).toEqual([{ kind: "no_agent_error" }]);
  });

  it("toUpdateScenarioDTO no incluye code y manda description null al vaciarla", () => {
    const dto = toUpdateScenarioDTO({ ...VALID, description: "  " });
    expect(dto).not.toHaveProperty("code");
    expect(dto.description).toBeNull();
    expect(dto.max_turns).toBe(12);
    expect(dto.tags).toEqual(["ventas", "retención"]);
  });
});

describe("scenarioToFormValues", () => {
  it("parsea defensivamente los criterios del wire y une las tags", () => {
    const scenario = {
      id: "s-1",
      code: "buyer",
      name: "Buyer",
      description: null,
      persona: "p".repeat(20),
      goal: "g".repeat(20),
      max_turns: 10,
      success_criteria: [{ kind: "escalated" }, { kind: "future_kind" }],
      criteria_version: 1,
      is_system: false,
      cloned_from_id: null,
      status: "active",
      tags: ["a", "b"],
      created_by: null,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    } as unknown as Scenario;

    const values = scenarioToFormValues(scenario);
    expect(values.tags).toBe("a, b");
    expect(values.success_criteria).toEqual([
      { kind: "escalated" },
      { kind: "unknown", raw: { kind: "future_kind" } },
    ]);
  });
});
