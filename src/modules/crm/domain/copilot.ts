import type { Schemas } from "@/core/api/types";

/**
 * Contratos del copiloto IA (endpoints `ai/summary|next-best-action|
 * draft-followup` de contactos y `ai/summary` de pipelines; permiso
 * crm:copilot). Cada llamada consume tokens del tenant salvo `cached: true`
 * (TTL 10 min). Throttle 10/min/tenant (429 + Retry-After) y posible
 * `usage/limit_exceeded`.
 */

export type CopilotSummaryDTO = Schemas["CopilotSummaryDto"];
export type CopilotActionDTO = Schemas["CopilotActionDto"];
export type CopilotDraftDTO = Schemas["CopilotDraftDto"];
export type CopilotPipelineDTO = Schemas["CopilotPipelineDto"];
export type CopilotUrgency = CopilotActionDTO["urgency"];

export const COPILOT_URGENCY_LABELS: Record<CopilotUrgency, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};
