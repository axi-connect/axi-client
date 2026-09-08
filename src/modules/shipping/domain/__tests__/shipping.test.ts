import { formatMoney } from "@/core/lib/format";
import {
  describeRateCondition,
  describeRatePrice,
  isRestOfCountry,
} from "@/modules/shipping/domain/shipping";

describe("shipping domain", () => {
  it("describe la condición por monto en el vocabulario del panel", () => {
    expect(describeRateCondition({ min_order_cents: null, max_order_cents: 19_999_900 })).toBe(
      `Pedidos hasta ${formatMoney(19_999_900)}`,
    );
    expect(describeRateCondition({ min_order_cents: 20_000_000, max_order_cents: null })).toBe(
      `Pedidos desde ${formatMoney(20_000_000)}`,
    );
    expect(describeRateCondition({ min_order_cents: null, max_order_cents: null })).toBeNull();
  });

  it("una plana a 0 es «Gratis» y una transportadora no tiene cifra", () => {
    expect(describeRatePrice({ kind: "flat", price_cents: 0 })).toEqual({ text: "Gratis", known: true });
    expect(describeRatePrice({ kind: "flat", price_cents: 1_200_000 })).toEqual({
      text: formatMoney(1_200_000),
      known: true,
    });
    expect(describeRatePrice({ kind: "live", price_cents: null }).known).toBe(false);
  });

  it("una zona sin departamentos es el resto del país", () => {
    expect(isRestOfCountry({ province_codes: [] })).toBe(true);
    expect(isRestOfCountry({ province_codes: ["CO-ANT"] })).toBe(false);
  });
});
