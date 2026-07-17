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
