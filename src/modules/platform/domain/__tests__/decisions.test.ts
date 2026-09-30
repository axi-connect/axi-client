import {
  formatMs,
  formatUsd,
  groupOptions,
  parseDecisionComparison,
  parseTargetKey,
  routeChanged,
  targetKey,
  targetName,
  type DecisionRouteRow,
} from "../decisions";

const JEV = { provider: "typesafe", model: "jev-1.13.0" };
const MINI = { provider: "openai_compatible", model: "gpt-4o-mini" };
const SAVED: DecisionRouteRow = {
  purpose: "reply_reaction",
  mode: "primary",
  primary: JEV,
  fallback: MINI,
  primary_breaker: { open: false, recent_failures: 0 },
};

describe("claves de par", () => {
  it("ida y vuelta, y una clave rota no inventa un par", () => {
    expect(parseTargetKey(targetKey(JEV))).toEqual(JEV);
    expect(parseTargetKey("typesafe")).toBeNull();
    expect(parseTargetKey("")).toBeNull();
  });
});

describe("routeChanged", () => {
  it("solo cambia si difiere modo, primario o respaldo", () => {
    const same = { mode: SAVED.mode, primary: JEV, fallback: MINI };
    expect(routeChanged(SAVED, same)).toBe(false);
    expect(routeChanged(SAVED, { ...same, mode: "shadow" })).toBe(true);
    expect(routeChanged(SAVED, { ...same, fallback: null })).toBe(true);
    expect(routeChanged({ ...SAVED, fallback: null }, { ...same, fallback: null })).toBe(false);
  });
});

describe("opciones y nombres", () => {
  const options = [
    { ...JEV, display_name: "Jev 1.13 (TypeSafe)" },
    { ...MINI, display_name: "GPT-4o mini" },
    { provider: "openai_compatible", model: "gpt-4.1", display_name: "GPT-4.1" },
  ];
  it("agrupa por proveedor en orden de llegada", () => {
    expect(groupOptions(options).map((g) => [g.provider, g.options.length])).toEqual([
      ["typesafe", 1],
      ["openai_compatible", 2],
    ]);
  });
  it("el nombre sale del catálogo; si no está, el modelo", () => {
    expect(targetName(JEV, options)).toBe("Jev 1.13 (TypeSafe)");
    expect(targetName({ provider: "x", model: "raro-1" }, options)).toBe("raro-1");
  });
});

describe("formatos", () => {
  it("un costo de fracciones de centavo no se muestra como cero", () => {
    expect(formatUsd(0.00042)).not.toContain("0,00 ");
    expect(formatUsd(0.00042)).toContain("0,00042");
    expect(formatUsd(0)).toBe("$ 0,00 USD");
    expect(formatUsd(12.5)).toBe("$ 12,50 USD");
  });
  it("latencia ausente se marca con guion", () => {
    expect(formatMs(null)).toBe("—");
    expect(formatMs(281)).toBe("281 ms");
  });
});

describe("parseDecisionComparison", () => {
  it("lee by_target y parte la clave en el primer «:»", () => {
    const rows = parseDecisionComparison({
      by_target: {
        "typesafe:jev-1.13.0": { items: 40, hits: 37, accuracy: 0.925, errors: 0, p50_ms: 280, p95_ms: 600, cost_usd: 0.0017 },
        "bedrock:anthropic.claude:0": { items: 40, hits: 35, accuracy: 0.875, errors: 1, p50_ms: 900, p95_ms: 1500, cost_usd: 0.02 },
      },
    });
    expect(rows.map((r) => [r.provider, r.model, r.hits])).toEqual([
      ["typesafe", "jev-1.13.0", 37],
      ["bedrock", "anthropic.claude:0", 35],
    ]);
  });
  it("sin comparación o con filas rotas no revienta", () => {
    expect(parseDecisionComparison(null)).toEqual([]);
    expect(parseDecisionComparison({ accuracy: 0.9 })).toEqual([]);
    expect(parseDecisionComparison({ by_target: { "a:b": null, "c:d": { items: "x" } } })).toEqual([
      expect.objectContaining({ key: "c:d", items: 0 }),
    ]);
  });
});
