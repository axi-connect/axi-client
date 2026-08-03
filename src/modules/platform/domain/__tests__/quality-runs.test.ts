import {
  describeSpendCapExceeded,
  describeTenantNotEligible,
  estimateStressOccupancySeconds,
  isCaseSettled,
  isInvalidCriteriaCheck,
  isRunActive,
  isRunCancelable,
  isRunPurgeable,
  parseCaseTimings,
  parseChecks,
  parseFailureReason,
  parseRunMetrics,
  parseRunParams,
  STRESS_BUDGET_S,
  type CaseStatus,
  type RunStatus,
} from "../quality-runs";

describe("máquina de estados de la ejecución", () => {
  it("isRunActive: solo pending/running/purging", () => {
    const active: RunStatus[] = ["pending", "running", "purging"];
    const settled: RunStatus[] = ["completed", "failed", "canceled", "purged"];
    for (const status of active) expect(isRunActive(status)).toBe(true);
    for (const status of settled) expect(isRunActive(status)).toBe(false);
  });

  it("isRunCancelable: solo pending/running", () => {
    expect(isRunCancelable("pending")).toBe(true);
    expect(isRunCancelable("running")).toBe(true);
    for (const status of ["completed", "failed", "canceled", "purging", "purged"] as RunStatus[]) {
      expect(isRunCancelable(status)).toBe(false);
    }
  });

  it("isRunPurgeable: solo terminales con datos", () => {
    for (const status of ["completed", "failed", "canceled"] as RunStatus[]) {
      expect(isRunPurgeable(status)).toBe(true);
    }
    for (const status of ["pending", "running", "purging", "purged"] as RunStatus[]) {
      expect(isRunPurgeable(status)).toBe(false);
    }
  });

  it("isCaseSettled: todo salvo queued/running", () => {
    expect(isCaseSettled("queued")).toBe(false);
    expect(isCaseSettled("running")).toBe(false);
    for (const status of ["passed", "failed", "blocked", "error", "timeout"] as CaseStatus[]) {
      expect(isCaseSettled(status)).toBe(true);
    }
  });
});

describe("parseFailureReason", () => {
  it("null/vacío → null", () => {
    expect(parseFailureReason(null)).toBeNull();
    expect(parseFailureReason(undefined)).toBeNull();
    expect(parseFailureReason("")).toBeNull();
  });

  it("valores exactos → categoría propia (no culpan al agente)", () => {
    expect(parseFailureReason("run_canceled")).toMatchObject({ category: "canceled", tone: "neutral" });
    expect(parseFailureReason("company_suspended")).toMatchObject({ category: "suspended", tone: "warning" });
    expect(parseFailureReason("ai_paused")).toMatchObject({ category: "ai_paused" });
    expect(parseFailureReason("scenario_missing")).toMatchObject({ category: "instrument" });
    expect(parseFailureReason("simulator_channel_missing")).toMatchObject({ category: "instrument" });
  });

  it("prefijos tipados → instrumento / infraestructura con el detalle crudo", () => {
    expect(parseFailureReason("sim_client_failed: timeout del simulador")).toMatchObject({
      category: "instrument",
      tone: "warning",
      detail: "sim_client_failed: timeout del simulador",
    });
    expect(parseFailureReason("infrastructure_failed: Redis down")).toMatchObject({
      category: "infrastructure",
    });
  });

  it("texto desconocido → fallo del agente (destructive) con el crudo", () => {
    expect(parseFailureReason("algo inesperado")).toMatchObject({
      category: "agent",
      tone: "destructive",
      detail: "algo inesperado",
    });
  });
});

describe("parseChecks", () => {
  it("filtra entradas ilegibles y conserva detail opcional", () => {
    expect(
      parseChecks([
        { kind: "order_created", passed: false, detail: "pedido con 3 unidades (< 5)" },
        { kind: "escalated", passed: true },
        { kind: "sin_passed" },
        "basura",
        null,
      ]),
    ).toEqual([
      { kind: "order_created", passed: false, detail: "pedido con 3 unidades (< 5)" },
      { kind: "escalated", passed: true },
    ]);
  });

  it("no-array → vacío; invalid_criteria se identifica", () => {
    expect(parseChecks(null)).toEqual([]);
    expect(isInvalidCriteriaCheck({ kind: "invalid_criteria", passed: false })).toBe(true);
    expect(isInvalidCriteriaCheck({ kind: "escalated", passed: true })).toBe(false);
  });
});

