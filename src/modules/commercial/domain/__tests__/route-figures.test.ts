import { formatMoney } from "@/core/lib/format";
import { pace, learningPace } from "../../ui/__tests__/fixtures";
import { lastBusinessDay, routeFigures, todayMark, weekChart } from "../route-figures";

describe("todayMark y lastBusinessDay", () => {
  it("«Hoy · mié 23» y el último día hábil según el horario, no el último del mes", () => {
    expect(todayMark("2026-09-23")).toBe("Hoy · mié 23");
    expect(lastBusinessDay("2026-09-01", "2026-09-30", [1, 2, 3, 4, 5, 6])).toBe("2026-09-30");
    // Agosto de 2026 acaba en lunes; de martes a sábado, el último hábil es el sábado 29.
    expect(lastBusinessDay("2026-08-01", "2026-08-31", [2, 3, 4, 5, 6])).toBe("2026-08-29");
    expect(lastBusinessDay("2026-08-01", "2026-08-31", [])).toBeNull();
  });
});

describe("routeFigures", () => {
  it("las cuatro cifras de la franja, en la voz de siempre (nunca un negativo)", () => {
    expect(routeFigures(pace)).toEqual([
      { key: "missing", label: "Faltan", value: "16 ventas", detail: "$ 11,1 M" },
      { key: "left", label: "Quedan", value: "6 días hábiles", detail: "hasta el miércoles 30" },
      { key: "expected", label: "A hoy deberías llevar", value: "$ 23,1 M", detail: "$ 4,1 M por debajo" },
      { key: "projection", label: "Si sigues así", value: "≈ $ 24,6 M", detail: "82 % de la meta" },
    ]);
  });

  it("aprendiendo: solo Faltan y Quedan", () => {
    expect(routeFigures(learningPace).map((figure) => figure.key)).toEqual(["missing", "left"]);
  });

  it("en singular, en el último día y por encima de la meta", () => {
    const sales = { ...pace.key_results[0], actual: 44, target: 43 };
    const figures = routeFigures({ ...pace, actual_revenue_cents: 3_050_000_000, business_days_left: 1, key_results: [sales] });
    expect(figures[0]).toEqual({ key: "missing", label: "Por encima de la meta", value: formatMoney(50_000_000, "COP"), detail: "1 venta de más" });
    expect(figures[1].value).toBe("1 día hábil");
    expect(routeFigures({ ...pace, business_days_left: 0 })[1]).toEqual({ key: "left", label: "Quedan", value: "Hoy", detail: "es el último día hábil" });
  });

  it("sin meta ni proyección no inventa la cuarta cifra; justo en lo esperado lo dice", () => {
    const figures = routeFigures({ ...pace, target_revenue_cents: 0, projected_revenue_cents: null, expected_revenue_cents: pace.actual_revenue_cents });
    expect(figures.map((figure) => figure.key)).toEqual(["missing", "left", "expected"]);
    expect(figures[2].detail).toBe("justo donde deberías");
  });
});

describe("weekChart", () => {
  it("una barra por día hábil de la semana: el día es la diferencia de la serie ACUMULADA; los que no llegan, sin cifra", () => {
    const chart = weekChart(pace.series, pace.today, pace.weekdays, pace.period_start, pace.period_end);
    expect(chart?.range).toBe("21 – 26 sep");
    expect(chart?.bars.map((bar) => [bar.letter, bar.sales, bar.today])).toEqual([
      ["L", 2, false],
      ["M", 1, false],
      ["X", 3, true],
      ["J", null, false],
      ["V", null, false],
      ["S", null, false],
    ]);
  });

  it("un día sin punto en la serie vale 0 (el servidor arrastra el acumulado), no el acumulado entero", () => {
    const series = [
      { date: "2026-09-21", sales: 23 },
      { date: "2026-09-23", sales: 25 },
    ];
    const chart = weekChart(series, "2026-09-23", [1, 2, 3, 4, 5, 6], "2026-09-01", "2026-09-30");
    expect(chart?.bars.slice(0, 3).map((bar) => bar.sales)).toEqual([23, 0, 2]);
  });

  it("la semana que empieza el mes no cuenta días del mes anterior, y una que cruza de mes lo dice en el rango", () => {
    const start = weekChart([{ date: "2026-09-01", sales: 2 }], "2026-09-01", [1, 2, 3, 4, 5, 6], "2026-09-01", "2026-09-30");
    expect(start?.bars[0]).toEqual({ date: "2026-09-01", letter: "M", sales: 2, today: true });
    expect(start?.bars).toHaveLength(5);
    const cross = weekChart([], "2026-09-29", [1, 2, 3, 4, 5, 6], "2026-09-01", "2026-10-31");
    expect(cross?.range).toBe("28 sep – 3 oct");
  });

  it("sin días hábiles en la semana no hay gráfica", () => {
    expect(weekChart([], "2026-09-23", [], "2026-09-01", "2026-09-30")).toBeNull();
  });
});
