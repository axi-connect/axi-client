import {
  CALL_OUTCOME_MAP,
  CALL_STATUS_MAP,
  callResultBadge,
  callResultPill,
  confidenceLabel,
  isInboundMessage,
  mapSessionToRow,
  parseGoalAssessment,
  parseTurnLatency,
  summaryWaitRemainingMs,
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

describe("calls · espera del resumen (auditoría F4, P2)", () => {
  const ended = "2026-09-26T14:14:13.000Z";
  const talked = [{ seq: 1, role: "caller" as const, text: "Hola", at_ms: 0, spoken_at_ms: null, interrupted: false }];
  const t0 = Date.parse(ended);

  it("cuenta los 10 minutos desde que colgó y luego es 0", () => {
    expect(summaryWaitRemainingMs({ summary: null, ended_at: ended, segments: talked }, t0 + 60_000)).toBe(540_000);
    expect(summaryWaitRemainingMs({ summary: null, ended_at: ended, segments: talked }, t0 + 11 * 60_000)).toBe(0);
  });

  it("no se espera si ya hay resumen, si no colgó o si no hubo conversación", () => {
    expect(summaryWaitRemainingMs({ summary: "Listo.", ended_at: ended, segments: talked }, t0)).toBe(0);
    expect(summaryWaitRemainingMs({ summary: null, ended_at: null, segments: talked }, t0)).toBe(0);
    expect(summaryWaitRemainingMs({ summary: null, ended_at: ended, segments: [] }, t0)).toBe(0);
  });
});

describe("recado de una entrante (Entrega 2)", () => {
  it("lo dice el servidor: un recado es «Dejó un recado», con o sin agente (relay no disponible)", () => {
    for (const ai_agent_id of [null, "a-1"]) {
      const row = { status: "completed" as const, outcome: "callback_requested" as const, inbound_message: true, ai_agent_id };
      expect(isInboundMessage(row)).toBe(true);
      expect(callResultPill(row)).toEqual({ label: "Dejó un recado", tone: "warning" });
    }
  });

  it("sin la marca del servidor no se infiere nada, aunque falte el agente", () => {
    expect(isInboundMessage({ inbound_message: false })).toBe(false);
    expect(callResultPill({ status: "completed", outcome: "callback_requested", inbound_message: false }).label).not.toBe(
      "Dejó un recado",
    );
  });
});

describe("Historial: la fila que pinta la tabla (auditoría F5 fase 2)", () => {
  it("mapSessionToRow conserva inbound_message y la píldora dice «Dejó un recado»", () => {
    const dto = {
      id: "s1",
      direction: "inbound",
      purpose: "inbound",
      mode: "reactive",
      call_type: "inbound_attention",
      last_stage: null,
      status: "completed",
      outcome: "callback_requested",
      answered_by: "human",
      inbound_message: true,
      inbound_message_reason: "relay_unavailable",
      contact: { id: "c1", name: "Laura" },
      from_number: "+573002194410",
      to_number: "+576015803300",
      ai_agent_id: "a-1",
      ai_agent_name: "Sofía",
      attempt: 1,
      duration_seconds: 14,
      has_recording: true,
      cost_estimate_usd: null,
      started_at: null,
      ended_at: null,
      created_at: "2026-09-30T10:00:00.000Z",
    } as unknown as Parameters<typeof mapSessionToRow>[0];
    const row = mapSessionToRow(dto);
    expect(row.inbound_message).toBe(true);
    expect(callResultPill(row).label).toBe("Dejó un recado");
  });

  it("una llamada que pidió que la llamen, sin recado, lo dice en palabras", () => {
    expect(callResultPill({ status: "completed", outcome: "callback_requested", inbound_message: false }).label).toBe(
      "Pidió que lo llamen",
    );
  });
});

