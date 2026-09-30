import { firstAvailableDay, monthQueryRange, slotsByDay } from "../month-availability";

const BOGOTA = "America/Bogota";

describe("monthQueryRange", () => {
  it("el mes completo si todo está por venir", () => {
    expect(monthQueryRange("2026-10-15", "2026-09-30")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("desde hoy en el mes en curso (el backend no ofrece días pasados)", () => {
    expect(monthQueryRange("2026-09-02", "2026-09-30")).toEqual({ from: "2026-09-30", to: "2026-09-30" });
  });

  it("un mes ya pasado no se consulta", () => {
    expect(monthQueryRange("2026-08-10", "2026-09-30")).toBeNull();
  });
});

describe("slotsByDay / firstAvailableDay", () => {
  const availability = {
    timezone: BOGOTA,
    duration_minutes: 45,
    schedule_configured: true,
    slots: [
      // 1 oct 9:00 Bogotá, con cupo
      { starts_at: "2026-10-01T14:00:00.000Z", ends_at: "2026-10-01T14:45:00.000Z", remaining_capacity: 1 },
      // 2 oct 23:30 Bogotá = 3 oct 04:30 UTC: pertenece al 2 en la zona del negocio
      { starts_at: "2026-10-03T04:30:00.000Z", ends_at: "2026-10-03T05:15:00.000Z", remaining_capacity: 2 },
      // sin cupo: no cuenta
      { starts_at: "2026-10-05T14:00:00.000Z", ends_at: "2026-10-05T14:45:00.000Z", remaining_capacity: 0 },
    ],
  };

  it("agrupa por día del negocio y descarta los sin cupo", () => {
    const byDay = slotsByDay(availability, BOGOTA);
    expect([...byDay.keys()]).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("el primer día con horarios desde una fecha; null si no hay", () => {
    const byDay = slotsByDay(availability, BOGOTA);
    expect(firstAvailableDay(byDay, "2026-09-30")).toBe("2026-10-01");
    expect(firstAvailableDay(byDay, "2026-10-02")).toBe("2026-10-02");
    expect(firstAvailableDay(byDay, "2026-10-03")).toBeNull();
  });
});
