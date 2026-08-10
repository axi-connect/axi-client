import type { AutomationDTO, AutomationMetricsDTO } from "../automation";
import {
  automationConversionRate,
  canEnableAutomation,
  compactConditions,
  parseConditions,
  requiresHsm,
} from "../automation";
import { TRIGGER_ORDER } from "../enums";

describe("parseConditions", () => {
  it("lee el DSL completo del backend", () => {
    expect(
      parseConditions({
        has_active_cart: true,
        min_score: 10,
        max_score: 90,
        lifecycle_stage_in: ["lead", "customer"],
        min_cart_total_cents: 50_000,
        intent_type: "sales",
        include_pending: false,
      }),
    ).toEqual({
      has_active_cart: true,
      min_score: 10,
      max_score: 90,
      lifecycle_stage_in: ["lead", "customer"],
      min_cart_total_cents: 50_000,
      intent_type: "sales",
      include_pending: false,
    });
  });

  it("degrada a {} en vez de lanzar cuando el valor es basura", () => {
    // La lista de reglas no puede romperse porque una fila traiga JSON corrupto.
    expect(parseConditions(null)).toEqual({});
    expect(parseConditions(undefined)).toEqual({});
    expect(parseConditions("nope")).toEqual({});
    expect(parseConditions(42)).toEqual({});
    expect(parseConditions([1, 2])).toEqual({});
  });

  it("descarta claves con tipo o rango inválido y conserva las buenas", () => {
    expect(
      parseConditions({
        has_active_cart: "sí",
        min_score: 500,
        max_score: 3.5,
        intent_type: "vender",
        lifecycle_stage_in: ["lead", "marciano"],
        min_cart_total_cents: -1,
        clave_desconocida: true,
      }),
    ).toEqual({ lifecycle_stage_in: ["lead"] });
  });

  it("ignora un array de etapas que quede vacío tras filtrar", () => {
    expect(parseConditions({ lifecycle_stage_in: ["marciano"] })).toEqual({});
    expect(parseConditions({ lifecycle_stage_in: [] })).toEqual({});
  });
});

describe("compactConditions", () => {
  it("no emite claves vacías: el backend valida con .strict()", () => {
    expect(compactConditions({ lifecycle_stage_in: [], min_score: undefined })).toEqual({});
  });

  it("conserva los booleanos en false y el cero", () => {
    // `false` y `0` son valores con significado, no ausencias.
    expect(compactConditions({ has_active_cart: false, min_score: 0 })).toEqual({
      has_active_cart: false,
      min_score: 0,
    });
  });

  it("es idempotente sobre lo que ya salió de parseConditions", () => {
    const parsed = parseConditions({ min_score: 20, intent_type: "support" });
    expect(compactConditions(parsed)).toEqual(parsed);
  });
});

describe("plantilla de Meta obligatoria", () => {
  it("solo la exige el disparador que escribe fuera de las 24 h", () => {
    expect(TRIGGER_ORDER.filter(requiresHsm)).toEqual(["deal_stalled"]);
  });

  it("bloquea el encendido de deal_stalled sin plantilla", () => {
    const base = { hsm_template_name: null } as AutomationDTO;
    expect(canEnableAutomation({ ...base, trigger_type: "deal_stalled" })).toBe(false);
    expect(
      canEnableAutomation({
        ...base,
        trigger_type: "deal_stalled",
        hsm_template_name: "recuperacion_deal",
      }),
    ).toBe(true);
  });

  it("no estorba a los disparadores que caen dentro de la ventana", () => {
    const base = { hsm_template_name: null } as AutomationDTO;
    expect(canEnableAutomation({ ...base, trigger_type: "cart_abandoned" })).toBe(true);
    expect(canEnableAutomation({ ...base, trigger_type: "conversation_inactive" })).toBe(true);
  });
});

describe("automationConversionRate", () => {
  it("calcula convertidos sobre enviados", () => {
    expect(automationConversionRate({ sent: 128, converted: 32 } as AutomationMetricsDTO)).toBe(
      0.25,
    );
  });

  it("devuelve 0 sin envíos en vez de dividir por cero", () => {
    expect(automationConversionRate({ sent: 0, converted: 0 } as AutomationMetricsDTO)).toBe(0);
  });
});
