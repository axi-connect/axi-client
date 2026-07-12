import { http } from "@/core/services/http";
import type { Params } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  ConversationUsageDTO,
  CreateOrderDTO,
  ListOrdersParams,
  OrderDTO,
  OrderEventDTO,
  OrderStatsDTO,
  TransitionOptions,
  UpdateOrderDTO,
} from "@/modules/orders/domain/order";

/**
 * Adapter HTTP del slice orders → `/orders` (F11). Las transiciones aceptan
 * `notify_customer` (default true en backend; el despacho real igual exige
 * plantilla habilitada en /orders/notification-settings).
 */
export function listOrders(params: ListOrdersParams): Promise<Schemas["OrdersListDto"]> {
  return http.get<Schemas["OrdersListDto"]>("/orders", params as Params);
}

export function getOrder(id: string): Promise<OrderDTO> {
  return http.get<OrderDTO>(`/orders/${id}`);
}

/** KPIs + conteos por estado del tablero. counts_by_status va sin período. */
export function getOrderStats(period: "today" | "7d" | "30d" = "7d"): Promise<OrderStatsDTO> {
  return http.get<OrderStatsDTO>("/orders/stats", { period });
}

/** Timeline asc por created_at (incluye avisos al cliente enviados/omitidos). */
export function getOrderEvents(id: string): Promise<{ data: OrderEventDTO[] }> {
  return http.get<{ data: OrderEventDTO[] }>(`/orders/${id}/events`);
}

export function createOrder(dto: CreateOrderDTO): Promise<OrderDTO> {
  return http.post<OrderDTO>("/orders", dto);
}

/** Solo draft|pending (backend: orders/not_editable en otros estados). */
export function updateOrder(id: string, dto: UpdateOrderDTO): Promise<OrderDTO> {
  return http.patch<OrderDTO>(`/orders/${id}`, dto);
}

export function confirmOrder(id: string, options: TransitionOptions = {}): Promise<OrderDTO> {
  return http.post<OrderDTO>(`/orders/${id}/confirm`, options);
}

export function cancelOrder(
  id: string,
  reason?: string,
  options: TransitionOptions = {},
): Promise<OrderDTO> {
  return http.post<OrderDTO>(`/orders/${id}/cancel`, { reason, ...options });
}

export function fulfillOrder(id: string, options: TransitionOptions = {}): Promise<OrderDTO> {
  return http.post<OrderDTO>(`/orders/${id}/fulfill`, options);
}

/** Costo/tokens IA de la conversación de origen (permiso conversations:read). */
export function getConversationUsage(conversationId: string): Promise<ConversationUsageDTO> {
  return http.get<ConversationUsageDTO>(`/usage/conversations/${conversationId}`);
}
