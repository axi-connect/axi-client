import type { ContactProfileDTO } from "../contact";
import type { ContactJourneyDTO } from "../journey";
import { contactNextUp, newContactsSplit, scoreProgress, type NextUpOrder } from "../contact-summary";

function profile(score: number, reached: string[]): ContactProfileDTO {
  return {
    contact_id: "c",
    score,
    score_signals: { milestones: Object.fromEntries(reached.map((key) => [key, { at: "2026-09-01T00:00:00Z" }])) },
    owner_user_id: null,
    last_activity_at: null,
    updated_at: "2026-09-01T00:00:00Z",
  };
}

describe("scoreProgress — el score en tramos y en palabras", () => {
  it("cuenta lo recorrido y lo que falta", () => {
    const p = scoreProgress(profile(60, ["engaged", "interest", "evaluating"]));
    expect(p.steps.map((s) => s.reached)).toEqual([true, true, true, false, false]);
    expect(p.sentence).toBe("Habló, se interesó y recibió cotización. Falta: compromiso y conversión.");
  });
  it("sin ningún hito no dice «Falta» todo el embudo", () => {
    const p = scoreProgress(profile(0, []));
    expect(p.steps.every((s) => !s.reached)).toBe(true);
    expect(p.sentence).toBe("Aún no ha hablado con el negocio.");
  });
  it("con todos los hitos celebra con sobriedad", () => {
    expect(scoreProgress(profile(100, ["engaged", "interest", "evaluating", "committed", "converted"])).sentence).toBe(
      "Recorrió todo el embudo: ya compró.",
    );
  });
  it("acota el score a 0–100", () => {
    expect(scoreProgress(profile(140, [])).score).toBe(100);
    expect(scoreProgress(profile(-3, [])).score).toBe(0);
  });
});

describe("newContactsSplit", () => {
  it("reparte los nuevos por etapa con su peso", () => {
    const s = newContactsSplit({ new_count: 38, by_stage: { prospect: 21, lead: 11, customer: 6, other: 0 } });
    expect(s.parts.map((p) => [p.count, p.pct])).toEqual([[21, 55], [11, 29], [6, 16]]);
  });
  it("sin nuevos no divide por cero", () => {
    const s = newContactsSplit({ new_count: 0, by_stage: { prospect: 0, lead: 0, customer: 0, other: 0 } });
    expect(s.parts.every((p) => p.pct === 0)).toBe(true);
  });
});

const journey = (over: Partial<NonNullable<ContactJourneyDTO["stage"]>> = {}, cadence: ContactJourneyDTO["cadence"] = null): ContactJourneyDTO => ({
  deal: { id: "d1", title: "Cancún", value_cents: 100, ai_moves_paused: false },
  stage: { name: "Calificado", stage_kind: "qualified", entered_at: "2026-09-16T00:00:00Z", days_in_stage: 9, rotting_days: 7, ...over },
  last_move: null,
  cadence,
  ambiguous: false,
});
const cadence = { attempts_used: 1, max_attempts: 3, next_run_at: "2026-10-01T14:00:00Z", channel: "message" as const, enrollment_id: null };
const owing: NextUpOrder = { id: "o1", order_number: 41, balance_cents: 500_000_00, currency: "COP", payment_state: "partial" };
const label = () => "el jue 1 oct, 9:00 a. m.";

describe("contactNextUp — lo más grave primero", () => {
  it("una oportunidad que se enfría manda, con la cadencia en la frase", () => {
    const next = contactNextUp(journey({}, ), [owing], label);
    expect(next).toMatchObject({ kind: "cooling", title: "Se enfría en Calificado", dealId: "d1" });
    const withCadence = contactNextUp({ ...journey(), cadence }, [], label);
    expect(withCadence.kind === "cooling" && withCadence.detail).toBe(
      "9 días en la etapa y aguanta 7. Axi le escribe el jue 1 oct, 9:00 a. m. (intento 2 de 3).",
    );
  });
  it("un día antes del límite no se enfría: gana el saldo", () => {
    expect(contactNextUp(journey({ days_in_stage: 6 }), [owing], label)).toMatchObject({ kind: "balance", orderId: "o1", detail: "Del pedido #0041." });
  });
  it("sin saldo ni enfriamiento, la próxima insistencia", () => {
    expect(contactNextUp({ ...journey({ days_in_stage: 2 }), cadence }, [], label)).toMatchObject({ kind: "cadence", title: "En Calificado" });
  });
  it("un pedido pagado no cuenta como saldo, y sin nada dice «Todo al día»", () => {
    const paid = { ...owing, payment_state: "paid", balance_cents: 0 };
    expect(contactNextUp(journey({ rotting_days: null }), [paid], label)).toMatchObject({ kind: "clear", title: "Todo al día" });
    expect(contactNextUp(null, [], label).kind).toBe("clear");
  });
});
