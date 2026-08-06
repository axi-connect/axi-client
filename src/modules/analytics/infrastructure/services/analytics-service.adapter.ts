import { http } from "@/core/services/http";
import {
  voiceUsageFromSources,
  type UsageHistoryDTO,
  type UsageSummaryDTO,
  type VoiceUsageView,
} from "@/modules/analytics/domain/analytics";
import type {
  AgentPerformanceDTO,
  AlertsListDTO,
  AlertStatus,
  AnalyticsPeriod,
  EvaluateAcceptedDTO,
  EvaluationDTO,
  EvaluationSort,
  EvaluationsListDTO,
  FunnelDTO,
  FunnelGroupBy,
  IssuesTopDTO,
  JudgeAgreementDTO,
  ReviewEvaluationDTO,
} from "@/modules/analytics/domain/analytics";

/**
 * Adapter de analytics: una función por endpoint F13 (`/analytics/*`). Todas
 * autentican por defecto (singleton `http`, §7); el permiso (`analytics:read`
 * / `analytics:manage`) lo gobierna el store con RBAC natural — nunca se pide
 * lo que daría 403.
 */

/** Embudo determinista del período (+ desglose opcional por grupo). */
export function getFunnel(
  period: AnalyticsPeriod,
  groupBy?: FunnelGroupBy,
): Promise<FunnelDTO> {
  return http.get<FunnelDTO>("/analytics/funnel", {
    period,
    ...(groupBy ? { group_by: groupBy } : {}),
  });
}

/** Desempeño técnico + calidad promedio por agente IA. */
export function getAgentPerformance(period: AnalyticsPeriod): Promise<AgentPerformanceDTO> {
  return http.get<AgentPerformanceDTO>("/analytics/agent-performance", { period });
}

/** Evaluaciones LLM-judge paginadas (offset). Default del dominio: peores primero. */
export function getEvaluations(params: {
  period: AnalyticsPeriod;
  sort?: EvaluationSort;
  min_score?: number;
  max_score?: number;
  issue_code?: string;
  agent_id?: string;
  page?: number;
  page_size?: number;
}): Promise<EvaluationsListDTO> {
  return http.get<EvaluationsListDTO>("/analytics/evaluations", params);
}

/** Evaluación más reciente de UNA conversación. 404 = "sin evaluar" (estado, no error). */
export function getEvaluation(conversationId: string): Promise<EvaluationDTO> {
  return http.get<EvaluationDTO>(`/analytics/conversations/${conversationId}/evaluation`);
}

/** Encola una (re)evaluación — 202; el resultado llega por WS. */
export function evaluateConversation(conversationId: string): Promise<EvaluateAcceptedDTO> {
  return http.post<EvaluateAcceptedDTO>(
    `/analytics/conversations/${conversationId}/evaluate`,
    {},
  );
}

/** Calibración humana de una evaluación (204). */
export function reviewEvaluation(
  evaluationId: string,
  body: ReviewEvaluationDTO,
): Promise<void> {
  return http.patch<void>(`/analytics/evaluations/${evaluationId}/review`, body);
}

/** Problemas más frecuentes ordenados por prioridad (frecuencia × severidad). */
export function getTopIssues(
  period: AnalyticsPeriod,
  agentId?: string,
): Promise<IssuesTopDTO> {
  return http.get<IssuesTopDTO>("/analytics/issues/top", {
    period,
    ...(agentId ? { agent_id: agentId } : {}),
  });
}

/** Acuerdo juez-humano por versión del prompt del evaluador. */
export function getJudgeAgreement(): Promise<JudgeAgreementDTO> {
  return http.get<JudgeAgreementDTO>("/analytics/judge-agreement");
}

/** Alertas de anomalía (recientes primero, máx 100). */
export function getAlerts(status: AlertStatus): Promise<AlertsListDTO> {
  return http.get<AlertsListDTO>("/analytics/alerts", { status });
}

/** Marca una alerta como atendida (204): triggered → acknowledged. */
export function ackAlert(alertId: string): Promise<void> {
  return http.post<void>(`/analytics/alerts/${alertId}/ack`, {});
}

/**
 * Consumo de voz del CICLO para la tarjeta "Voz" (§10.5 F5): el summary da
 * cuota y ventana del ciclo; la history acotada a esa ventana da la serie
 * diaria, el costo de la voz y las notas reales (`event_count` = síntesis).
 */
export async function getVoiceUsage(): Promise<VoiceUsageView> {
  const summary = await http.get<UsageSummaryDTO>("/usage/summary");
  const history = await http.get<UsageHistoryDTO>("/usage/history", {
    metric: "tts_characters",
    granularity: "day",
    from: summary.period_start,
    to: summary.period_end,
  });
  return voiceUsageFromSources(summary, history);
}
