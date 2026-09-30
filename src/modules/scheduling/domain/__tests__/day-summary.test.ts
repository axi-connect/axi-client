import type { AppointmentDTO } from "../appointment";
import { dayHeadingSummary, nextUpcoming, todaySentence } from "../day-summary";

function appt(id: string, startsAt: string, status: AppointmentDTO["status"]): AppointmentDTO {
  return {
    id,
    contact_id: `c-${id}`,
    product_id: null,
    assigned_user_id: null,
    starts_at: startsAt,
    ends_at: startsAt,
    status,
    notes: null,
    created_by_type: "user",
    created_by_user_id: null,
    conversation_id: null,
    call_session_id: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: "2026-09-29T00:00:00.000Z",
    updated_at: "2026-09-29T00:00:00.000Z",
  };
}

const DAY = [
  appt("a", "2026-09-30T14:00:00.000Z", "completed"),
  appt("b", "2026-09-30T16:00:00.000Z", "confirmed"),
  appt("c", "2026-09-30T16:00:00.000Z", "scheduled"),
  appt("d", "2026-09-30T19:00:00.000Z", "scheduled"),
  appt("x", "2026-09-30T15:00:00.000Z", "cancelled"),
];

describe("dayHeadingSummary", () => {
  it("cuenta sin canceladas y dice cuántas faltan por confirmar", () => {
    expect(dayHeadingSummary(DAY)).toBe("4 citas · 2 por confirmar");
    expect(dayHeadingSummary(DAY.filter((a) => a.status !== "scheduled"))).toBe("2 citas");
    expect(dayHeadingSummary([appt("x", "2026-09-30T15:00:00.000Z", "cancelled")])).toBe("Sin citas");
  });
});

describe("nextUpcoming", () => {
  it("la siguiente activa que aún no empieza; ignora canceladas y atendidas", () => {
    const now = new Date("2026-09-30T15:40:00.000Z");
    expect(nextUpcoming(DAY, now)?.id).toBe("b");
    expect(nextUpcoming(DAY, new Date("2026-09-30T19:30:00.000Z"))).toBeNull();
  });
});

describe("todaySentence (la voz del progreso)", () => {
  it("cifra + lo que sigue", () => {
    const s = todaySentence(DAY, { appointment: DAY[1], contactName: "Camila Restrepo", time: "11:00" });
    expect(s.lead).toBe("Hoy tienes 4 citas; 2 esperan confirmación.");
    expect(s.next).toEqual({ time: "11:00", name: "Camila Restrepo" });
  });

  it("singular, nada por confirmar y sin próxima", () => {
    const one = [appt("b", "2026-09-30T16:00:00.000Z", "confirmed")];
    expect(todaySentence(one, null).lead).toBe("Hoy tienes 1 cita. Ya no quedan más por hoy.");
    const pending = [appt("c", "2026-09-30T16:00:00.000Z", "scheduled")];
    expect(todaySentence(pending, null).lead).toBe("Hoy tienes 1 cita; 1 espera confirmación. Ya no quedan más por hoy.");
  });

  it("día sin citas", () => {
    expect(todaySentence([], null)).toEqual({ lead: "Hoy no tienes citas.", next: null });
  });
});
