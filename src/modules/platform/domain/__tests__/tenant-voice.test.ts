import { voiceUsageLabel, voiceUsageTone, type TenantVoiceUsage } from "../tenant-voice";

const usage = (over: Partial<TenantVoiceUsage>): TenantVoiceUsage => ({
  used: 178_400,
  limit: 300_000,
  pct_used: 59.5,
  period_end: "2026-09-30T05:00:00.000Z",
  ...over,
});

describe("consumo de voz del tenant (consola)", () => {
  it("etiqueta con separador de miles es-CO y porcentaje redondeado", () => {
    expect(voiceUsageLabel(usage({}))).toBe("178.400 / 300.000 caracteres · 60 %");
  });

  it("sin límite propio lo dice en vez de inventar un porcentaje", () => {
    expect(voiceUsageLabel(usage({ used: 12_480, limit: null, pct_used: null }))).toBe("12.480 caracteres · sin límite propio de voz");
    expect(voiceUsageTone(usage({ limit: null, pct_used: null }))).toBe("off");
  });

  it("tono: ok < 80 %, aviso ≥ 80 %, agotada ≥ 100 %", () => {
    expect(voiceUsageTone(usage({ pct_used: 59 }))).toBe("ok");
    expect(voiceUsageTone(usage({ pct_used: 80 }))).toBe("warning");
    expect(voiceUsageTone(usage({ pct_used: 100 }))).toBe("off");
  });
});
