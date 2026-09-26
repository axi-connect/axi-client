import {
  CALL_OUTCOME_MAP,
  CALL_STATUS_MAP,
  callResultBadge,
  callResultPill,
  confidenceLabel,
  parseGoalAssessment,
  parseTurnLatency,
} from "@/modules/calls/domain/call";

describe("calls · mapas de estado", () => {
  it("cada desenlace del contrato tiene etiqueta (incluidos los cierres del sistema, P0.2)", () => {
    for (const outcome of [
      "goal_met",
      "callback_requested",
      "voicemail",
      "hangup",
      "no_answer",
      "error",
      "transferred",
      "agent_closed",
      "silence_timeout",
      "max_duration",
      "quota_exhausted",
      "system_error",
    ]) {
      expect(CALL_OUTCOME_MAP[outcome]?.label).toBeTruthy();
    }
    expect(CALL_OUTCOME_MAP.silence_timeout?.label).toBe("Sin respuesta en línea");
    expect(CALL_OUTCOME_MAP.hangup?.label).toBe("Colgó");
  });

  it("el pill usa el desenlace si existe y el estado si la llamada sigue viva", () => {
    expect(callResultBadge({ status: "completed", outcome: "goal_met" })).toEqual({
      status: "goal_met",
      map: CALL_OUTCOME_MAP,
    });
    expect(callResultBadge({ status: "ringing", outcome: null })).toEqual({
      status: "ringing",
      map: CALL_STATUS_MAP,
    });
  });
});

describe("parseTurnLatency", () => {
  it("lee números finitos y descarta basura sin romper", () => {
    const latency = parseTurnLatency({
      latency: {
        total_turn_ms: 1200,
        llm_first_token_ms: "x",
        tool_ms: Number.NaN,
        tools: [{ name: "catalog_lookup", ms: 300 }, { name: 42 }],
        filler_sent: true,
        interrupted: "yes",
      },
    });
    expect(latency?.total_turn_ms).toBe(1200);
    expect(latency?.llm_first_token_ms).toBeUndefined();
    expect(latency?.tool_ms).toBeUndefined();
    expect(latency?.tools).toEqual([{ name: "catalog_lookup", ms: 300 }]);
    expect(latency?.filler_sent).toBe(true);
    expect(latency?.interrupted).toBe(false);
  });

  it("payload sin latencia → null", () => {
    expect(parseTurnLatency({})).toBeNull();
    expect(parseTurnLatency(null)).toBeNull();
  });
});

describe("calls · llamada terminada (premium F4)", () => {
  it("el resultado como StatePill: cuatro tonos, info cae a neutro", () => {
    expect(callResultPill({ status: "completed", outcome: "goal_met" })).toEqual({
      label: "Objetivo cumplido",
      tone: "success",
    });
    expect(callResultPill({ status: "completed", outcome: "callback_requested" }).tone).toBe("neutral");
    expect(callResultPill({ status: "failed", outcome: null })).toEqual({ label: "Fallida", tone: "destructive" });
  });

  it("parseGoalAssessment toma el último veredicto y descarta payloads ilegibles", () => {
    const at = "2026-09-26T14:15:00.000Z";
    expect(
      parseGoalAssessment([
        { type: "goal_assessment", payload: { met: false, confidence: 0.4, reason: "viejo" }, created_at: at },
        { type: "turn_completed", payload: {}, created_at: at },
        { type: "goal_assessment", payload: { met: true, confidence: 0.92, reason: "aceptó el horario" }, created_at: at },
      ]),
    ).toEqual({ met: true, confidence: 0.92, reason: "aceptó el horario" });
    expect(parseGoalAssessment([{ type: "goal_assessment", payload: { met: "sí" }, created_at: at }])).toBeNull();
    expect(parseGoalAssessment([])).toBeNull();
  });

  it("la confianza del juez en palabras", () => {
    expect(confidenceLabel(0.92)).toBe("confianza alta");
    expect(confidenceLabel(0.6)).toBe("confianza media");
    expect(confidenceLabel(0.2)).toBe("confianza baja");
  });
});
