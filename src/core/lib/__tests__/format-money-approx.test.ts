import { formatMoney, formatMoneyApprox } from "@/core/lib/format";

describe("formatMoneyApprox (F2 Cobros: cotizar antes de confirmar)", () => {
  it("convierte con la tasa efectiva y marca que es aproximado", () => {
    // 2 cupos × US$ 3.500 a TRM 3.100,45
    expect(formatMoneyApprox(700_000, "USD", { currency: "COP", rate: 3100.45 })).toBe(
      `≈ ${formatMoney(2_170_315_000, "COP")}`,
    );
  });

  it("sin tasa no inventa nada: el llamador calla", () => {
    expect(formatMoneyApprox(700_000, "USD", { currency: "COP", rate: null })).toBeNull();
    expect(formatMoneyApprox(700_000, "USD", { currency: "COP", rate: undefined })).toBeNull();
    expect(formatMoneyApprox(700_000, "USD", { currency: "COP", rate: 0 })).toBeNull();
    expect(formatMoneyApprox(700_000, "USD", { currency: "COP", rate: Number.NaN })).toBeNull();
  });

  it("misma moneda: es el importe real, sin el «≈» que sugeriría una conversión", () => {
    const same = formatMoneyApprox(4_500_000, "COP", { currency: "COP", rate: 1 });
    expect(same).toBe(formatMoney(4_500_000, "COP"));
    expect(same).not.toContain("≈");
  });

  it("un importe no finito no rompe la vista", () => {
    expect(formatMoneyApprox(Number.NaN, "USD", { currency: "COP", rate: 3100 })).toBeNull();
  });
});
