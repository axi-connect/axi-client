import {
  hasOtherCostCap,
  MAX_LIMITS,
  METRICS,
  metricInfo,
  newLimitRow,
  validateLimits,
  type LimitInput,
} from "../limits";

const limit = (over: Partial<LimitInput>): LimitInput => ({ ...newLimitRow(), ...over });

describe("metricInfo (F3 voz)", () => {
  it("tts_characters está en el catálogo con unidad characters", () => {
    expect(metricInfo("tts_characters")).toMatchObject({
      label: "Caracteres de voz",
      unit: "characters",
    });
  });
});

describe("validateLimits (invariantes del backend en UI)", () => {
  it("un set válido no produce issues", () => {
    const limits = [
      limit({ metric: "ai_tokens_output", period: "day", limit_value: 200_000 }),
      limit({ metric: "messages_sent", period: "billing_cycle", limit_value: 50_000, action: "block" }),
      limit({ metric: "ai_requests", period: "billing_cycle", limit_value: 500_000, is_cost_limit: true }),
    ];
    expect(validateLimits(limits)).toEqual([]);
  });

  it("detecta duplicados (metric, period) señalando la fila ofensora", () => {
    const limits = [
      limit({ metric: "messages_sent", period: "day" }),
      limit({ metric: "messages_sent", period: "day" }),
      limit({ metric: "messages_sent", period: "billing_cycle" }), // otro periodo: válido
    ];
    const issues = validateLimits(limits);
    expect(issues).toHaveLength(1);
    expect(issues[0].row).toBe(1);
    expect(issues[0].message).toMatch(/ya existe un límite/i);
  });

  it("rechaza un segundo cost cap", () => {
    const limits = [
      limit({ metric: "ai_requests", period: "billing_cycle", is_cost_limit: true }),
      limit({ metric: "ai_tokens_input", period: "billing_cycle", is_cost_limit: true }),
    ];
    const issues = validateLimits(limits);
    expect(issues).toEqual([{ row: 1, message: "Solo puede haber un cost cap por set." }]);
  });

  it("un cost cap con periodo day es inválido", () => {
    const issues = validateLimits([limit({ period: "day", is_cost_limit: true })]);
    expect(issues[0].row).toBe(0);
    expect(issues[0].message).toMatch(/ciclo de facturación/i);
  });

  it("rechaza valores negativos y gracia fuera de rango", () => {
    const issues = validateLimits([
      limit({ limit_value: -1 }),
      limit({ metric: "messages_sent", grace_pct: 150 }),
    ]);
    expect(issues).toEqual([
      { row: 0, message: "El valor no puede ser negativo." },
      { row: 1, message: "La gracia debe estar entre 0 y 100 %." },
    ]);
  });

  it("acepta 0 como «sin cuota», igual que el backend", () => {
    expect(validateLimits([limit({ metric: "call_seconds", limit_value: 0 })])).toEqual([]);
  });

  it("rechaza storage_bytes: el espacio se fija como almacenamiento incluido del plan", () => {
    const issues = validateLimits([limit({ metric: "storage_bytes" })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/almacenamiento incluido/);
  });

  it("el editor ya no ofrece storage_bytes y sí las métricas que el backend acepta", () => {
    const offered = METRICS.map((m) => m.value);
    expect(offered).not.toContain("storage_bytes");
    expect(offered).toEqual(expect.arrayContaining(["call_seconds", "product_recognitions", "sms_sent"]));
    expect(metricInfo("storage_bytes")).toEqual({ label: "Ingesta de archivos", unit: "bytes" });
  });

  it("rechaza más de 30 límites (issue global, row -1)", () => {
    const metrics = ["ai_tokens_input", "ai_tokens_output", "ai_requests", "messages_sent", "messages_received", "template_sent", "external_api_calls", "conversations_active", "call_seconds"] as const;
    // 31 filas sin duplicados (metric, period) reales es imposible con 9x2;
    // basta verificar el issue global de tamaño.
    const limits = Array.from({ length: MAX_LIMITS + 1 }, (_, i) =>
      limit({ metric: metrics[i % metrics.length] }),
    );
    const issues = validateLimits(limits);
    expect(issues.some((issue) => issue.row === -1 && /máximo 30/i.test(issue.message))).toBe(true);
  });
});

describe("hasOtherCostCap", () => {
  it("ignora la propia fila y detecta el cost cap ajeno", () => {
    const limits = [
      limit({ is_cost_limit: true, period: "billing_cycle" }),
      limit({ metric: "messages_sent" }),
    ];
    expect(hasOtherCostCap(limits, 0)).toBe(false);
    expect(hasOtherCostCap(limits, 1)).toBe(true);
  });
});
