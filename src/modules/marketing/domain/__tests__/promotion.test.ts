import { formatMoney } from "@/core/lib/format";
import type { PromotionDTO } from "../promotion";
import {
  describePromotionKind,
  matchesPromotionStateFilter,
  PROMOTION_STATE_FILTER_LABELS,
  isPromotionLive,
  promotionState,
  PROMOTION_KIND_PARAM,
  redemptionProgressPct,
  unredeemedCoupons,
} from "../promotion";
import { PROMOTION_KIND_ORDER } from "../enums";

const NOW = new Date("2026-08-06T12:00:00.000Z");

function promo(over: Partial<PromotionDTO> = {}): PromotionDTO {
  return {
    id: "p1",
    name: "Vuelve y ahorra",
    kind: "percent_discount",
    percent: 25,
    amount_cents: null,
    gift_variant_id: null,
    shipping_value_cents: null,
    min_order_cents: 5_000_000,
    shared_code: "VUELVE10",
    validity_hours: 6,
    starts_at: "2026-08-01T00:00:00.000Z",
    ends_at: null,
    max_redemptions_total: 50,
    max_redemptions_per_contact: 1,
    redemptions_count: 31,
    coupons_issued: 118,
    redemptions_recorded: 31,
    enabled: true,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...over,
  } as PromotionDTO;
}

describe("PROMOTION_KIND_PARAM", () => {
  it("declara exactamente un parámetro por tipo", () => {
    // El backend rechaza con 422 si sobra cualquier otro (promotion_invalid_params).
    for (const kind of PROMOTION_KIND_ORDER) {
      expect(PROMOTION_KIND_PARAM[kind]).toBeDefined();
    }
    expect(new Set(Object.values(PROMOTION_KIND_PARAM)).size).toBe(PROMOTION_KIND_ORDER.length);
  });
});

describe("describePromotionKind", () => {
  it("describe cada tipo con su parámetro", () => {
    expect(describePromotionKind(promo())).toBe("25% de descuento");
    // `formatMoney` usa Intl es-CO, que separa el símbolo con un espacio DURO:
    // componer el esperado con el propio formateador evita un test frágil.
    expect(
      describePromotionKind(
        promo({ kind: "fixed_discount", percent: null, amount_cents: 1_500_000 }),
      ),
    ).toBe(`${formatMoney(1_500_000)} de descuento`);
    expect(
      describePromotionKind(
        promo({ kind: "free_shipping", percent: null, shipping_value_cents: 1_200_000 }),
      ),
    ).toBe(`Envío gratis · descuenta ${formatMoney(1_200_000)} de flete`);
  });

  it("formatea los centavos como pesos, no como enteros crudos", () => {
    const text = describePromotionKind(
      promo({ kind: "fixed_discount", percent: null, amount_cents: 1_500_000 }),
    );
    expect(text).toContain("15.000");
    expect(text).not.toContain("1500000");
  });

  it("cae a la etiqueta del tipo si falta el parámetro, sin romperse", () => {
    expect(describePromotionKind(promo({ percent: null }))).toBe("% de descuento");
  });
});

describe("estado derivado", () => {
  it("está viva cuando está encendida, vigente y con cupo", () => {
    expect(isPromotionLive(promo(), NOW)).toBe(true);
    expect(promotionState(promo(), NOW)).toBe("live");
  });

  it("apagada gana sobre cualquier otra condición", () => {
    expect(promotionState(promo({ enabled: false }), NOW)).toBe("off");
    expect(isPromotionLive(promo({ enabled: false }), NOW)).toBe(false);
  });

  it("agotada al alcanzar el tope global", () => {
    const p = promo({ redemptions_count: 50 });
    expect(promotionState(p, NOW)).toBe("exhausted");
    expect(isPromotionLive(p, NOW)).toBe(false);
  });

  it("sin tope global nunca se agota", () => {
    expect(promotionState(promo({ max_redemptions_total: null }), NOW)).toBe("live");
  });

  it("vencida cuando pasó su fecha de fin", () => {
    const p = promo({ ends_at: "2026-07-31T00:00:00.000Z" });
    expect(promotionState(p, NOW)).toBe("expired");
    expect(isPromotionLive(p, NOW)).toBe(false);
  });

  it("programada mientras no empieza", () => {
    const p = promo({ starts_at: "2026-09-01T00:00:00.000Z" });
    expect(promotionState(p, NOW)).toBe("scheduled");
    expect(isPromotionLive(p, NOW)).toBe(false);
  });
});

describe("redemptionProgressPct", () => {
  it("da porcentaje sobre el tope global", () => {
    expect(redemptionProgressPct(promo())).toBe(62);
    expect(redemptionProgressPct(promo({ redemptions_count: 50 }))).toBe(100);
  });

  it("devuelve null sin tope: una barra sin máximo no mide nada", () => {
    expect(redemptionProgressPct(promo({ max_redemptions_total: null }))).toBeNull();
    expect(redemptionProgressPct(promo({ max_redemptions_total: 0 }))).toBeNull();
  });

  it("no se pasa del 100% si el contador supera el tope", () => {
    expect(redemptionProgressPct(promo({ redemptions_count: 80 }))).toBe(100);
  });
});

describe("unredeemedCoupons", () => {
  it("son los emitidos menos los canjeados (incluye vencidos)", () => {
    expect(unredeemedCoupons(promo())).toBe(87);
  });

  it("nunca es negativo aunque los contadores se crucen", () => {
    expect(unredeemedCoupons(promo({ coupons_issued: 2, redemptions_recorded: 9 }))).toBe(0);
  });
});

describe("filtro de estado del catálogo", () => {
  const ALL_STATES = ["live", "scheduled", "exhausted", "expired", "off"] as const;

  it("«activas» incluye las programadas: todavía no dan nada, pero lo van a dar", () => {
    expect(ALL_STATES.filter((s) => matchesPromotionStateFilter(s, "active"))).toEqual([
      "live",
      "scheduled",
    ]);
  });

  it("«todas» no descarta ninguna", () => {
    expect(ALL_STATES.every((s) => matchesPromotionStateFilter(s, "all"))).toBe(true);
  });

  it("«apagadas» y «vencidas o agotadas» no se solapan", () => {
    const off = ALL_STATES.filter((s) => matchesPromotionStateFilter(s, "off"));
    const gone = ALL_STATES.filter((s) => matchesPromotionStateFilter(s, "expired"));
    expect(off).toEqual(["off"]);
    expect(gone).toEqual(["exhausted", "expired"]);
    expect(off.filter((s) => gone.includes(s))).toEqual([]);
  });

  it("cada estado cae en exactamente un filtro además de «todas»", () => {
    for (const state of ALL_STATES) {
      const matched = (Object.keys(PROMOTION_STATE_FILTER_LABELS) as Array<
        keyof typeof PROMOTION_STATE_FILTER_LABELS
      >)
        .filter((f) => f !== "all")
        .filter((f) => matchesPromotionStateFilter(state, f));
      expect(matched).toHaveLength(1);
    }
  });
});
