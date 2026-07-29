/**
 * Contratos del slice dashboard (wire snake_case 1:1 con axi-server, §5).
 * El dashboard NO tiene endpoint agregado propio: compone stats de varios
 * slices (orders, inbox/conversations, contacts, usage, channels). Cada DTO se
 * re-exporta de `Schemas` (schema.d.ts generado). Los eventos WS viven en
 * core/realtime/events.ts (core no importa de modules).
 */
import type { Schemas } from "@/core/api/types";

export type DashboardPeriod = "today" | "7d" | "30d";

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
};

/** Ventas — GET /orders/stats (`orders:read`). */
export type OrderStatsDTO = Schemas["OrderStatsDto"];
/** Atención — GET /inbox/counts (`conversations:read`). */
export type InboxCountsDTO = Schemas["InboxCountsDto"];
/** Flujo de conversaciones — GET /inbox/stats (`conversations:read`). */
export type ConversationStatsDTO = Schemas["ConversationStatsDto"];
/** Clientes nuevos — GET /contacts/stats (`contacts:read`). */
export type ContactStatsDTO = Schemas["ContactStatsDto"];
/** Top productos — GET /orders/top-products (`orders:read`). */
export type TopProductsDTO = Schemas["TopProductsDto"];
/** Consumo del plan — GET /usage/summary (`usage:read`). */
export type UsageSummaryDTO = Schemas["UsageSummaryDto"];
export type UsageMetric = UsageSummaryDTO["metrics"][number];
/** Estado del sistema — GET /channels (`channels:read`). */
export type ChannelListDTO = Schemas["ChannelListDto"];

/** Métrica del plan que mostramos como barra (las demás no son legibles). */
export const HIGHLIGHTED_USAGE_METRICS = [
  "ai_requests",
  "messages_sent",
  "messages_received",
] as const;

export const USAGE_METRIC_LABELS: Record<string, string> = {
  ai_tokens_input: "Tokens IA (entrada)",
  ai_tokens_output: "Tokens IA (salida)",
  ai_requests: "Solicitudes IA",
  messages_sent: "Mensajes enviados",
  messages_received: "Mensajes recibidos",
  template_sent: "Plantillas enviadas",
  external_api_calls: "Llamadas externas",
  conversations_active: "Conversaciones activas",
  storage_bytes: "Almacenamiento",
};

// La fuente canónica de los labels de ciclo de vida es el slice crm (F1).
export { CONTACT_STAGE_LABELS } from "@/modules/crm/domain/enums";
