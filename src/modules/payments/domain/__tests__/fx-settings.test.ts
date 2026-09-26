import {
  MAX_SPREAD_BPS,
  formatRate,
  fxNotice,
  localToday,
  manualRateActive,
  manualRateExpired,
  sampleQuoteCents,
  percentToSpread,
  spreadToPercent,
  type FxSettingsDTO,
  type LatestFxRateDTO,
} from "@/modules/payments/domain/fx-settings";

const official: NonNullable<LatestFxRateDTO["official"]> = {
  base: "USD",
  quote: "COP",
  rate: 3100.45,
  valid_from: "2026-09-16",
  valid_to: "2026-09-16",
  source: "superfinanciera",
  fetched_at: "2026-09-15T23:35:00.000Z",
};

const effective = (overrides: Partial<NonNullable<LatestFxRateDTO["effective"]>> = {}) => ({
  base: "USD",
  quote: "COP",
  rate: 3100.45,
  official_rate: 3100.45,
  spread_bps: 0,
  source: "superfinanciera" as const,
  valid_from: "2026-09-16",
  stale: false,
  ...overrides,
});

describe("fx-settings (dominio)", () => {
  it("el ajuste va y vuelve en puntos básicos sin perder los decimales", () => {
    expect(spreadToPercent(250)).toBe("2,50");
    expect(percentToSpread("2,5")).toBe(250);
    expect(percentToSpread("2.5")).toBe(250);
    expect(percentToSpread("0")).toBe(0);
  });

  it("un ajuste por encima del tope del backend se rechaza aquí, no en el 422", () => {
    expect(percentToSpread(String(MAX_SPREAD_BPS / 100))).toBe(MAX_SPREAD_BPS);
    expect(percentToSpread("21")).toBeNull();
    expect(percentToSpread("-3")).toBeNull();
    expect(percentToSpread("")).toBeNull();
    expect(percentToSpread("mañana")).toBeNull();
  });

  it("la tasa se lee como un precio, con dos decimales", () => {
    expect(formatRate(3100.45)).toBe("3.100,45");
    expect(formatRate(3100)).toBe("3.100,00");
  });

  it("el aviso distingue las cuatro situaciones que el dueño tiene que entender", () => {
    expect(fxNotice({ official, effective: effective() })).toBe("none");
    expect(fxNotice({ official, effective: effective({ stale: true }) })).toBe("stale");
    expect(fxNotice({ official, effective: effective({ source: "tenant_override" }) })).toBe("manual");
    // Serie vacía, o vencida más allá del margen: no hay tasa que mostrar
    expect(fxNotice({ official: null, effective: null })).toBe("empty");
    expect(fxNotice({ official, effective: null })).toBe("empty");
  });

  it("una manual vencida ya no manda", () => {
    const settings = (valid_until: string | null): FxSettingsDTO => ({
      settlement_currency: "COP",
      spread_bps: 0,
      manual_rate: valid_until === null ? null : { rate: 3200, valid_until },
      show_indicative_quotes: true,
    });
    expect(manualRateActive(settings("2026-12-31"), "2026-09-16")).toBe(true);
    expect(manualRateActive(settings("2026-09-16"), "2026-09-16")).toBe(true);
    expect(manualRateActive(settings("2026-09-15"), "2026-09-16")).toBe(false);
    expect(manualRateActive(settings(null), "2026-09-16")).toBe(false);
  });
});

describe("QA F2: manual vencida y ejemplo compartido", () => {
  const settings = (valid_until: string): FxSettingsDTO => ({
    settlement_currency: "COP",
    spread_bps: 200,
    manual_rate: { rate: 4000, valid_until },
    show_indicative_quotes: true,
  });

  it("manualRateExpired: solo una manual GUARDADA con fecha pasada; sin manual no hay nada vencido", () => {
    expect(manualRateExpired(settings("2026-09-15"), "2026-09-16")).toBe(true);
    expect(manualRateExpired(settings("2026-09-16"), "2026-09-16")).toBe(false);
    expect(
      manualRateExpired({ ...settings("2026-09-15"), manual_rate: null }, "2026-09-16"),
    ).toBe(false);
  });

  it("sampleQuoteCents: 3.500 dólares a la efectiva, redondeado; null sin tasa", () => {
    expect(
      sampleQuoteCents({
        official: null,
        effective: {
          base: "USD",
          quote: "COP",
          rate: 3162.46,
          official_rate: 3100.45,
          spread_bps: 200,
          source: "superfinanciera",
          valid_from: "2026-09-16",
          stale: false,
        },
      }),
    ).toBe(1_106_861_000);
    expect(sampleQuoteCents({ official: null, effective: null })).toBeNull();
  });

  it("localToday escribe el día LOCAL como el input date (la medianoche UTC no adelanta el día)", () => {
    // 2026-09-16 23:30 en Bogotá es ya 17 en UTC; el formulario compara con lo que ve la persona.
    expect(localToday(new Date("2026-09-17T04:30:00.000Z"))).toBe("2026-09-16");
    expect(localToday(new Date("2026-09-16T12:00:00.000Z"))).toBe("2026-09-16");
  });
});
