import { estimateLabel, formatMoney, hasEstimate } from "../money";

describe("estimateLabel", () => {
  it("null NO es cero: dice que no hay dato en vez de prometer una factura gratis", () => {
    expect(estimateLabel(null)).toBe("Sin estimación disponible");
    expect(estimateLabel(null)).not.toContain("0");
  });

  it("cero SÍ es un dato y se pinta como importe", () => {
    expect(estimateLabel(0)).toBe(formatMoney(0));
  });

  it("formatea en pesos, sin decimales", () => {
    expect(estimateLabel(108_600_000)).toBe(formatMoney(108_600_000));
    expect(estimateLabel(108_600_000)).not.toContain(",00");
  });
});

describe("hasEstimate", () => {
  it("distingue la ausencia de dato del importe cero", () => {
    expect(hasEstimate(null)).toBe(false);
    expect(hasEstimate(0)).toBe(true);
  });
});
