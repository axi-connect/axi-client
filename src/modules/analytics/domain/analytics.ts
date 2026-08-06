/**
 * Contratos del slice analytics (wire snake_case 1:1 con axi-server, §5).
 * Dos planos que la UI JAMÁS mezcla: funnel determinista (ventas exactas,
 * tab Conversión) y LLM-judge (juicio de calidad, tab Calidad). Los DTOs se
 * derivan de `Schemas` (schema.d.ts generado — cero interfaces manuales).
 * Los eventos WS viven en core/realtime/events.ts (core no importa de modules).
 */
import type { Schemas } from "@/core/api/types";

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d"];

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
};

/** Tabs de la sección, sincronizados a `?tab=`. */
export type AnalyticsTab = "conversion" | "calidad" | "alertas";

export const ANALYTICS_TABS: AnalyticsTab[] = ["conversion", "calidad", "alertas"];

export const TAB_LABELS: Record<AnalyticsTab, string> = {
  conversion: "Conversión",
  calidad: "Calidad",
  alertas: "Alertas",
};

/** Embudo determinista — GET /analytics/funnel (`analytics:read`). */
export type FunnelDTO = Schemas["FunnelDto"];
export type FunnelStages = FunnelDTO["stages"];
export type FunnelRates = FunnelDTO["rates"];
export type FunnelGroup = NonNullable<FunnelDTO["groups"]>[number];
export type FunnelGroupBy = "agent" | "channel" | "intention";

/** Desempeño por agente — GET /analytics/agent-performance (`analytics:read`). */
export type AgentPerformanceDTO = Schemas["AgentPerformanceDto"];
export type AgentPerformanceRow = AgentPerformanceDTO["agents"][number];

/** Evaluaciones LLM-judge — GET /analytics/evaluations (`analytics:read`). */
export type EvaluationsListDTO = Schemas["EvaluationsListDto"];
export type EvaluationDTO = Schemas["EvaluationDto"];
export type EvaluationIssue = EvaluationDTO["issues"][number];
export type EvaluationSort = "score_asc" | "score_desc" | "recent";

/** Calibración humana — PATCH /analytics/evaluations/:id/review (`analytics:manage`). */
export type ReviewEvaluationDTO = Schemas["ReviewEvaluationDto"];

/** Top de problemas — GET /analytics/issues/top (`analytics:read`). */
export type IssuesTopDTO = Schemas["IssuesTopDto"];
export type TopIssue = IssuesTopDTO["issues"][number];

/** Acuerdo juez-humano — GET /analytics/judge-agreement (`analytics:read`). */
export type JudgeAgreementDTO = Schemas["JudgeAgreementDto"];

/** Alertas de anomalía — GET /analytics/alerts (`analytics:read`). */
export type AlertsListDTO = Schemas["AlertsListDto"];
export type AlertRowDTO = AlertsListDTO["data"][number];
export type AlertStatus = "triggered" | "acknowledged" | "resolved";

/** Re-evaluación asíncrona — POST /analytics/conversations/:id/evaluate (202). */
export type EvaluateAcceptedDTO = Schemas["EvaluateAcceptedDto"];

/** Consumo de voz — GET /usage/summary + /usage/history?metric=tts_characters. */
export type UsageSummaryDTO = Schemas["UsageSummaryDto"];
export type UsageHistoryDTO = Schemas["UsageHistoryDto"];

/** Nota de voz típica (§10.5): misma equivalencia que el editor de límites. */
export const CHARS_PER_VOICE_NOTE = 280;

/**
 * Vista de la tarjeta "Voz" (§10.5 F5). Ámbito = CICLO de facturación (el que
 * gobierna cuota y costo), no el período del tab: por eso `setPeriod` no la
 * re-fetchea. Las notas son eventos de síntesis REALES (`event_count`), no la
 * estimación por caracteres.
 */
export type VoiceUsageView = {
  period_start: string;
  period_end: string;
  /** Caracteres sintetizados en el ciclo. */
  used: number;
  limit: { value: number; pct_used: number } | null;
  /** Costo de la voz del ciclo (ya incluido en el costo total de IA). */
  cost_usd: number;
  /** Notas de voz generadas (una por evento de síntesis). */
  notes_sent: number;
  /** Serie diaria de caracteres para el gráfico. */
  series: { period_start: string; quantity: number }[];
};

export function voiceUsageFromSources(
  summary: UsageSummaryDTO,
  history: UsageHistoryDTO,
): VoiceUsageView {
  const metric = summary.metrics.find((entry) => entry.metric === "tts_characters");
  let cost = 0;
  let notes = 0;
  for (const bucket of history.data) {
    cost += bucket.cost_usd;
    notes += bucket.event_count;
  }
  return {
    period_start: summary.period_start,
    period_end: summary.period_end,
    used: metric?.used ?? 0,
    limit:
      metric?.limit != null
        ? { value: metric.limit.value, pct_used: metric.limit.pct_used }
        : null,
    cost_usd: cost,
    notes_sent: notes,
    series: history.data.map((bucket) => ({
      period_start: bucket.period_start,
      quantity: bucket.quantity,
    })),
  };
}
