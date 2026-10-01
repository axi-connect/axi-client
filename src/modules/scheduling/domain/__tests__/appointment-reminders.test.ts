import type { ReminderDTO } from "../reminder";
import { appointmentReminderRows, leadLabel } from "../appointment-reminders";

const START = "2026-09-30T16:00:00.000Z";

function reminder(overrides: Partial<ReminderDTO>): ReminderDTO {
  return {
    id: "r1",
    contact_id: "c1",
    appointment_id: "a1",
    channel_id: "ch1",
    message: "Te esperamos",
    schedule_rrule: null,
    timezone: "America/Bogota",
    next_run_at: null,
    last_run_at: null,
    is_active: true,
    created_at: "2026-09-29T00:00:00.000Z",
    updated_at: "2026-09-29T00:00:00.000Z",
    ...overrides,
  };
}

describe("leadLabel", () => {
  it("días, horas y minutos antes, en singular y plural", () => {
    expect(leadLabel("2026-09-29T16:00:00.000Z", START)).toBe("1 día antes");
    expect(leadLabel("2026-09-30T14:00:00.000Z", START)).toBe("2 horas antes");
    expect(leadLabel("2026-09-30T15:00:00.000Z", START)).toBe("1 hora antes");
    expect(leadLabel("2026-09-30T15:30:00.000Z", START)).toBe("30 minutos antes");
    expect(leadLabel(START, START)).toBe("a la hora de la cita");
  });

  it("lo que no es exacto se redondea a la unidad que se lee", () => {
    // 1185 min antes → 20 horas (no «1185 minutos»)
    expect(leadLabel("2026-09-29T20:15:00.000Z", START)).toBe("20 horas antes");
    // 90 min se dice exacto, no «2 horas»
    expect(leadLabel("2026-09-30T14:30:00.000Z", START)).toBe("90 minutos antes");
    // 2 días y 3 horas → 2 días
    expect(leadLabel("2026-09-28T13:00:00.000Z", START)).toBe("2 días antes");
  });
});

describe("appointmentReminderRows", () => {
  it("solo los de ESTA cita, en orden, con su estado honesto", () => {
    const rows = appointmentReminderRows(
      [
        reminder({ id: "later", next_run_at: "2026-09-30T15:30:00.000Z" }),
        reminder({ id: "sent", is_active: false, last_run_at: "2026-09-30T14:00:00.000Z" }),
        reminder({ id: "otra", appointment_id: "a2", next_run_at: "2026-09-30T15:00:00.000Z" }),
        reminder({ id: "suelto", appointment_id: null, next_run_at: "2026-09-30T15:00:00.000Z" }),
      ],
      { id: "a1", starts_at: START },
    );
    expect(rows.map((r) => [r.id, r.state, r.lead])).toEqual([
      ["sent", "sent", "2 horas antes"],
      ["later", "scheduled", "30 minutos antes"],
    ]);
  });

  it("apagado (la cita se canceló): se ve apagado, no programado ni enviado", () => {
    const rows = appointmentReminderRows(
      [reminder({ is_active: false, next_run_at: "2026-09-30T15:30:00.000Z" })],
      { id: "a1", starts_at: START },
    );
    expect(rows[0].state).toBe("off");
  });

  it("sin fecha de envío no hay fila que mostrar", () => {
    expect(appointmentReminderRows([reminder({})], { id: "a1", starts_at: START })).toEqual([]);
  });
});
