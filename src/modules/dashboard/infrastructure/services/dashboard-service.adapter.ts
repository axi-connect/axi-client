import { http } from "@/core/services/http";
import type {
  ChannelListDTO,
  ContactStatsDTO,
  ConversationStatsDTO,
  DashboardPeriod,
  InboxCountsDTO,
  OrderStatsDTO,
  TopProductsDTO,
  UsageSummaryDTO,
} from "@/modules/dashboard/domain/dashboard";

/**
 * Adapter del dashboard: una función por fuente. NO hay endpoint agregado; el
 * store las orquesta en paralelo pidiendo solo las permitidas por RBAC. Todas
 * autentican por defecto (singleton `http`, §7).
 */

/** Ventas del período + conteos por estado. */
export function getOrderStats(period: DashboardPeriod): Promise<OrderStatsDTO> {
  return http.get<OrderStatsDTO>("/orders/stats", { period });
}

/** Contadores del inbox en vivo (estado actual, sin período). */
export function getInboxCounts(): Promise<InboxCountsDTO> {
  return http.get<InboxCountsDTO>("/inbox/counts");
}

/** Flujo de conversaciones: nuevas/resueltas + serie + reparto IA/humano. */
export function getConversationStats(period: DashboardPeriod): Promise<ConversationStatsDTO> {
  return http.get<ConversationStatsDTO>("/inbox/stats", { period });
}

/** Clientes nuevos por período + reparto por etapa + serie. */
export function getContactStats(period: DashboardPeriod): Promise<ContactStatsDTO> {
  return http.get<ContactStatsDTO>("/contacts/stats", { period });
}

/** Productos más vendidos del período. */
export function getTopProducts(period: DashboardPeriod, limit = 5): Promise<TopProductsDTO> {
  return http.get<TopProductsDTO>("/orders/top-products", { period, limit });
}

/** Consumo del plan en vivo (Redis O(1) en backend) + flag ai_paused. */
export function getUsageSummary(): Promise<UsageSummaryDTO> {
  return http.get<UsageSummaryDTO>("/usage/summary", { period: "billing_cycle" });
}

/** Estado de los canales (para la tarjeta de salud del sistema). */
export function getChannels(): Promise<ChannelListDTO> {
  return http.get<ChannelListDTO>("/channels");
}
