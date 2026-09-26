import { INITIAL_LIVE_CALL_PULSE, type LiveCallPulse } from "@/modules/calls/domain/live-call";
import { speakerFirstName, stagePhrase, whoLabel } from "../live-phrase";

const segments = [
  { seq: 1, role: "agent" as const, text: "Hola, ¿hablo con Laura?" },
  { seq: 2, role: "caller" as const, text: "Sí, con ella." },
];

function pulse(overrides: Partial<LiveCallPulse> = {}): LiveCallPulse {
  return { ...INITIAL_LIVE_CALL_PULSE, ...overrides };
}

describe("la frase del escenario en vivo (premium F3)", () => {
  it("el borrador del agente manda sobre el transcript, al paso de su voz", () => {
    const phrase = stagePhrase(segments, pulse({ draft: { generation: 2, text: "Claro que sí." } }), "agent");
    expect(phrase).toEqual({ role: "agent", text: "Claro que sí.", dim: false, msPerWord: 250 });
  });

  it("sin borrador va la última frase; la del cliente se revela rápido", () => {
    expect(stagePhrase(segments, pulse(), "listening")).toMatchObject({
      role: "caller",
      text: "Sí, con ella.",
      dim: false,
      msPerWord: 70,
    });
  });

  it("se atenúa cuando ya no es de quien tiene la palabra o el agente piensa", () => {
    expect(stagePhrase(segments, pulse(), "thinking")?.dim).toBe(true);
    expect(stagePhrase(segments, pulse(), "agent")?.dim).toBe(true);
    expect(stagePhrase(segments, pulse(), "caller")?.dim).toBe(false);
    expect(
      stagePhrase(segments, pulse({ draft: { generation: 1, text: "Te cuento" } }), "caller")?.dim,
    ).toBe(true);
  });

  it("sin nada dicho aún no hay frase", () => {
    expect(stagePhrase([], pulse(), "idle")).toBeNull();
  });

  it("quién tiene la palabra en texto, con el primer nombre", () => {
    const names = { agent: speakerFirstName("Sofía Valentina", "el agente"), caller: speakerFirstName(null, "el cliente") };
    expect(names).toEqual({ agent: "Sofía", caller: "el cliente" });
    expect(whoLabel("agent", names, false)).toBe("Habla Sofía");
    expect(whoLabel("caller", names, false)).toBe("Habla el cliente");
    expect(whoLabel("thinking", names, false)).toBe("Sofía está pensando…");
    expect(whoLabel("agent", names, true)).toBe("Llamando…");
  });
});
