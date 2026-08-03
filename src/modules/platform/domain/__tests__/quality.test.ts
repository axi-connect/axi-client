import {
  criterionLabel,
  hasNestedQuantifier,
  MAX_CRITERIA,
  parseSuccessCriteria,
  validateCriteriaSet,
  validatePattern,
  type SuccessCriterion,
} from "../quality";

describe("parseSuccessCriteria", () => {
  it("parsea los ocho kinds v1 con sus campos", () => {
    const parsed = parseSuccessCriteria([
      { kind: "order_created", min_items: 5, product_codes: ["BURGER"] },
      { kind: "order_not_created" },
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
