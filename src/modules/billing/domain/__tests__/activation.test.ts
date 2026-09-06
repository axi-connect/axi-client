import { HttpError } from "@/core/api/problem";
import {
  activationVariant,
  daysUntil,
  offerLabel,
  priceChangedFromError,
  savingsCents,
  type ActivationDTO,
  type ActivationQuoteDTO,
} from "../activation";

const QUOTE: ActivationQuoteDTO = {
  plan_code: "crecimiento",
  plan_name: "Crecimiento",
  volume_tier_code: "t1000",
  volume_label: "1.000",
  interval: "monthly",
  list_amount_cents: 36_990_000,
  amount_cents: 22_190_000,
  currency: "COP",
  promotion_code: "founders_2026",
  promotion_name: "Programa Fundadores",
  promotion_outcome: "applied",
  promotion_ends_at: "2027-01-01T05:00:00.000Z",
};

function view(over: Partial<ActivationDTO> = {}): ActivationDTO {
  return {
    state: "ready",
    offer: null,
    quote_saved: null,
    quote_now: QUOTE,
    price_changed: false,
    quote_honored: false,
    quote_valid_until: null,
    trial_ends_at: null,
    pending_invoice: null,
    term: null,
    ...over,
  };
}

describe("activationVariant", () => {
  it("con el plan activo, o sin vista, no hay tarjeta", () => {
    expect(activationVariant(null)).toBe("hidden");
    expect(activationVariant(view({ state: "active" }))).toBe("hidden");
  });

  it("el precio cambiado gana a ready: la tarjeta cambia de trabajo, no solo de texto", () => {
    expect(activationVariant(view())).toBe("ready");
    expect(activationVariant(view({ price_changed: true }))).toBe("price_changed");
    expect(activationVariant(view({ state: "expired_quote", price_changed: true }))).toBe(
      "price_changed",
    );
  });

  it("mapea el resto de estados uno a uno", () => {
    expect(activationVariant(view({ state: "pending_payment" }))).toBe("pending_payment");
    expect(activationVariant(view({ state: "trial_no_offer" }))).toBe("no_offer");
    expect(activationVariant(view({ state: "unsupported" }))).toBe("unsupported");
  });
});

describe("la oferta en una línea y el ahorro", () => {
  it("plan · tramo · periodicidad, y sin tramo se omite el trozo", () => {
    expect(offerLabel(QUOTE)).toBe("Crecimiento · 1.000 conversaciones al mes · Pago mensual");
    expect(offerLabel({ ...QUOTE, volume_label: null, interval: "annual" })).toBe(
      "Crecimiento · Pago anual",
    );
  });

  it("el ahorro es lista menos final, nunca negativo", () => {
    expect(savingsCents(QUOTE)).toBe(14_800_000);
    expect(savingsCents({ list_amount_cents: 100, amount_cents: 100 })).toBe(0);
    expect(savingsCents({ list_amount_cents: 100, amount_cents: 150 })).toBe(0);
  });
});

describe("daysUntil", () => {
  const now = new Date("2026-09-05T12:00:00Z");
  it("cuenta días enteros hacia arriba; hoy es 0; pasado es null", () => {
    expect(daysUntil("2026-09-12T12:00:00Z", now)).toBe(7);
    expect(daysUntil("2026-09-05T18:00:00Z", now)).toBe(1);
    expect(daysUntil("2026-09-05T12:00:00Z", now)).toBe(0);
    expect(daysUntil("2026-09-01T00:00:00Z", now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil("no-es-fecha", now)).toBeNull();
  });
});

describe("priceChangedFromError", () => {
  it("saca la cotización de hoy de un 409 billing/price_changed", () => {
    const error = new HttpError({
      status: 409,
      code: "billing/price_changed",
      message: "cambió",
      problem: {
        type: "about:blank",
        title: "cambió",
        status: 409,
        code: "billing/price_changed",
        details: { quote_now: { ...QUOTE, amount_cents: 36_990_000, promotion_code: null } },
      },
    });
    expect(priceChangedFromError(error)?.amount_cents).toBe(36_990_000);
  });

  it("cualquier otro error, o un 409 sin cotización, es null", () => {
    expect(priceChangedFromError(new Error("x"))).toBeNull();
    expect(
      priceChangedFromError(
        new HttpError({ status: 409, code: "billing/term_exists", message: "ya" }),
      ),
    ).toBeNull();
    expect(
      priceChangedFromError(
        new HttpError({
          status: 409,
          code: "billing/price_changed",
          message: "cambió",
          problem: { type: "about:blank", title: "x", status: 409, code: "billing/price_changed" },
        }),
      ),
    ).toBeNull();
  });
});
