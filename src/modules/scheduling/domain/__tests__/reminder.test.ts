import { isAutomaticReminder, reminderState } from "../reminder";

describe("reminderState (estado derivado del listado)", () => {
  it("activo mientras is_active", () => {
    expect(
      reminderState({ is_active: true, last_run_at: null, schedule_rrule: null }),
    ).toBe("active");
    expect(
      reminderState({ is_active: true, last_run_at: "2026-08-01T00:00:00Z", schedule_rrule: "FREQ=DAILY;BYHOUR=9;BYMINUTE=0" }),
    ).toBe("active");
  });

  it("one-shot inactivo que ya corrió = ENVIADO, no apagado", () => {
    expect(
      reminderState({ is_active: false, last_run_at: "2026-08-04T14:00:00Z", schedule_rrule: null }),
    ).toBe("sent");
  });

  it("inactivo sin ejecutar (o recurrente pausado) = apagado", () => {
    expect(
      reminderState({ is_active: false, last_run_at: null, schedule_rrule: null }),
    ).toBe("off");
    expect(
      reminderState({
        is_active: false,
        last_run_at: "2026-08-04T14:00:00Z",
        schedule_rrule: "FREQ=DAILY;BYHOUR=9;BYMINUTE=0",
      }),
    ).toBe("off");
  });
});

describe("isAutomaticReminder", () => {
  it("automático cuando referencia una cita", () => {
    expect(isAutomaticReminder({ appointment_id: "appt-1" })).toBe(true);
    expect(isAutomaticReminder({ appointment_id: null })).toBe(false);
  });
});