describe("parseRunMetrics", () => {
  it("null hasta finalizar; forma rara degrada a null", () => {
    expect(parseRunMetrics(null)).toBeNull();
    expect(parseRunMetrics([1, 2])).toBeNull();
  });

  it("extrae números y tolera campos ausentes", () => {
    const metrics = parseRunMetrics({
      turns_total: 42,
      reply_e2e_p50_ms: 4100,
      reply_e2e_p95_ms: null,
      conversations_per_min: "3.2",
      queue_depth_samples: [{ at: "x" }, "ruido"],
    });
    expect(metrics).toEqual({
      turns_total: 42,
      reply_e2e_p50_ms: 4100,
      reply_e2e_p95_ms: null,
      replies_observed: null,
      duration_ms: null,
      conversations_per_min: null,
      turns_per_min: null,
      queue_depth_samples: [{ at: "x" }],
    });
  });
});

describe("parseRunParams / parseCaseTimings", () => {
  it("params opacos → números o null", () => {
    expect(parseRunParams({ concurrency: 4, spend_cap_usd: "5" })).toEqual({
      concurrency: 4,
      conversations: null,
      turns_per_conversation: null,
      mock_latency_ms: null,
      spend_cap_usd: null,
    });
    expect(parseRunParams(null).concurrency).toBeNull();
  });

  it("timings exigen `turn` numérico; el resto es tolerante", () => {
    expect(
      parseCaseTimings([
        { turn: 1, injected_at: "2026-08-03T12:00:00Z", replied_at: null, e2e_ms: 4100 },
        { injected_at: "sin turn" },
        null,
      ]),
    ).toEqual([{ turn: 1, injected_at: "2026-08-03T12:00:00Z", replied_at: null, e2e_ms: 4100 }]);
    expect(parseCaseTimings("nada")).toEqual([]);
  });
});

describe("estimateStressOccupancySeconds", () => {
  it("conversations × turns × max(latencia, 800) / 1000", () => {
    expect(estimateStressOccupancySeconds({ conversations: 20, turnsPerConversation: 3, mockLatencyMs: 800 })).toBe(48);
    expect(estimateStressOccupancySeconds({ conversations: 10, turnsPerConversation: 2, mockLatencyMs: 2000 })).toBe(40);
  });

  it("clampa la latencia mock por debajo de 800 ms (regla del backend)", () => {
    expect(estimateStressOccupancySeconds({ conversations: 10, turnsPerConversation: 2, mockLatencyMs: 100 })).toBe(16);
  });

  it("frontera del presupuesto: 200 conv × 10 turnos × 1800 ms = 3600 s", () => {
    expect(
      estimateStressOccupancySeconds({ conversations: 200, turnsPerConversation: 10, mockLatencyMs: 1800 }),
    ).toBe(STRESS_BUDGET_S);
  });
});

describe("describeTenantNotEligible", () => {
  it("mensaje por reason, con cifras si vienen", () => {
    expect(describeTenantNotEligible({ reason: "suspended" })).toMatch(/suspendido/);
    expect(describeTenantNotEligible({ reason: "agent_not_active" })).toMatch(/no está activo/);
    expect(describeTenantNotEligible({ reason: "target_is_mock_clone" })).toMatch(/clon interno/);
    expect(
      describeTenantNotEligible({ reason: "stress_budget_exceeded", occupancy_s: 4800, budget_s: 3600 }),
    ).toMatch(/4800 s de 3600 s/);
  });

  it("details ausente/parcial → fallback genérico", () => {
    expect(describeTenantNotEligible(undefined)).toBe("El tenant no es elegible para esta ejecución");
    expect(describeTenantNotEligible({ reason: "algo_nuevo" })).toBe(
      "El tenant no es elegible para esta ejecución",
    );
    expect(describeTenantNotEligible({ reason: "stress_budget_exceeded" })).toMatch(/presupuesto de ocupación/);
  });
});

describe("describeSpendCapExceeded", () => {
  it("no_pricing → sugerir mock; con cifras → mostrarlas", () => {
    expect(describeSpendCapExceeded({ reason: "no_pricing" })).toMatch(/modo mock/);
    expect(describeSpendCapExceeded({ estimated_usd: 7.5, spend_cap_usd: 5 })).toMatch(
      /7\.50 USD.*5\.00 USD/,
    );
  });

  it("details ausente → fallback accionable", () => {
    expect(describeSpendCapExceeded(null)).toMatch(/tope de gasto/);
  });
});
