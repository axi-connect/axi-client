import {
  INITIAL_LIVE_CALL_PULSE,
  auraModeFor,
  currentStage,
  liveCallPulseReducer,
  stageEntries,
  stageMarks,
  stageProgress,
  type LiveCallPulse,
  type LiveCallPulseAction,
} from "@/modules/calls/domain/live-call";

function run(...actions: LiveCallPulseAction[]): LiveCallPulse {
  return actions.reduce(liveCallPulseReducer, INITIAL_LIVE_CALL_PULSE);
}

describe("pulso de la llamada en vivo (premium F2)", () => {
  it("sin eventos de habla, el aura sigue la fase del agente", () => {
    expect(auraModeFor(run())).toBe("idle");
    expect(auraModeFor(run({ type: "phase", phase: "greeting" }))).toBe("agent");
    expect(auraModeFor(run({ type: "phase", phase: "thinking" }))).toBe("thinking");
    expect(auraModeFor(run({ type: "phase", phase: "speaking" }))).toBe("agent");
    expect(auraModeFor(run({ type: "phase", phase: "listening" }))).toBe("listening");
  });

  it("con eventos de habla manda quién habla; el cliente gana si hablan los dos (barge-in)", () => {
    const listening = run({ type: "phase", phase: "listening" });
    const caller = liveCallPulseReducer(listening, { type: "speaker", speaker: "caller", state: "on" });
    expect(auraModeFor(caller)).toBe("caller");

    const both = liveCallPulseReducer(caller, { type: "speaker", speaker: "agent", state: "on" });
    expect(auraModeFor(both)).toBe("caller");

    const agentOnly = liveCallPulseReducer(both, { type: "speaker", speaker: "caller", state: "off" });
    expect(auraModeFor(agentOnly)).toBe("agent");

    // Nadie habla: la fase decide entre pensar y escuchar (no se vuelve a «agent» por la fase)
    const quiet = liveCallPulseReducer(agentOnly, { type: "speaker", speaker: "agent", state: "off" });
    expect(auraModeFor(liveCallPulseReducer(quiet, { type: "phase", phase: "speaking" }))).toBe(
      "listening",
    );
    expect(auraModeFor(liveCallPulseReducer(quiet, { type: "phase", phase: "thinking" }))).toBe(
      "thinking",
    );
  });

  it("al cerrar, el aura se apaga aunque se haya perdido un «off»", () => {
    const pulse = run(
      { type: "speaker", speaker: "agent", state: "on" },
      { type: "phase", phase: "closed" },
    );
    expect(pulse.agentSpeaking).toBe(false);
    expect(auraModeFor(pulse)).toBe("idle");
    expect(auraModeFor(run({ type: "phase", phase: "ending" }))).toBe("idle");
  });

  it("el borrador del agente junta las oraciones de un turno y su segmento lo reemplaza", () => {
    const drafting = run(
      { type: "agent_text", generation: 3, text: "Claro que sí." },
      { type: "agent_text", generation: 3, text: "Tengo un espacio a las 2:30." },
    );
    expect(drafting.draft).toEqual({ generation: 3, text: "Claro que sí. Tengo un espacio a las 2:30." });

    // Un segmento del cliente no toca el borrador; el del agente sí
    expect(liveCallPulseReducer(drafting, { type: "segment", role: "caller" }).draft).not.toBeNull();
    expect(liveCallPulseReducer(drafting, { type: "segment", role: "agent" }).draft).toBeNull();
  });

  it("barge-in encadenado: el segmento tardío del turno abortado NO borra el borrador del turno nuevo", () => {
    const newTurn = run(
      { type: "agent_text", generation: 3, text: "Te llamo de Axi." },
      { type: "agent_text", generation: 5, text: "Claro, dime." },
    );
    const late = liveCallPulseReducer(newTurn, { type: "segment", role: "agent", generation: 3 });
    expect(late.draft).toEqual({ generation: 5, text: "Claro, dime." });
    expect(liveCallPulseReducer(late, { type: "segment", role: "agent", generation: 5 }).draft).toBeNull();
    // Un servidor anterior (sin generación) conserva el comportamiento de antes
    expect(liveCallPulseReducer(newTurn, { type: "segment", role: "agent" }).draft).toBeNull();
  });

  it("un turno nuevo (otra generación) empieza su borrador de cero; el texto vacío se ignora", () => {
    const next = run(
      { type: "agent_text", generation: 3, text: "Hola." },
      { type: "agent_text", generation: 4, text: "¿Te sirve?" },
      { type: "agent_text", generation: 4, text: "   " },
    );
    expect(next.draft).toEqual({ generation: 4, text: "¿Te sirve?" });
  });

  it("al terminar la llamada el borrador se descarta", () => {
    const pulse = run(
      { type: "agent_text", generation: 1, text: "Hasta luego." },
      { type: "phase", phase: "ending" },
    );
    expect(pulse.draft).toBeNull();
  });
});

