import {
  INITIAL_LIVE_CALL_PULSE,
  auraModeFor,
  liveCallPulseReducer,
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
