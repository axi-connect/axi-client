import { isKeyResultDetailKey, keyResultHref, projectedCount, salesTrend } from "../key-result";
import { pace } from "../../ui/__tests__/fixtures";

describe("key-result", () => {
  it("la tendencia es ACUMULADA y lo real se corta en hoy", () => {
    const series = [
      ...pace.series,
      { date: "2026-09-24", revenue_cents: 1_894_000_000, expected_revenue_cents: 2_400_000_000, sales: 27, expected_sales: 35 },
    ];
    const points = salesTrend(series, pace.today);
    // No se suma: el servidor ya manda el acumulado.
    expect(points.find((point) => point.date === "2026-09-23")).toEqual({ date: "2026-09-23", real: 27, expected: 33 });
    // El día que no ha pasado no arrastra la meseta.
    expect(points.at(-1)).toEqual({ date: "2026-09-24", real: null, expected: 35 });
  });

  it("proyección lineal y claves válidas", () => {
    expect(projectedCount(27, 20, 26)).toBe(35);
    expect(projectedCount(3, 0, 26)).toBeNull();
    expect(isKeyResultDetailKey("sales")).toBe(true);
    expect(isKeyResultDetailKey("avg_ticket")).toBe(true);
    expect(isKeyResultDetailKey("ticket")).toBe(false);
    expect(keyResultHref("calls")).toBe("/comercial/resultados/calls");
  });
});
