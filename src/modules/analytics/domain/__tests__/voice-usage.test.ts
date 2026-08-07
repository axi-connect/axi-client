import { voiceUsageFromSources, type UsageHistoryDTO, type UsageSummaryDTO } from "../analytics";

/**
 * La tarjeta "Voz" compone DOS fuentes: el summary (cuota y ventana del ciclo)
 * y la history de tts_characters (serie, costo de la voz y notas reales por
 * event_count). Estas reglas evitan que un tenant sin métrica o sin límite
 * rompa la vista.
 */
const summary = (metrics: UsageSummaryDTO["metrics"]): UsageSummaryDTO =>
  ({
    period: "billing_cycle",
    period_start: "2026-08-01T00:00:00.000Z",
    period_end: "2026-08-31T23:59:59.000Z",
    ai_paused: false,
    metrics,
    cost: { used_usd: 20, limit: null },
  }) as UsageSummaryDTO;

const history: UsageHistoryDTO = {
  data: [
    { period_start: "2026-08-01T00:00:00.000Z", quantity: 3_000, cost_usd: 0.62, event_count: 12 },
    { period_start: "2026-08-02T00:00:00.000Z", quantity: 1_500, cost_usd: 0.31, event_count: 5 },
  ],
};

describe("voiceUsageFromSources", () => {
  it("compone cuota del summary + costo/notas/serie de la history", () => {
    const view = voiceUsageFromSources(
      summary([
        { metric: "tts_characters", used: 4_500, limit: { value: 15_000, action: "degrade", pct_used: 30 } },
      ]),
      history,
    );
    expect(view.used).toBe(4_500);
    expect(view.limit).toEqual({ value: 15_000, pct_used: 30 });
    expect(view.cost_usd).toBeCloseTo(0.93);
    expect(view.notes_sent).toBe(17);
    expect(view.series).toHaveLength(2);
    expect(view.period_start).toBe("2026-08-01T00:00:00.000Z");
  });

  it("sin la métrica en el summary: ceros y sin límite (no rompe la tarjeta)", () => {
    const view = voiceUsageFromSources(summary([]), { data: [] });
    expect(view).toMatchObject({ used: 0, limit: null, cost_usd: 0, notes_sent: 0, series: [] });
  });

  it("métrica sin límite propio: used cuenta, limit queda null", () => {
    const view = voiceUsageFromSources(
      summary([{ metric: "tts_characters", used: 900, limit: null }]),
      { data: [] },
    );
    expect(view.used).toBe(900);
    expect(view.limit).toBeNull();
  });
});
