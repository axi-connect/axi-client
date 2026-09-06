import { fireEvent, render, screen } from "@testing-library/react";
import type { MarginSample, MarginSimulation } from "@/modules/platform/domain/margin";
import { MarginView } from "../MarginView";

const queryOf = <T,>(data: T) => ({ data, isPending: false, isError: false, error: null, refetch: jest.fn() });

const SAMPLE: MarginSample = {
  cached_at: "2026-09-06T09:40:00.000Z",
  parameters: {
    trm_cop_per_usd: 4200,
    thresholds: { min_list_bps: 7000, min_promo_bps: 6000, bonus_threshold_bps: 7000 },
    gateway: { provider: "wompi", method: "card", fee: { percent_bps: 299, fixed_cents: 60_000, vat_bps: 1900 } },
    gateways: [{ provider: "wompi", method: "card", fee: { percent_bps: 299, fixed_cents: 60_000, vat_bps: 1900 } }],
    declared: {
      mix: { tokens_in_per_conversation: 6000, tokens_out_per_conversation: 1500, cache_share: 0.8, voice_notes_per_conversation: 0.17875, minutes_per_call: 4, calls_per_100_conversations: 1.5 },
      rates: { input_usd_per_token: 1.5e-7, output_usd_per_token: 6e-7, cache_read_usd_per_token: 7.5e-8, tts_usd_per_character: 8.25e-5, call_usd_per_second: 0.0015 },
      rates_provider: "openai_compatible",
      unit_conversation_usd: 0.0019,
      unit_call_usd: 0.36,
    },
    missing: [],
  },
  sample: {
    window: { from: "2026-08-07T00:00:00.000Z", to: "2026-09-06T00:00:00.000Z" },
    conversations: 47_318,
    segments: [
      {
        segment: "text",
        sample_size: 43_052,
        confidence: "ok",
        share: 0.91,
        p50_usd: 0.0016,
        p75_usd: 0.0031,
        p90_usd: 0.0058,
        mean_usd: 0.002,
        accounting_p50_usd: 0.0017,
        by_metric: [
          { metric: "ai_tokens_output", quantity_per_unit: 1412, real_usd_per_unit: 0.00085, accounting_usd_per_unit: 0.00085 },
          { metric: "ai_requests", quantity_per_unit: 5.8, real_usd_per_unit: 0, accounting_usd_per_unit: 0 },
        ],
      },
      { segment: "voice", sample_size: 19, confidence: "low", share: 0.09, p50_usd: 0.026, p75_usd: 0.038, p90_usd: 0.052, mean_usd: 0.03, accounting_p50_usd: 0.026, by_metric: [] },
    ],
    calls: { sessions: 19, confidence: "low", calls_per_100_conversations: 1.4, p50_usd: 0.29, p75_usd: 0.48, p90_usd: 0.71, mean_seconds: 192, prorated_voice_turn_usd: 0.03, by_metric: [] },
    unattributed: [{ purpose: "voice_turn", events: 1204, real_usd: 3.86 }],
    unpriced_events: 0,
    wildcard_share: 0.021,
    acquisition_measured: { template_sent_usd: 38.2, lead_usd: 0 },
    operations_usd: 4.1,
  },
};

const SIMULATION: MarginSimulation = {
  plan: { id: "p-esencial", code: "esencial", name: "Esencial" },
  tier_code: "t5000",
  conversations: 5000,
  interval: "monthly",
  price: { monthly_list_cents: 73_990_000, period_list_cents: 73_990_000, period_promo_cents: 44_390_000, promotion_code: "founders_2026" },
  basis: "mixed",
  sample_scope: "global",
  unit: { text_share: 0.91, voice_share: 0.09, text_p50_usd: 0.0016, text_p90_usd: 0.0058, voice_p50_usd: 0.026, voice_p90_usd: 0.052, calls_per_100_conversations: 0, call_p50_usd: 0.29, call_p90_usd: 0.71 },
  fixed_usd_per_month: 6,
  gateway: { provider: "wompi", method: "card", fee: { percent_bps: 299, fixed_cents: 60_000, vat_bps: 1900 } },
  trm_cop_per_usd: 4200,
  result: {
    margin_real_p50: 0.726,
    margin_real_p90: 0.372,
    margin_promo_p50: 0.544,
    contribution_cents: 51_776_000,
    cogs_p50_cents: 16_510_000,
    cogs_p90_cents: 41_790_000,
    fee_cents: 2_704_038,
    quota_cap: { cap_usd: 88.08, used_share_p50: 0.22, allowed_share: 0.8, promo_cap_usd: 52.85, promo_used_share_p50: 0.36 },
    status: "ok",
    failures: [{ check: "promo_margin_min", detail: "Con la promoción abierta la celda esencial/t5000 (monthly) queda en 54.4 %; el mínimo con promoción es 60.0 %" }],
    warnings: [{ check: "margin_unverified", detail: "base mixta" }],
  },
  accounting_margin_p50: 0.718,
  trm_sensitivity: [
    { trm_cop_per_usd: 3570, delta_pct: -15, margin_p50: 0.767, margin_p90: 0.466 },
    { trm_cop_per_usd: 4200, delta_pct: 0, margin_p50: 0.726, margin_p90: 0.372 },
    { trm_cop_per_usd: 4830, delta_pct: 15, margin_p50: 0.685, margin_p90: 0.278 },
  ],
  cac: { per_client_cents: 120_000_000, declared_cents: 240_000_000, new_clients: 2, signups: 5, period: "2026-09-01", recovery_months: 2.3 },
  sample_size: 47_318,
};

