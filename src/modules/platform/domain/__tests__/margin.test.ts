import {
  bpsToPct,
  cellStatus,
  confidenceLabel,
  formatPct,
  formatUsd,
  summarizeCells,
  usdToCopCents,
  type MarginCell,
} from "../margin";

const cell = (over: Partial<MarginCell>): MarginCell => ({
  plan_code: "esencial",
  plan_id: "p1",
  tier_code: "t500",
  interval: "monthly",
  amount_cents: 18_990_000,
  conversations: 500,
  margin_real_p50: 0.88,
  margin_real_p90: 0.7,
  margin_promo_p50: 0.8,
  status: "ok",
  basis: "measured",
  sample_scope: "global",
  failures: [],
  warnings: [],
  ...over,
});

describe("dominio de la consola de margen", () => {
  it("formatea porcentajes, bps y dólares con la precisión de la magnitud", () => {
    expect(formatPct(0.726)).toBe("72,6 %");
    expect(formatPct(-1)).toBe("—");
    expect(bpsToPct(7_000)).toBe("70 %");
    expect(formatUsd(0.0016)).toBe("$0.0016");
    expect(formatUsd(39.3)).toBe("$39.30");
    expect(usdToCopCents(39.3, 4_200)).toBe(16_506_000);
  });

  it("dice cuando la muestra es baja y calla cuando no", () => {
    expect(confidenceLabel("low", 19)).toBe("muestra baja · 19");
    expect(confidenceLabel("ok", 4_000)).toBeNull();
  });

  it("encuentra la celda por plan, tramo e intervalo y resume la rejilla por el peor estado", () => {
    const cells = [
      cell({}),
      cell({ tier_code: "t25000", status: "bonus_only", margin_real_p50: 0.66 }),
      cell({ plan_code: "escala", status: "loses", margin_real_p50: 0.4, failures: [{ check: "loses_at_p90", detail: "pierde" }] }),
    ];
    expect(cellStatus(cells, "esencial", "t25000", "monthly")?.status).toBe("bonus_only");
    expect(cellStatus(cells, "esencial", "t25000", "annual")).toBeNull();
    expect(cellStatus(undefined, "esencial", "t500", "monthly")).toBeNull();
    expect(summarizeCells(cells)).toEqual({ failing: 1, worst: "loses", minP50: 0.4 });
    expect(summarizeCells([])).toEqual({ failing: 0, worst: "ok", minP50: null });
  });
});
