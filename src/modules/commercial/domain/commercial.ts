/**
 * Contratos del slice `commercial` (la meta del mes, el plan y el ritmo).
 *
 * Todo en `snake_case`, 1:1 con el wire del backend (arquitectura §5). Las
 * cifras de dinero viajan en centavos enteros; las fechas de periodo como
 * `YYYY-MM-DD` en la zona horaria del tenant; las tasas como fracción 0–1.
 */

// TEMPORAL (F3): sustituir por Schemas["..."] al regenerar core/api/schema.d.ts desde el openapi del servidor
// (el servidor de F3 se construye en paralelo; `openapi.json` aún no trae `/commercial/*`).

/** De dónde sale una cifra. Cada número del módulo lleva la suya (D7). */
export type SourceKind = "history" | "declared" | "benchmark";

/** El ritmo contra la meta (`commercial/domain/pacing.ts` del servidor). */
export type PaceStatus = "ahead" | "on_track" | "at_risk" | "behind" | "insufficient_data" | "achieved";

/** Los resultados clave derivados de la meta (D8), en el orden de la lista. */
export type KeyResultKey = "sales" | "quotes" | "meetings" | "contacted" | "leads" | "calls";

export type GoalSource = "owner" | "intake" | "system";
export type PlanStatus = "ready" | "incomplete";
export type DataSufficiency = "ok" | "insufficient";
export type PaceGranularity = "day" | "week";

/** Una cifra con su procedencia y la base que la explica («history_90d n=61»). */
export interface FigureDTO {
  value: number;
  source: SourceKind;
  basis: string | null;
}

export interface CommercialGoalDTO {
  id: string;
  period_kind: "month";
  period_start: string;
  period_end: string;
  currency: string;
  target_revenue_cents: number;
  declared_avg_ticket_cents: number | null;
  declared_close_rate_pct: number | null;
  declared_last_month_revenue_cents: number | null;
  declared_max_attempts: number | null;
  declared_decision_days: number | null;
  source: GoalSource;
  created_at: string;
  updated_at: string;
}

/** La semilla para proponer una meta: la historia si la hay, si no el nicho. */
export interface GoalSeedDTO {
  last_month_revenue_cents: number | null;
  last_month_sales: number | null;
  last_month_avg_ticket_cents: number | null;
  suggested_target_cents: number | null;
  source: SourceKind;
  niche_label: string | null;
}

/**
 * `GET /commercial/goal`: la meta del mes en curso (o `null`) y la semilla.
 * `seed` es `null` solo en el cliente, cuando la meta se guardó sin haber
 * cargado antes la respuesta (no se inventa una semilla).
 */
export interface GoalResponseDTO {
  goal: CommercialGoalDTO | null;
  seed: GoalSeedDTO | null;
}

/** `PUT /commercial/goal`. Lo que se edita en «Ajustar supuestos» pasa a «lo dijiste tú». */
export interface GoalInputDTO {
  target_revenue_cents: number;
  declared_avg_ticket_cents?: number | null;
  declared_close_rate_pct?: number | null;
}

export interface PlanRateDTO {
  value: number;
  source: SourceKind;
  window_days: number | null;
  sample: number | null;
}

export interface PlanInputsDTO {
  avg_ticket_cents: PlanRateDTO | null;
  quote_to_sale: PlanRateDTO;
  meeting_to_sale: PlanRateDTO | null;
  contact_to_quote: PlanRateDTO;
  lead_to_contact: PlanRateDTO;
  call_answer: PlanRateDTO | null;
  calls_share: PlanRateDTO | null;
}

export interface PlanFiguresDTO {
  needed_sales: FigureDTO;
  needed_quotes: FigureDTO;
  needed_meetings: FigureDTO | null;
  needed_contacted: FigureDTO;
  needed_leads: FigureDTO;
  needed_calls: FigureDTO | null;
}

export interface PlanPacingDTO {
  business_days_total: number;
  business_days_elapsed: number;
  business_days_left: number;
  per_day_sales: number;
}

export interface ProductMixRowDTO {
  category: string;
  share_pct: number;
  suggested_units: number;
}

/** `GET /commercial/plan` y `GET /commercial/plan/preview?target_cents=`. */
export interface CommercialPlanDTO {
  goal_id: string | null;
  valid_from_date: string;
  goal_target_cents: number;
  currency: string;
  benchmark_niche_code: string | null;
  benchmark_niche_label: string | null;
  inputs: PlanInputsDTO;
  figures: PlanFiguresDTO;
  pacing: PlanPacingDTO;
  product_mix: ProductMixRowDTO[];
  status: PlanStatus;
  computed_at: string;
}

export interface PaceKeyResultDTO {
  key: KeyResultKey;
  actual: number;
  target: number;
  /** Dónde deberías ir hoy. */
  expected: number;
  daily_rate_actual: number;
  daily_rate_expected: number;
  source: SourceKind;
  status: PaceStatus;
  /** Solo en `calls`: el KR cuenta llamadas HECHAS; estas son las contestadas. */
  answered_actual: number | null;
  answered_expected: number | null;
}

/**
 * Un punto de la serie del mes. **Las cifras son ACUMULADAS** desde el primer
 * día del periodo (`sales += orders_paid` día a día), no el valor del día: el
 * valor de una semana es el último punto de la semana menos el último punto
 * anterior a su lunes.
 */
export interface PacePointDTO {
  date: string;
  revenue_cents: number;
  expected_revenue_cents: number;
  sales: number;
  expected_sales: number;
}

/** `GET /commercial/pace?granularity=day|week`. Nunca calcula en caliente: lee rollup + plan. */
export interface CommercialPaceDTO {
  goal_id: string;
  period_start: string;
  period_end: string;
  currency: string;
  granularity: PaceGranularity;
  /** «Hoy» en la zona horaria del tenant (`YYYY-MM-DD`). El navegador no decide qué día es. */
  today: string;
  /** Días hábiles del tenant (0=domingo … 6=sábado), de su horario de atención. */
  weekdays: number[];
  target_revenue_cents: number;
  actual_revenue_cents: number;
  expected_revenue_cents: number;
  projected_revenue_cents: number | null;
  status: PaceStatus;
  data_sufficiency: DataSufficiency;
  /** Días hábiles que faltan para tener proyección (solo con `insufficient`). */
  days_until_projection: number | null;
  business_days_total: number;
  business_days_elapsed: number;
  business_days_left: number;
  avg_ticket_actual_cents: number | null;
  avg_ticket_sales_count: number | null;
  key_results: PaceKeyResultDTO[];
  series: PacePointDTO[];
  /** La fila de hoy tiene >10 min: el servidor ya encoló el refresco. */
  stale: boolean;
  computed_at: string;
}

/**
 * Una acción que Axi propone para acelerar la ruta. En F3 la lista nace
 * vacía: `GET /commercial/proposals` llega en F6 con aprobar/rechazar.
 */
export interface CommercialProposalDTO {
  id: string;
  title: string;
  headline: string | null;
  rationale: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string | null;
  created_at: string;
}
