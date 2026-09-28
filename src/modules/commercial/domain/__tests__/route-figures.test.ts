import { pace } from "../../ui/__tests__/fixtures";
import { lastBusinessDay, weekChart, weekdaySpan } from "../route-figures";

describe("lastBusinessDay", () => {
  it("el último día hábil según el horario, no el último del mes", () => {
    expect(lastBusinessDay("2026-09-01", "2026-09-30", [1, 2, 3, 4, 5, 6])).toBe("2026-09-30");
    // Agosto de 2026 acaba en lunes; de martes a sábado, el último hábil es el sábado 29.
    expect(lastBusinessDay("2026-08-01", "2026-08-31", [2, 3, 4, 5, 6])).toBe("2026-08-29");
    expect(lastBusinessDay("2026-08-01", "2026-08-31", [])).toBeNull();
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

describe("weekdaySpan", () => {
  it("dice los días hábiles en palabras", () => {
    expect(weekdaySpan([1, 2, 3, 4, 5, 6])).toBe("de lunes a sábado");
    expect(weekdaySpan([1, 2, 3, 4, 5])).toBe("de lunes a viernes");
    expect(weekdaySpan([1, 3, 5])).toBe("lunes, miércoles y viernes");
    expect(weekdaySpan([2, 3, 4, 5, 6, 0])).toBe("de martes a domingo");
    expect(weekdaySpan([0, 1, 2, 3, 4, 5, 6])).toBe("todos los días");
    expect(weekdaySpan([6])).toBe("solo los sábados");
    expect(weekdaySpan([1])).toBe("solo los lunes");
    expect(weekdaySpan([])).toBeNull();
  });
});
