import type { Schemas } from "@/core/api/types";

/**
 * Intenciones (`/ai-intentions`): clasifican los mensajes entrantes y
 * determinan qué instrucciones/tools carga el agente. Las `is_system`
 * son plantillas inmutables.
 */
export type IntentionDTO = Schemas["IntentionDto"];
export type CreateIntentionDTO = Schemas["CreateIntentionDto"];
export type UpdateIntentionDTO = Schemas["UpdateIntentionDto"];

export type IntentionType = IntentionDTO["type"];
export type IntentionPriority = IntentionDTO["priority"];

export const INTENTION_TYPE_LABELS: Record<IntentionType, string> = {
  sales: "Ventas",
  support: "Soporte",
  technical: "Técnico",
  onboarding: "Onboarding",
  follow_up: "Seguimiento",
};

export const INTENTION_PRIORITY_LABELS: Record<IntentionPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};
