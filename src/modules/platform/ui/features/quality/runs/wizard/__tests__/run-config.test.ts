import {
  buildCreateRunDTO,
  configOccupancySeconds,
  defaultRunConfigValues,
  validateRunConfig,
  type RunConfigValues,
} from "../run-config";

const QA_SUITE: RunConfigValues = { ...defaultRunConfigValues, suiteId: "su-1" };
const STRESS: RunConfigValues = { ...defaultRunConfigValues, kind: "stress" };

describe("validateRunConfig — QA", () => {
  it("suite válida → sin errores; sin suite → error", () => {
    expect(validateRunConfig(QA_SUITE)).toEqual([]);
    expect(validateRunConfig(defaultRunConfigValues)).toEqual(["Elige la suite a ejecutar"]);
  });

  it("modo escenarios exige 1–50 ids", () => {
    const byScenarios: RunConfigValues = { ...defaultRunConfigValues, qaMode: "scenarios" };
    expect(validateRunConfig(byScenarios)).toEqual(["Elige al menos un escenario"]);
    expect(validateRunConfig({ ...byScenarios, scenarioIds: ["s-1"] })).toEqual([]);
    const tooMany = Array.from({ length: 51 }, (_, i) => `s-${i}`);
    expect(validateRunConfig({ ...byScenarios, scenarioIds: tooMany })).toEqual([
      "Máximo 50 escenarios por ejecución",
    ]);
  });

  it("concurrencia fuera de 1–16 o no entera → error", () => {
    expect(validateRunConfig({ ...QA_SUITE, concurrency: 0 })).toHaveLength(1);
    expect(validateRunConfig({ ...QA_SUITE, concurrency: 17 })).toHaveLength(1);
    expect(validateRunConfig({ ...QA_SUITE, concurrency: 2.5 })).toHaveLength(1);
  });
});

describe("validateRunConfig — estrés", () => {
  it("defaults de estrés (20×3 mock) → válido", () => {
    expect(validateRunConfig(STRESS)).toEqual([]);
  });

  it("requeridos y rangos: conversaciones 1–200, turnos 1–10, latencia 0–30000", () => {
    expect(validateRunConfig({ ...STRESS, conversations: 0 })).toHaveLength(1);
    expect(validateRunConfig({ ...STRESS, conversations: 201 })).toHaveLength(1);
    expect(validateRunConfig({ ...STRESS, turnsPerConversation: 11 })).toHaveLength(1);
    expect(validateRunConfig({ ...STRESS, mockLatencyMs: 30_001 })).toHaveLength(1);
  });

  it("el tope de gasto solo aplica en modo real (>0, ≤500)", () => {
    expect(validateRunConfig({ ...STRESS, aiMode: "mock", spendCapUsd: 0 })).toEqual([]);
    expect(validateRunConfig({ ...STRESS, aiMode: "real", spendCapUsd: 0 })).toHaveLength(1);
    expect(validateRunConfig({ ...STRESS, aiMode: "real", spendCapUsd: 501 })).toHaveLength(1);
    expect(validateRunConfig({ ...STRESS, aiMode: "real", spendCapUsd: 5 })).toEqual([]);
  });

  it("bloquea cuando la ocupación excede los 3600 s", () => {
    const heavy: RunConfigValues = {
      ...STRESS,
      conversations: 200,
      turnsPerConversation: 10,
      mockLatencyMs: 2000,
    };
    expect(configOccupancySeconds(heavy)).toBe(4000);
    expect(validateRunConfig(heavy)).toEqual([
      "La prueba excede el presupuesto de ocupación (4000 s de 3600 s): reduce conversaciones, turnos o latencia",
    ]);
  });
});

describe("buildCreateRunDTO", () => {
  it("QA por suite: viaja suite_id, jamás scenario_ids (XOR del backend)", () => {
    const dto = buildCreateRunDTO({ companyId: "t-1", agentId: "a-1", config: QA_SUITE });
    expect(dto).toEqual({
      company_id: "t-1",
      kind: "qa",
      agent_id: "a-1",
      suite_id: "su-1",
      concurrency: 4,
    });
  });

  it("QA por escenarios: viaja scenario_ids, jamás suite_id", () => {
    const dto = buildCreateRunDTO({
      companyId: "t-1",
      agentId: "a-1",
      config: { ...defaultRunConfigValues, qaMode: "scenarios", scenarioIds: ["s-1", "s-2"], suiteId: "su-x" },
    });
    expect(dto).toMatchObject({ scenario_ids: ["s-1", "s-2"] });
    expect(dto).not.toHaveProperty("suite_id");
  });

  it("estrés mock: sin spend_cap_usd; real: con tope", () => {
    const mock = buildCreateRunDTO({ companyId: "t-1", agentId: "a-1", config: STRESS });
    expect(mock).toEqual({
      company_id: "t-1",
      kind: "stress",
      agent_id: "a-1",
      ai_mode: "mock",
      conversations: 20,
      turns_per_conversation: 3,
      mock_latency_ms: 800,
    });
    const real = buildCreateRunDTO({
      companyId: "t-1",
      agentId: "a-1",
      config: { ...STRESS, aiMode: "real", spendCapUsd: 10 },
    });
    expect(real).toMatchObject({ ai_mode: "real", spend_cap_usd: 10 });
  });
});
