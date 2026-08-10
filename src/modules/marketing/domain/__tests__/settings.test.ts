import {
  DEFAULT_MARKETING_SETTINGS,
  normalizeKeywords,
  validateMarketingSettings,
  wwebHoursToDailyCap,
  wwebMessagesPerHour,
  type MarketingSettings,
} from "../settings";

function settings(over: Partial<MarketingSettings> = {}): MarketingSettings {
  return { ...DEFAULT_MARKETING_SETTINGS, ...over };
}

describe("validateMarketingSettings", () => {
  it("acepta los defaults del backend", () => {
    expect(validateMarketingSettings(DEFAULT_MARKETING_SETTINGS)).toEqual({});
  });

  it("señala CADA campo fuera de rango por separado", () => {
    // Un banner genérico obligaría a buscar cuál de los ocho campos falla.
    const errors = validateMarketingSettings(
      settings({
        attribution_window_hours: 0,
        cooldown_hours: 1000,
        daily_cap_per_contact: 50,
        wweb: { daily_cap: 0, min_interval_seconds: 1, jitter_pct: 300 },
      }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "attribution_window_hours",
      "cooldown_hours",
      "daily_cap_per_contact",
      "wweb_daily_cap",
      "wweb_jitter_pct",
      "wweb_min_interval_seconds",
    ]);
  });

  it("acepta los extremos de cada rango", () => {
    expect(
      validateMarketingSettings(
        settings({
          attribution_window_hours: 1,
          cooldown_hours: 0,
          daily_cap_per_contact: 10,
          wweb: { daily_cap: 1000, min_interval_seconds: 5, jitter_pct: 0 },
        }),
      ),
    ).toEqual({});
  });

  it("rechaza decimales donde el backend espera enteros", () => {
    expect(validateMarketingSettings(settings({ cooldown_hours: 2.5 })).cooldown_hours).toBeDefined();
  });

  it("exige al menos una palabra de baja: es un requisito legal", () => {
    const errors = validateMarketingSettings(
      settings({ opt_out: { ...DEFAULT_MARKETING_SETTINGS.opt_out, keywords: [] } }),
    );
    expect(errors.keywords).toBe("Necesitas al menos una palabra de baja");
  });

  it("limita el número y el largo de las palabras", () => {
    const many = Array.from({ length: 11 }, (_, i) => `PALABRA${i}`);
    expect(
      validateMarketingSettings(
        settings({ opt_out: { ...DEFAULT_MARKETING_SETTINGS.opt_out, keywords: many } }),
      ).keywords,
    ).toContain("Máximo 10");

    expect(
      validateMarketingSettings(
        settings({
          opt_out: { ...DEFAULT_MARKETING_SETTINGS.opt_out, keywords: ["x".repeat(41)] },
        }),
      ).keywords,
    ).toContain("1 y 40");
  });

  it("exige un mensaje de confirmación no vacío y acotado", () => {
    expect(
      validateMarketingSettings(
        settings({ opt_out: { ...DEFAULT_MARKETING_SETTINGS.opt_out, confirmation_body: "   " } }),
      ).confirmation_body,
    ).toBeDefined();

    expect(
      validateMarketingSettings(
        settings({
          opt_out: { ...DEFAULT_MARKETING_SETTINGS.opt_out, confirmation_body: "a".repeat(301) },
        }),
      ).confirmation_body,
    ).toContain("Máximo 300");
  });
});

describe("normalizeKeywords", () => {
  it("pasa a mayúsculas, recorta y descarta vacíos", () => {
    expect(normalizeKeywords([" baja ", "stop", "   "])).toEqual(["BAJA", "STOP"]);
  });

  it("no gasta dos plazas en la misma palabra escrita distinto", () => {
    // El backend compara en mayúsculas: "baja" y "BAJA" son la misma.
    expect(normalizeKeywords(["baja", "BAJA", "Baja"])).toEqual(["BAJA"]);
  });

  it("conserva el orden de la primera aparición", () => {
    expect(normalizeKeywords(["stop", "baja", "STOP"])).toEqual(["STOP", "BAJA"]);
  });
});

describe("ritmo de WhatsApp Web", () => {
  it("traduce el intervalo y el jitter a mensajes por hora", () => {
    // 30 s con 50% de jitter promedia 37,5 s → 96 mensajes/hora.
    expect(wwebMessagesPerHour({ daily_cap: 150, min_interval_seconds: 30, jitter_pct: 50 })).toBe(
      96,
    );
    // Sin jitter, el ritmo es el intervalo puro.
    expect(wwebMessagesPerHour({ daily_cap: 150, min_interval_seconds: 60, jitter_pct: 0 })).toBe(
      60,
    );
  });

  it("dice cuánto tarda en agotarse el cupo diario", () => {
    expect(wwebHoursToDailyCap({ daily_cap: 96, min_interval_seconds: 30, jitter_pct: 50 })).toBe(1);
    expect(wwebHoursToDailyCap({ daily_cap: 150, min_interval_seconds: 30, jitter_pct: 50 })).toBe(
      1.6,
    );
  });

  it("no divide por cero con un intervalo imposible", () => {
    expect(wwebMessagesPerHour({ daily_cap: 10, min_interval_seconds: 0, jitter_pct: 0 })).toBe(0);
    expect(wwebHoursToDailyCap({ daily_cap: 10, min_interval_seconds: 0, jitter_pct: 0 })).toBe(0);
  });
});
