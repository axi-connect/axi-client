import { bulkOpeningCost, formatUsd } from "../template-cost";

describe("template-cost — cuánto puede costar abrir con una plantilla de Meta", () => {
  it("una utility cuesta la tarifa de utility", () => {
    expect(bulkOpeningCost(268, "utility")).toEqual({
      unit_usd: 0.0008,
      total_usd: 268 * 0.0008,
      category: "utility",
    });
  });

  it("una plantilla de MARKETING cuesta 25× — la cifra cambia de orden de magnitud", () => {
    // El bug que esto fija: el modal multiplicaba por 0,0008 a pelo, así que un
    // lote de 268 con plantilla de marketing se anunciaba como US$0,21 cuando
    // de verdad son US$5,36. Una cifra concreta y equivocada es peor que
    // ninguna, porque el operador decide con ella.
    const cost = bulkOpeningCost(268, "marketing");
    expect(cost.unit_usd).toBe(0.02);
    expect(cost.total_usd).toBeCloseTo(5.36, 2);
    expect(cost.total_usd / bulkOpeningCost(268, "utility").total_usd).toBeCloseTo(25, 0);
  });

  it("sin nadie a quien escribir, no cuesta nada", () => {
    expect(bulkOpeningCost(0, "marketing").total_usd).toBe(0);
    expect(bulkOpeningCost(-3, "utility").total_usd).toBe(0);
  });

  it("la tarifa se lee con cuatro decimales y el total con dos", () => {
    expect(formatUsd(0.0008, 4)).toBe("US$0,0008");
    expect(formatUsd(5.36)).toBe("US$5,36");
  });
});
