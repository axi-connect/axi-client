import {
  buildDayStates,
  invalidScheduleDays,
  toScheduleInputs,
} from "@/modules/companies/domain/schedules";

describe("horario: helpers puros", () => {
  it("buildDayStates: 7 filas, encendidas solo las que tienen horario guardado", () => {
    const days = buildDayStates([{ weekday: 1, opens_at: "09:00", closes_at: "19:00" }]);
    expect(days).toHaveLength(7);
    expect(days[1]).toEqual({ weekday: 1, enabled: true, opens_at: "09:00", closes_at: "19:00" });
    expect(days[0]).toMatchObject({ weekday: 0, enabled: false, opens_at: "08:00", closes_at: "18:00" });
  });

  it("toScheduleInputs: solo los días encendidos (el backend reemplaza el set completo)", () => {
    const days = buildDayStates([{ weekday: 6, opens_at: "10:00", closes_at: "14:00" }]);
    expect(toScheduleInputs(days)).toEqual([{ weekday: 6, opens_at: "10:00", closes_at: "14:00" }]);
  });

  it("invalidScheduleDays: nombra los días con cierre no posterior a la apertura", () => {
    const days = buildDayStates([
      { weekday: 1, opens_at: "18:00", closes_at: "08:00" },
      { weekday: 2, opens_at: "08:00", closes_at: "08:00" },
      { weekday: 3, opens_at: "08:00", closes_at: "18:00" },
    ]);
    expect(invalidScheduleDays(days)).toEqual(["Lunes", "Martes"]);
  });
});
