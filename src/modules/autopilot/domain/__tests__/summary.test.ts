import { barWidth, demosDelta, formatCredits, monthName, previousMonthName } from "../summary";

describe("ficha de los pilotos — reglas", () => {
  it("el mes y el anterior, también en enero", () => {
    expect(monthName("2026-09")).toBe("septiembre");
    expect(previousMonthName("2026-09")).toBe("agosto");
    expect(previousMonthName("2027-01")).toBe("diciembre");
  });

  it("el cambio de demos solo se dice si lo hay, con su signo", () => {
    expect(demosDelta(4, 2, "2026-09")).toBe("+2 vs. agosto");
    expect(demosDelta(1, 3, "2026-09")).toBe("−2 vs. agosto");
    expect(demosDelta(2, 2, "2026-09")).toBeNull();
  });

  it("las barras se miden contra la primera etapa y nunca desaparecen", () => {
    expect(barWidth(212, 212)).toBe(100);
    expect(barWidth(4, 212)).toBe(4);
    expect(barWidth(64, 212)).toBe(30);
    expect(barWidth(0, 0)).toBe(4);
  });

  it("créditos con miles de Colombia", () => {
    expect(formatCredits(12500)).toBe("12.500");
  });
});