describe("plan de modos · etapas en vivo", () => {
  const stages = [
    { key: "apertura", label: "Apertura" },
    { key: "descubrimiento", label: "Descubrimiento" },
    { key: "cierre", label: "Cierre" },
  ];

  it("el reductor guarda la etapa del evento y no cambia si se repite", () => {
    const first = liveCallPulseReducer(INITIAL_LIVE_CALL_PULSE, { type: "stage", stage: "descubrimiento" });
    expect(first.stage).toBe("descubrimiento");
    expect(liveCallPulseReducer(first, { type: "stage", stage: "descubrimiento" })).toBe(first);
  });

  it("currentStage: el evento en vivo manda; sin él, la última de la ruta del detalle", () => {
    expect(currentStage(INITIAL_LIVE_CALL_PULSE, ["apertura", "descubrimiento"])).toBe("descubrimiento");
    expect(currentStage({ ...INITIAL_LIVE_CALL_PULSE, stage: "cierre" }, ["apertura"])).toBe("cierre");
    expect(currentStage(INITIAL_LIVE_CALL_PULSE, [])).toBeNull();
  });

  it("stageProgress en vivo: recorridas, la actual y las que faltan; sin etapa no hay progreso", () => {
    const live = stageProgress(stages, "descubrimiento", { goalMet: false, finished: false });
    expect(live?.steps.map((s) => s.state)).toEqual(["done", "reached", "pending"]);
    expect(live?.position).toBe("Descubrimiento · 2 de 3");
    expect(stageProgress(stages, null, { goalMet: false, finished: false })).toBeNull();
    expect(stageProgress(stages, "otra", { goalMet: false, finished: false })).toBeNull();
  });

  it("stageProgress terminada: se cortó antes de la última; cumplida, lo que falta no hizo falta", () => {
    const fell = stageProgress(stages, "descubrimiento", { goalMet: false, finished: true });
    expect(fell?.steps.map((s) => s.state)).toEqual(["done", "fell", "pending"]);
    const met = stageProgress(stages, "apertura", { goalMet: true, finished: true });
    expect(met?.steps.map((s) => s.state)).toEqual(["met", "skipped", "skipped"]);
    // En la última etapa sin veredicto no «se cortó»: llegó al final.
    const end = stageProgress(stages, "cierre", { goalMet: false, finished: true });
    expect(end?.steps.at(-1)?.state).toBe("reached");
  });

  it("stageEntries: el primer stage_changed de cada etapa, en segundos; la primera entra en 0", () => {
    const entries = stageEntries([
      { type: "stage_changed", payload: { to: "descubrimiento", at_ms: 34_900 } },
      { type: "turn_completed", payload: {} },
      { type: "stage_changed", payload: { to: "apertura", at_ms: 50_000 } },
      { type: "stage_changed", payload: { to: "descubrimiento", at_ms: 61_000 } },
      { type: "stage_changed", payload: { to: 3 } },
    ]);
    expect([...entries]).toEqual([["descubrimiento", 34], ["apertura", 50]]);
    const progress = stageProgress(stages, "descubrimiento", {
      goalMet: false,
      finished: true,
      entries: new Map([["descubrimiento", 34]]),
    });
    expect(progress?.steps.map((s) => s.entered_s)).toEqual([0, 34, null]);
  });

  it("stageMarks pone la primera etapa antes del primer turno del agente y cada cambio en su turno", () => {
    const segments = [
      { seq: 1, role: "system", at_ms: 0 },
      { seq: 2, role: "agent", at_ms: 5_000 },
      { seq: 3, role: "caller", at_ms: 9_000 },
      { seq: 4, role: "agent", at_ms: 12_000 },
    ];
    const events = [{ type: "stage_changed", payload: { to: "descubrimiento", at_ms: 12_400 } }];
    const marks = stageMarks(segments, events, stages);
    expect(marks.get(2)).toBe("Apertura");
    expect(marks.get(4)).toBe("Descubrimiento");
    expect(marks.has(3)).toBe(false);
  });
});
