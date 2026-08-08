import { rangeCovers, rangeForView, stepAnchor } from "../calendar-range";

const BOGOTA = "America/Bogota";
const LIST = { from: "2026-08-08", to: "2026-09-07" };

describe("calendar-range", () => {
  it("mes → 42 días con rango UTC de la zona del negocio", () => {
    const range = rangeForView("month", "2026-08-01", BOGOTA, LIST);
    expect(range.days).toHaveLength(42);
    expect(range.days[0]).toBe("2026-07-27");
    // Medianoche de Bogotá = 05:00Z.
    expect(range.fromUtc).toBe("2026-07-27T05:00:00.000Z");
    expect(range.toUtc).toBe("2026-09-07T04:59:59.999Z");
  });

  it("semana → lunes a domingo; día → un solo día", () => {
    const week = rangeForView("week", "2026-08-08", BOGOTA, LIST);
    expect(week.days[0]).toBe("2026-08-03");
    expect(week.days[6]).toBe("2026-08-09");

    const day = rangeForView("day", "2026-08-08", BOGOTA, LIST);
    expect(day.days).toEqual(["2026-08-08"]);
    expect(day.fromUtc).toBe("2026-08-08T05:00:00.000Z");
    expect(day.toUtc).toBe("2026-08-09T04:59:59.999Z");
  });

  it("lista → clampa a 92 días (el límite del backend)", () => {
    const range = rangeForView(
      "list",
      "2026-08-08",
      BOGOTA,
      { from: "2026-08-01", to: "2027-08-01" },
    );
    expect(range.days).toHaveLength(92);
    expect(range.days[0]).toBe("2026-08-01");
  });

  it("rangeCovers: el mes cubre la semana y el día del mismo periodo", () => {
    const month = rangeForView("month", "2026-08-01", BOGOTA, LIST);
    const week = rangeForView("week", "2026-08-08", BOGOTA, LIST);
    const day = rangeForView("day", "2026-08-08", BOGOTA, LIST);
    expect(rangeCovers(month, week)).toBe(true);
    expect(rangeCovers(month, day)).toBe(true);
    expect(rangeCovers(week, month)).toBe(false);
  });

  it("stepAnchor navega según la vista (lista no navega)", () => {
    expect(stepAnchor("month", "2026-08-15", 1)).toBe("2026-09-01");
    expect(stepAnchor("week", "2026-08-08", -1)).toBe("2026-08-01");
    expect(stepAnchor("day", "2026-08-08", 1)).toBe("2026-08-09");
    expect(stepAnchor("list", "2026-08-08", 1)).toBe("2026-08-08");
  });
});
