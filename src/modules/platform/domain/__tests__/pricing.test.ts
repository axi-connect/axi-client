import { groupByProvider, groupUnit, isCurrentRate, unitLabel, type PricingRate } from "../pricing";

const NOW = "2026-07-17T12:00:00Z";

const rate = (over: Partial<PricingRate>): PricingRate => ({
  id: "r-x",
  provider: "anthropic",
  unit: "tokens",
  model: "claude-sonnet-5",
  display_name: "Claude Sonnet 4.5",
  is_default: false,
  input_cost_per_mtok_usd: 3,
  output_cost_per_mtok_usd: 15,
  cache_read_per_mtok_usd: 0.3,
  margin_multiplier: 1.3,
  effective_from: "2026-07-01T00:00:00Z",
  effective_to: null,
  ...over,
});

describe("isCurrentRate", () => {
  it("effective_to null → vigente", () => {
    expect(isCurrentRate(rate({}), NOW)).toBe(true);
  });
  it("effective_to futura → vigente; pasada → expirada", () => {
    expect(isCurrentRate(rate({ effective_to: "2026-12-31T00:00:00Z" }), NOW)).toBe(true);
    expect(isCurrentRate(rate({ effective_to: "2026-06-30T00:00:00Z" }), NOW)).toBe(false);
  });
});

describe("groupByProvider", () => {
  it("agrupa por proveedor y ordena: vigentes (fallback al final), luego expiradas recientes", () => {
    const rates = [
      rate({ id: "r-1", model: "claude-sonnet-4", effective_to: "2026-06-30T00:00:00Z" }),
      rate({ id: "r-2", model: "*" }),
      rate({ id: "r-3", model: "claude-sonnet-5" }),
      rate({ id: "r-4", provider: "openai_compatible", model: "gpt-5-mini" }),
      rate({ id: "r-5", model: "claude-haiku-4", effective_to: "2026-01-31T00:00:00Z" }),
      // Voz (F3): sin la entrada en PROVIDERS este grupo se descartaría
      rate({ id: "r-6", provider: "elevenlabs", unit: "characters", model: "eleven_flash_v2_5" }),
    ];

    const groups = groupByProvider(rates, NOW);

    expect(groups.map((g) => g.provider)).toEqual([
      "anthropic",
      "openai_compatible",
      "elevenlabs",
    ]);
    expect(groups[0].rates.map((r) => r.id)).toEqual(["r-3", "r-2", "r-1", "r-5"]);
    expect(groups[1].rates.map((r) => r.id)).toEqual(["r-4"]);
    expect(groups[2].rates.map((r) => r.id)).toEqual(["r-6"]);
  });

  it("omite proveedores sin tarifas", () => {
    expect(groupByProvider([rate({})], NOW)).toHaveLength(1);
  });
});

describe("unidad de la tarifa (F3 voz)", () => {
  it("groupUnit afirma la unidad solo si todo el grupo coincide", () => {
    expect(groupUnit([rate({ unit: "characters" }), rate({ unit: "characters" })])).toBe("characters");
    expect(groupUnit([rate({ unit: "tokens" }), rate({ unit: "characters" })])).toBeNull();
    expect(groupUnit([])).toBeNull();
  });

  it("unitLabel traduce la unidad para la tabla y el form", () => {
    expect(unitLabel("tokens")).toBe("MTok");
    expect(unitLabel("characters")).toBe("M caracteres");
  });
});
