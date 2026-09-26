import type { JourneyCadenceDTO } from "../journey";
import { cadenceAt, cadencePlan } from "../cadence-plan";

const ON = { rules: true, ai: false };
const OFF = { rules: false, ai: false };
const stage = (cadence: JourneyCadenceDTO | null, over: { auto_advance?: boolean; stage_kind?: "contacted" | "custom" } = {}) => ({
  cadence,
  auto_advance: over.auto_advance ?? true,
  stage_kind: over.stage_kind ?? ("contacted" as const),
});

describe("cadenceAt", () => {
  it("días enteros como día; lo demás en horas", () => {
    expect([0, 4, 24, 48, 36].map(cadenceAt)).toEqual(["Día 0", "+4 h", "Día 1", "Día 2", "+36 h"]);
  });
});

describe("cadencePlan — la frase y la línea de tiempo", () => {
  it("sin cadencia no hay plan que contar", () => {
    expect(cadencePlan(stage(null), ON)).toBeNull();
  });

  it("3 mensajes cada día: intentos en día 0, 1 y 2; se agota el día 3", () => {
    const plan = cadencePlan(stage({ max_attempts: 3, wait_hours: 24, channel: "message", exhausted_action: "let_cool" }), ON);
    expect(plan?.headline).toBe("Escribe 3 veces en 3 días y la mueve sola si avanza.");
    expect(plan?.attempts.map((mark) => mark.at)).toEqual(["Día 0", "Día 1", "Día 2"]);
    expect(plan?.attempts[0].detail).toBe("Abre la conversación y espera 1 día la respuesta.");
    expect(plan?.outcome).toMatchObject({ at: "Día 3", title: "Al agotarse: dejar enfriar", tone: "neutral" });
  });

  it("no promete que se mueva sola con el avance apagado (del negocio, de la etapa o personalizada)", () => {
    const cadence: JourneyCadenceDTO = { max_attempts: 2, wait_hours: 4, channel: "call", exhausted_action: "mark_lost" };
    expect(cadencePlan(stage(cadence), OFF)?.headline).toBe("Llama 2 veces en 8 h.");
    expect(cadencePlan(stage(cadence, { auto_advance: false }), ON)?.headline).toBe("Llama 2 veces en 8 h.");
    expect(cadencePlan(stage(cadence, { stage_kind: "custom" }), ON)?.headline).toBe("Llama 2 veces en 8 h.");
    expect(cadencePlan(stage(cadence), ON)?.headline).toBe("Llama 2 veces en 8 h y la mueve sola si avanza.");
  });

  it("un solo intento se dice como espera, y la acción al agotarse es la del motor", () => {
    const plan = cadencePlan(
      stage({ max_attempts: 1, wait_hours: 48, channel: "call_then_message", exhausted_action: "hand_to_human" }, { auto_advance: false }),
      ON,
    );
    expect(plan?.headline).toBe("Llama una vez (si no contesta, escribe) y espera 2 días la respuesta.");
    expect(plan?.outcome).toMatchObject({ at: "Día 2", tone: "warning", detail: "Se crea una tarea para quien lleva la oportunidad." });
  });
});
