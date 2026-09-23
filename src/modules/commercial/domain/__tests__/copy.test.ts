import type { GoalSeedDTO } from "../commercial";
import {
  daysLeftPhrase,
  goalLead,
  missingLine,
  paceHeadline,
  projectionLine,
  rateLine,
  salesPerDay,
  seedLine,
  type PaceHeadlineInput,
} from "../copy";

const base: PaceHeadlineInput = {
  status: "behind",
  currency: "COP",
  actual_cents: 1_894_000_000,
  target_cents: 3_000_000_000,
  expected_cents: 2_307_000_000,
  projected_cents: 2_462_000_000,
  sales_actual: 27,
  sales_target: 43,
  days_left: 6,
  days_until_projection: null,
};

describe("paceHeadline", () => {
  it("ritmo bajo: qué falta y cuánto por día, redondeado hacia arriba", () => {
    // 16 ventas en 6 días = 2,67 → «3 ventas al día»
    expect(paceHeadline(base)).toBe("Para llegar faltan $ 11,1 M: 3 ventas al día en los 6 días que quedan.");
    expect(paceHeadline({ ...base, status: "at_risk" })).toBe(paceHeadline(base));
  });

  it("al ritmo: mantener el paso, y «1 venta al día» en singular", () => {
    expect(paceHeadline({ ...base, status: "on_track", sales_actual: 40, days_left: 6 })).toBe(
      "Vas al ritmo. Mantén 1 venta al día y llegas.",
    );
  });

  it("adelantado: la ventaja y el cierre proyectado", () => {
    expect(
      paceHeadline({ ...base, status: "ahead", actual_cents: 2_677_000_000, projected_cents: 3_480_000_000 }),
    ).toBe("Vas $ 3,7 M por delante. Si sigues así cierras en $ 34,8 M.");
  });

  it("cumplida: los días de sobra, sin celebrar de más", () => {
    expect(paceHeadline({ ...base, status: "achieved", days_left: 3 })).toBe(
      "Meta cumplida con 3 días de sobra. Lo que venga ahora es camino extra.",
    );
    expect(paceHeadline({ ...base, status: "achieved", days_left: 1 })).toContain("con 1 día de sobra");
  });

  it("aprendiendo: cuándo habrá proyección", () => {
    expect(paceHeadline({ ...base, status: "insufficient_data", days_until_projection: 5 })).toBe(
      "Estamos aprendiendo tu ritmo. En 5 días tendrás proyección y acciones.",
    );
  });

  it("jamás un porcentaje ni un signo menos", () => {
    const statuses: PaceHeadlineInput["status"][] = ["ahead", "on_track", "at_risk", "behind", "insufficient_data", "achieved"];
    for (const status of statuses) {
      const text = paceHeadline({ ...base, status, actual_cents: 100, sales_actual: 0 });
      expect(text).not.toMatch(/-\d/);
      expect(text).not.toMatch(/−/);
    }
  });
});

describe("salesPerDay / daysLeftPhrase", () => {
  it("pluraliza y redondea hacia arriba", () => {
    expect(salesPerDay(0.2)).toBe("1 venta al día");
    expect(salesPerDay(1)).toBe("1 venta al día");
    expect(salesPerDay(2.01)).toBe("3 ventas al día");
  });

  it("los días que quedan", () => {
    expect(daysLeftPhrase(6)).toBe("en los 6 días que quedan");
    expect(daysLeftPhrase(1)).toBe("en el día que queda");
    expect(daysLeftPhrase(0)).toBe("hoy");
  });
});

describe("missingLine", () => {
  it("camino recorrido y camino que falta, nunca un negativo", () => {
    expect(missingLine(27, 43)).toBe("27 de 43 · faltan 16");
    expect(missingLine(42, 43)).toBe("42 de 43 · falta 1");
    expect(missingLine(45, 43)).toBe("45 de 43 · 2 por delante");
    expect(missingLine(43, 43)).toBe("43 de 43 · completo");
    expect(missingLine(1520, 2100)).toBe("1.520 de 2.100 · faltan 580");
  });
});

describe("projectionLine / rateLine", () => {
  it("cierre proyectado con su porcentaje; null sin proyección", () => {
    expect(projectionLine(2_462_000_000, 3_000_000_000, "COP")).toBe("cierre ≈ $ 24,6 M · 82 %");
    expect(projectionLine(null, 3_000_000_000, "COP")).toBeNull();
  });

  it("el ritmo con su procedencia", () => {
    expect(rateLine(1.35, 1.6, "history")).toBe("Ritmo 1,35 al día · esperado 1,6 · según tu historia");
    expect(rateLine(4, 4.6, "benchmark", "clínicas estéticas")).toBe(
      "Ritmo 4 al día · esperado 4,6 · supuesto para clínicas estéticas",
    );
    expect(rateLine(1, 1, "declared")).toContain("lo dijiste tú");
  });
});

describe("seedLine", () => {
  const seed: GoalSeedDTO = {
    last_month_revenue_cents: 2_210_000_000,
    last_month_sales: 31,
    last_month_avg_ticket_cents: 71_300_000,
    suggested_target_cents: 2_540_000_000,
    source: "history",
    niche_label: "clínicas estéticas",
  };

  it("con historia: lo vendido y la meta sugerida con su subida", () => {
    expect(seedLine(seed, "COP").replace(/ /g, " ")).toBe(
      "El mes pasado vendiste $ 22.100.000. Una meta de $ 25.400.000 (+15 %) es alcanzable con tu ritmo.",
    );
  });

  it("sin historia: lo típico del nicho", () => {
    expect(seedLine({ ...seed, source: "benchmark", last_month_revenue_cents: null }, "COP")).toBe(
      "Aún no tenemos tu historia: te proponemos empezar con lo típico de clínicas estéticas.",
    );
    expect(seedLine({ ...seed, source: "benchmark", niche_label: null }, "COP")).toContain("tu tipo de negocio");
  });
});

describe("goalLead", () => {
  it("quién puso la meta cambia el verbo", () => {
    expect(goalLead(3_000_000_000, "COP", "owner", "2026-09-01").replace(/ /g, " ")).toBe(
      "Meta del mes: $ 30.000.000 · la pusiste tú el 1 sep",
    );
    expect(goalLead(3_000_000_000, "COP", "intake", "2026-09-01")).toContain("la fijaste con Alba el 1 sep");
    expect(goalLead(3_000_000_000, "COP", "system", "2026-09-01")).toContain("la propuso axi el 1 sep");
  });
});
