import {
  CRITERION_FAMILIES,
  CRITERION_KINDS,
  criterionLabel,
  hasNestedQuantifier,
  MAX_CRITERIA,
  parseSuccessCriteria,
  validateCriteriaSet,
  validatePattern,
  type SuccessCriterion,
} from "../quality";

describe("parseSuccessCriteria", () => {
  // Los nueve kinds de criteria_version 1 (success_criteria.schema.ts del
  // backend). Esta lista debe cubrirlos TODOS: un kind ausente aquí cae a
  // `unknown` y `toWireCriteria` lo descarta al guardar, perdiendo el criterio
  // en silencio — que es justo lo que pasaba con `appointment_created`.
  it("parsea los nueve kinds v1 con sus campos", () => {
    const parsed = parseSuccessCriteria([
      { kind: "order_created", min_items: 5, product_codes: ["BURGER"] },
      { kind: "order_not_created" },
      { kind: "appointment_created" },
      { kind: "escalated" },
      { kind: "not_escalated" },
      { kind: "reply_contains", pattern: "gracias" },
      { kind: "reply_not_contains", pattern: "no sé" },
      { kind: "no_agent_error" },
      { kind: "max_reply_ms", threshold_ms: 3000 },
    ]);
    expect(parsed).toEqual([
      { kind: "order_created", min_items: 5, product_codes: ["BURGER"] },
      { kind: "order_not_created" },
      { kind: "appointment_created" },
      { kind: "escalated" },
      { kind: "not_escalated" },
      { kind: "reply_contains", pattern: "gracias" },
      { kind: "reply_not_contains", pattern: "no sé" },
      { kind: "no_agent_error" },
      { kind: "max_reply_ms", threshold_ms: 3000 },
    ]);
  });

  it("descarta campos opcionales ilegibles sin perder el criterio", () => {
    expect(parseSuccessCriteria([{ kind: "order_created", min_items: "cinco", product_codes: [1] }])).toEqual([
      { kind: "order_created" },
    ]);
  });

  it("degrada a `unknown` kinds nuevos, requeridos ilegibles y entradas no-objeto", () => {
    const parsed = parseSuccessCriteria([
      { kind: "future_check", foo: 1 },
      { kind: "reply_contains" }, // sin pattern
      { kind: "max_reply_ms", threshold_ms: -1 },
      "texto suelto",
    ]);
    expect(parsed.map((c) => c.kind)).toEqual(["unknown", "unknown", "unknown", "unknown"]);
    expect(parsed[0]).toEqual({ kind: "unknown", raw: { kind: "future_check", foo: 1 } });
  });

  it("entrada no-array (criteria_version vieja o corrupta) → lista vacía", () => {
    expect(parseSuccessCriteria(null)).toEqual([]);
    expect(parseSuccessCriteria({ kind: "escalated" })).toEqual([]);
  });
});

describe("criterionLabel", () => {
  it("compone etiquetas legibles en español", () => {
    expect(criterionLabel({ kind: "order_created", min_items: 5 })).toBe("Pedido creado · ≥ 5 unidades");
    expect(criterionLabel({ kind: "reply_contains", pattern: "hola" })).toBe("Respuesta contiene /hola/i");
    expect(criterionLabel({ kind: "max_reply_ms", threshold_ms: 3000 })).toBe("Latencia máx. 3000 ms");
    expect(criterionLabel({ kind: "appointment_created" })).toBe("Cita agendada");
    expect(criterionLabel({ kind: "unknown", raw: { kind: "x" } })).toBe("Criterio no reconocido (x)");
  });
});

describe("validatePattern", () => {
  it("acepta regex válidas dentro del límite", () => {
    expect(validatePattern("gracias|de nada")).toEqual([]);
  });

  it("rechaza vacío, longitud > 120, regex inválida y cuantificador anidado", () => {
    expect(validatePattern("")).toHaveLength(1);
    expect(validatePattern("a".repeat(121))).toHaveLength(1);
    expect(validatePattern("(")).toEqual(["El patrón no es una expresión regular válida"]);
    expect(validatePattern("(a+)+")).toEqual(["Patrón con cuantificador anidado (riesgo ReDoS)"]);
  });
});

describe("hasNestedQuantifier", () => {
  it("detecta grupos cuantificados con cuantificador interno", () => {
    expect(hasNestedQuantifier("(a+)+")).toBe(true);
    expect(hasNestedQuantifier("(ab*)*")).toBe(true);
    expect(hasNestedQuantifier("(abc)+")).toBe(false);
    expect(hasNestedQuantifier("a+b*")).toBe(false);
  });
});

describe("validateCriteriaSet", () => {
  const escalated: SuccessCriterion = { kind: "escalated" };

  it("set válido → sin errores", () => {
    expect(validateCriteriaSet([{ kind: "order_created", min_items: 2 }, escalated])).toEqual([]);
  });

  it("rechaza el array vacío y el exceso de criterios", () => {
    expect(validateCriteriaSet([])).toEqual(["Agrega al menos un criterio de éxito"]);
    const many = Array.from({ length: MAX_CRITERIA + 1 }, (): SuccessCriterion => ({ kind: "no_agent_error" }));
    expect(validateCriteriaSet(many)).toContain(`Máximo ${MAX_CRITERIA} criterios`);
  });

  it("rechaza los pares mutuamente excluyentes", () => {
    expect(validateCriteriaSet([escalated, { kind: "not_escalated" }])).toEqual([
      "«Escala a humano» y «No escala» son mutuamente excluyentes",
    ]);
    expect(validateCriteriaSet([{ kind: "order_created" }, { kind: "order_not_created" }])).toEqual([
      "«Pedido creado» y «Sin pedido» son mutuamente excluyentes",
    ]);
  });

  it("propaga errores de patrón y de umbral", () => {
    expect(validateCriteriaSet([{ kind: "reply_contains", pattern: "(a+)+" }])).toEqual([
      "Patrón con cuantificador anidado (riesgo ReDoS)",
    ]);
    expect(validateCriteriaSet([{ kind: "max_reply_ms", threshold_ms: 700_000 }])).toEqual([
      "El umbral de latencia debe estar entre 1 y 600000 ms",
    ]);
  });

  it("deduplica mensajes repetidos (dos patrones rotos = un mensaje)", () => {
    expect(
      validateCriteriaSet([
        { kind: "reply_contains", pattern: "(" },
        { kind: "reply_not_contains", pattern: "(" },
      ]),
    ).toEqual(["El patrón no es una expresión regular válida"]);
  });
});

