import type { CommercialGoalDTO, CommercialPaceDTO, CommercialPlanDTO, GoalResponseDTO } from "@/modules/commercial/domain/commercial";

export const goal: CommercialGoalDTO = {
  id: "g1",
  period_kind: "month",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
  currency: "COP",
  target_revenue_cents: 3_000_000_000,
  declared_avg_ticket_cents: null,
  declared_close_rate_pct: null,
  declared_last_month_revenue_cents: null,
  declared_max_attempts: null,
  declared_decision_days: null,
  source: "owner",
  created_at: "2026-09-01T13:00:00Z",
  updated_at: "2026-09-01T13:00:00Z",
};

export const goalResponse: GoalResponseDTO = {
  goal,
  seed: {
    last_month_revenue_cents: 2_210_000_000,
    last_month_sales: 31,
    last_month_avg_ticket_cents: 71_300_000,
    suggested_target_cents: 2_540_000_000,
    source: "history",
    niche_label: "clínicas estéticas",
  },
};

const rate = (value: number) => ({ value, source: "history" as const, window_days: 60, sample: 187 });

export const plan: CommercialPlanDTO = {
  goal_id: "g1",
  valid_from_date: "2026-09-23",
  goal_target_cents: 3_000_000_000,
  currency: "COP",
  benchmark_niche_code: "beauty",
  benchmark_niche_label: "clínicas estéticas",
  inputs: {
    avg_ticket_cents: { value: 70_000_000, source: "history", window_days: 90, sample: 61 },
    quote_to_sale: rate(0.38),
    meeting_to_sale: rate(0.44),
    contact_to_quote: rate(0.52),
    lead_to_contact: rate(0.35),
    call_answer: { value: 0.62, source: "benchmark", window_days: null, sample: null },
    calls_share: { value: 0.3, source: "benchmark", window_days: null, sample: null },
  },
  figures: {
    needed_sales: { value: 43, source: "history", basis: "history_90d n=61" },
    needed_quotes: { value: 110, source: "history", basis: null },
    needed_meetings: { value: 95, source: "history", basis: null },
    needed_contacted: { value: 210, source: "history", basis: null },
    needed_leads: { value: 600, source: "history", basis: null },
    needed_calls: { value: 120, source: "benchmark", basis: null },
  },
  pacing: { business_days_total: 26, business_days_elapsed: 20, business_days_left: 6, per_day_sales: 1.65 },
  product_mix: [
    { category: "Limpieza facial", share_pct: 45, suggested_units: 19 },
    { category: "Toxina", share_pct: 30, suggested_units: 13 },
    { category: "Otros", share_pct: 25, suggested_units: 11 },
  ],
  status: "ready",
  computed_at: "2026-09-23T06:00:00Z",
};

export const pace: CommercialPaceDTO = {
  goal_id: "g1",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
  currency: "COP",
  granularity: "day",
  target_revenue_cents: 3_000_000_000,
  actual_revenue_cents: 1_894_000_000,
  expected_revenue_cents: 2_307_000_000,
  projected_revenue_cents: 2_462_000_000,
  status: "behind",
  data_sufficiency: "ok",
  days_until_projection: null,
  business_days_total: 26,
  business_days_elapsed: 20,
  business_days_left: 6,
  avg_ticket_actual_cents: 70_100_000,
  avg_ticket_sales_count: 27,
  key_results: [
    { key: "sales", actual: 27, target: 43, expected: 33, daily_rate_actual: 1.35, daily_rate_expected: 1.65, source: "history", status: "behind" },
    { key: "quotes", actual: 71, target: 110, expected: 85, daily_rate_actual: 3.6, daily_rate_expected: 4.2, source: "history", status: "at_risk" },
    { key: "contacted", actual: 152, target: 210, expected: 162, daily_rate_actual: 7.6, daily_rate_expected: 8.1, source: "history", status: "on_track" },
    { key: "calls", actual: 79, target: 120, expected: 92, daily_rate_actual: 4, daily_rate_expected: 4.6, source: "benchmark", status: "at_risk" },
  ],
  series: [
    { date: "2026-09-21", revenue_cents: 100, expected_revenue_cents: 100, sales: 2, expected_sales: 2 },
    { date: "2026-09-22", revenue_cents: 100, expected_revenue_cents: 100, sales: 1, expected_sales: 2 },
    { date: "2026-09-23", revenue_cents: 100, expected_revenue_cents: 100, sales: 3, expected_sales: 2 },
  ],
  stale: false,
  computed_at: "2026-09-23T10:00:00Z",
};

export const learningPace: CommercialPaceDTO = {
  ...pace,
  actual_revenue_cents: 142_000_000,
  projected_revenue_cents: null,
  status: "insufficient_data",
  data_sufficiency: "insufficient",
  days_until_projection: 5,
  business_days_elapsed: 1,
  business_days_left: 25,
};