const simulateMutate = jest.fn();
let simulation: MarginSimulation | undefined;

jest.mock("@/modules/platform/infrastructure/api/hooks/use-margin", () => ({
  useMarginSampleQuery: () => queryOf(SAMPLE),
  useSimulateMargin: () => ({ mutate: simulateMutate, isPending: false, isError: false, error: null, data: simulation }),
}));
jest.mock("@/modules/platform/infrastructure/api/hooks/use-plans", () => ({
  usePlansQuery: () =>
    queryOf({
      data: [
        { id: "p-esencial", code: "esencial", name: "Esencial", kind: "package", public_slug: "esencial", self_service: true, is_active: true, capabilities: [] },
        { id: "p-calls", code: "calls", name: "Llamadas", kind: "module", public_slug: "llamadas", self_service: true, is_active: true, capabilities: ["calls"] },
      ],
    }),
}));
jest.mock("@/modules/platform/infrastructure/api/hooks/use-catalog", () => ({
  useVolumeTiersQuery: () =>
    queryOf({
      data: [
        { id: "t1", code: "t500", conversations: 500, label: "500", sort_order: 1, fee_cents: 9_990_000, is_active: true, price_count: 6 },
        { id: "t4", code: "t5000", conversations: 5000, label: "5.000", sort_order: 4, fee_cents: 64_990_000, is_active: true, price_count: 6 },
      ],
    }),
}));

describe("MarginView · consola de margen", () => {
  beforeEach(() => {
    simulation = undefined;
    simulateMutate.mockClear();
  });

  it("pinta la muestra por segmento con su origen y avisa cuando el percentil no es firme", () => {
    render(<MarginView />);
    expect(screen.getByRole("heading", { name: "Margen" })).toBeInTheDocument();
    expect(screen.getByText(/47\.318/)).toBeInTheDocument();
    expect(screen.getAllByText("Solo texto").length).toBeGreaterThan(0);
    // p50 del texto en USD y en pesos a la TRM declarada (0,0016 × 4.200 = 6,72 COP).
    expect(screen.getAllByText("$0.0016").length).toBeGreaterThan(0);
    expect(screen.getAllByText("muestra baja · 19")).toHaveLength(2);
    expect(screen.getAllByText(/Tokens de salida/).length).toBeGreaterThan(0);
    // Lo que ningún segmento ve, con su propósito.
    expect(screen.getByText("voice_turn")).toBeInTheDocument();
    expect(screen.getByText("Modelo declarado (respaldo)")).toBeInTheDocument();
  });

  it("el simulador manda al servidor la celda elegida y pinta el resultado con semáforo, verja y sensibilidad", () => {
    render(<MarginView />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(simulateMutate).toHaveBeenCalledTimes(1);
    expect(simulateMutate.mock.calls[0][0]).toMatchObject({
      plan_id: "p-esencial",
      volume_tier_code: "t5000",
      interval: "monthly",
      promotion_code: "auto",
      price_cents: null,
    });

    simulation = SIMULATION;
    render(<MarginView />);
    expect(screen.getByText("Vende con recurrente")).toBeInTheDocument();
    expect(screen.getAllByText("72,6 %").length).toBeGreaterThan(0);
    expect(screen.getByText(/Margen con promoción bajo el mínimo/)).toBeInTheDocument();
    expect(screen.getByText(/3\.570/)).toBeInTheDocument();
    expect(screen.getByText(/2,3 meses/)).toBeInTheDocument();
    expect(screen.getByText(/2 activaciones · 5 altas/)).toBeInTheDocument();
  });
});
