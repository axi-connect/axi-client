import { businessDaysBetween, groupSeriesByWeek, parseLocalDate, weekOf, weekTicks } from "../weeks";

describe("parseLocalDate", () => {
  it("no corre el día por la zona horaria", () => {
    const d = parseLocalDate("2026-09-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 1]);
  });
});

describe("businessDaysBetween", () => {
  it("cuenta lunes a sábado, ambos extremos incluidos", () => {
    expect(businessDaysBetween("2026-09-01", "2026-09-30")).toBe(26);
    expect(businessDaysBetween("2026-09-06", "2026-09-06")).toBe(0); // domingo
  });
});

describe("weekTicks", () => {
  it("septiembre 2026 (arranca en martes): S1 5 · S2 6 · S3 6 · S4 6 · S5 3", () => {
    const ticks = weekTicks("2026-09-01", "2026-09-30");
    expect(ticks.map((t) => t.label)).toEqual(["S1", "S2", "S3", "S4", "S5"]);
    expect(ticks.map((t) => t.days)).toEqual([5, 6, 6, 6, 3]);
    expect(ticks[0].start_pct).toBe(0);
    expect(ticks[4].end_pct).toBe(100);
    expect(ticks[1].start_pct).toBeCloseTo((5 / 26) * 100, 5);
  });

  it("un mes de 28 días que arranca en domingo tiene 4 semanas de 6", () => {
    const ticks = weekTicks("2027-02-01", "2027-02-28"); // lunes 1 → domingo 28
    expect(ticks.map((t) => t.days)).toEqual([6, 6, 6, 6]);
  });

  it("un mes de 31 días que arranca en sábado: la primera semana es de 1 día", () => {
    const ticks = weekTicks("2026-08-01", "2026-08-31"); // sábado 1
    expect(ticks[0].days).toBe(1);
    expect(ticks.reduce((acc, t) => acc + t.days, 0)).toBe(businessDaysBetween("2026-08-01", "2026-08-31"));
  });

  it("un mes de 30 días con cierre en lunes: la última semana es de 1 día", () => {
    const ticks = weekTicks("2026-11-01", "2026-11-30"); // domingo 1 → lunes 30
    expect(ticks[ticks.length - 1].days).toBe(1);
    expect(ticks.reduce((acc, t) => acc + t.days, 0)).toBe(25);
  });
});

describe("groupSeriesByWeek", () => {
  const pts = ["2026-09-01", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-23"].map((date) => ({ date, sales: 1 }));

  it("agrupa de lunes a domingo, en orden, aunque la serie llegue desordenada", () => {
    const weeks = groupSeriesByWeek([...pts].reverse());
    expect(weeks.map((w) => w.points.length)).toEqual([3, 1, 1]);
    expect(weeks[0].start).toBe("2026-08-31");
    expect(weeks[0].end).toBe("2026-09-06");
    expect(weeks[1].start).toBe("2026-09-07");
  });

  it("weekOf encuentra la semana de hoy o null", () => {
    const weeks = groupSeriesByWeek(pts);
    expect(weekOf(weeks, "2026-09-23")?.start).toBe("2026-09-21");
    expect(weekOf(weeks, "2026-09-15")).toBeNull();
  });
});
