import { groupSeriesByWeek, isBusinessDay, weekOf, weekProgress, weekTicks } from "../weeks";

const MON_SAT = [1, 2, 3, 4, 5, 6];

describe("isBusinessDay", () => {
  it("lo hábil lo dice el servidor, no el cliente", () => {
    expect(isBusinessDay("2026-09-06", MON_SAT)).toBe(false); // domingo
    expect(isBusinessDay("2026-09-05", MON_SAT)).toBe(true); // sábado
    expect(isBusinessDay("2026-09-05", [1, 2, 3, 4, 5])).toBe(false);
  });
});

describe("weekTicks", () => {
  it("septiembre 2026 (arranca en martes): S1 5 · S2 6 · S3 6 · S4 6 · S5 3", () => {
    const ticks = weekTicks("2026-09-01", "2026-09-30", MON_SAT);
    expect(ticks.map((t) => t.label)).toEqual(["S1", "S2", "S3", "S4", "S5"]);
    expect(ticks.map((t) => t.days)).toEqual([5, 6, 6, 6, 3]);
    expect(ticks[0].start_pct).toBe(0);
    expect(ticks[4].end_pct).toBe(100);
    expect(ticks[1].start_pct).toBeCloseTo((5 / 26) * 100, 5);
  });

  it("un mes de 28 días que arranca en lunes tiene 4 semanas de 6", () => {
    expect(weekTicks("2027-02-01", "2027-02-28", MON_SAT).map((t) => t.days)).toEqual([6, 6, 6, 6]);
  });

  it("31 días que arrancan en sábado: la primera semana es de 1 día; 30 con cierre en lunes: la última de 1", () => {
    expect(weekTicks("2026-08-01", "2026-08-31", MON_SAT)[0].days).toBe(1);
    const nov = weekTicks("2026-11-01", "2026-11-30", MON_SAT);
    expect(nov[nov.length - 1].days).toBe(1);
    expect(nov.reduce((acc, t) => acc + t.days, 0)).toBe(25);
  });

  it("con lunes a viernes cambian los días, no las semanas", () => {
    expect(weekTicks("2026-09-01", "2026-09-30", [1, 2, 3, 4, 5]).map((t) => t.days)).toEqual([4, 5, 5, 5, 3]);
  });
});

describe("groupSeriesByWeek / weekOf", () => {
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

describe("weekProgress (serie ACUMULADA)", () => {
  const series = [
    { date: "2026-09-18", sales: 20, expected_sales: 24 }, // viernes de la semana anterior
    { date: "2026-09-19", sales: 21, expected_sales: 25 }, // sábado
    { date: "2026-09-21", sales: 23, expected_sales: 27 }, // lunes
    { date: "2026-09-22", sales: 24, expected_sales: 29 },
    { date: "2026-09-23", sales: 27, expected_sales: 31 }, // hoy, miércoles
    { date: "2026-09-24", sales: 30, expected_sales: 33 }, // mañana (proyectado): no cuenta
  ];

  it("la semana es la diferencia contra el último punto antes del lunes, no la suma de puntos", () => {
    expect(weekProgress(series, "2026-09-23", MON_SAT)).toEqual({ sales: 6, expected_sales: 6, business_days: 3 });
  });

  it("si el mes empezó esta semana, la base es cero", () => {
    expect(weekProgress(series.slice(2), "2026-09-23", MON_SAT)).toEqual({ sales: 27, expected_sales: 31, business_days: 3 });
  });

  it("sin puntos de la semana no hay ritmo", () => {
    expect(weekProgress(series.slice(0, 2), "2026-09-23", MON_SAT)).toBeNull();
  });

  it("los días hábiles transcurridos respetan el calendario del tenant", () => {
    expect(weekProgress(series, "2026-09-23", [1, 3, 5])?.business_days).toBe(2);
  });
});