// ─── criteria_version 2 (upgrade quality F3) ────────────────────────────────

describe("criterios v2", () => {
  const V2 = [
    { kind: "contact_field_captured", field: "phone", pattern: "^\\+57" },
    { kind: "deal_stage_kind", kind_expected: "qualified" },
    { kind: "media_sent", media: "image", min: 2 },
    { kind: "payment_reported" },
    { kind: "delivery_set", method: "pickup" },
    { kind: "promotion_applied", code: "BIENVENIDA10" },
    { kind: "recognition_matched", sku: "CAM-01", max_rank: 3 },
    { kind: "intent_detected", intention_code: "sales" },
    { kind: "turns_to_outcome", max: 6, outcome: "appointment" },
    { kind: "tool_called", name: "catalog_lookup", min: 2 },
    { kind: "tool_not_called", name: "apply_promotion" },
    { kind: "no_unverified_prices" },
    { kind: "no_bot_phrases" },
    { kind: "max_greetings", max: 1 },
    { kind: "max_llm_calls_per_turn", n: 4 },
    { kind: "max_cost_usd", usd: 0.5 },
  ];

  it("parsea los dieciséis kinds v2 tal cual (ninguno cae a unknown)", () => {
    expect(parseSuccessCriteria(V2)).toEqual(V2);
    expect(CRITERION_KINDS).toHaveLength(25);
    expect(CRITERION_KINDS.every((kind) => CRITERION_FAMILIES.includes(kind.family))).toBe(true);
  });

  it("aplica los defaults del backend y degrada lo ilegible sin perder el criterio", () => {
    expect(
      parseSuccessCriteria([
        { kind: "media_sent", media: "location" },
        { kind: "tool_called", name: "create_order" },
        { kind: "recognition_matched", sku: "X" },
        { kind: "turns_to_outcome", max: 5 },
        { kind: "max_greetings" },
        { kind: "deal_stage_kind" },
      ]),
    ).toEqual([
      { kind: "media_sent", media: "location", min: 1 },
      { kind: "tool_called", name: "create_order", min: 1 },
      { kind: "recognition_matched", sku: "X", max_rank: 1 },
      { kind: "turns_to_outcome", max: 5, outcome: "order" },
      { kind: "max_greetings", max: 1 },
      { kind: "deal_stage_kind" },
    ]);
    // Tool inexistente, etapa inexistente y medio no soportado → unknown
    const degraded = parseSuccessCriteria([
      { kind: "tool_called", name: "reclassify_intent" },
      { kind: "deal_stage_kind", kind_expected: "won" },
      { kind: "media_sent", media: "audio" },
      { kind: "max_cost_usd", usd: 0 },
    ]);
    expect(degraded.map((c) => c.kind)).toEqual(["unknown", "unknown", "unknown", "unknown"]);
  });

  it("etiqueta cada kind v2 en español", () => {
    const labels = parseSuccessCriteria(V2).map(criterionLabel);
    expect(labels).toEqual([
      "Dato «phone» guardado · /^\\+57/i",
      "Oportunidad en etapa Calificado",
      "Fotos enviadas ≥ 2",
      "Pago reportado",
      "Entrega: recogida",
      "Promoción BIENVENIDA10 aplicada",
      "Foto reconocida como CAM-01 (top-3)",
      "Intención sales",
      "Cita en ≤ 6 turnos",
      "Usa catalog_lookup ≥ 2×",
      "No usa apply_promotion",
      "Sin precios sin respaldo",
      "Sin muletillas de sistema",
      "Saludos ≤ 1",
      "≤ 4 llamadas LLM/turno",
      "Costo ≤ US$ 0.5",
    ]);
  });

  it("validateCriteriaSet: la misma tool exigida y prohibida es excluyente; rangos v2 se avisan", () => {
    const conflict = validateCriteriaSet([
      { kind: "tool_called", name: "catalog_lookup", min: 1 },
      { kind: "tool_not_called", name: "catalog_lookup" },
    ]);
    expect(conflict).toEqual(["«Herramienta usada» y «Herramienta NO usada» de catalog_lookup son mutuamente excluyentes"]);
    expect(
      validateCriteriaSet([
        { kind: "tool_called", name: "catalog_lookup", min: 1 },
        { kind: "tool_not_called", name: "apply_promotion" },
      ]),
    ).toEqual([]);
    const ranges = validateCriteriaSet([
      { kind: "contact_field_captured", field: "Nombre" },
      { kind: "recognition_matched", sku: "", max_rank: 9 },
      { kind: "max_greetings", max: 7 },
      { kind: "max_cost_usd", usd: 0 },
    ]);
    expect(ranges).toHaveLength(5);
  });
});

