/**
 * Contratos del slice orders (wire snake_case 1:1 con axi-server, §5).
 * Fuente del contrato REST: Schemas["OrderDto"] (schema.d.ts generado).
 * Los eventos WS viven en core/realtime/events.ts (core no importa de modules).
 */
import type { Schemas } from "@/core/api/types";
import type { OrderRealtimeSummary, OrderStatus } from "@/core/realtime/events";

export type { OrderStatus };

export type OrderDTO = Schemas["OrderDto"];
export type OrderItemDTO = OrderDTO["items"][number];
export type OrderPaymentDTO = OrderDTO["payments"][number];
export type OrderStatsDTO = Schemas["OrderStatsDto"];
export type OrderEventDTO = Schemas["OrderEventsDto"]["data"][number];
export type OrderNotificationSettingsDTO = Schemas["OrderNotificationSettingsDto"];
export type ConversationUsageDTO = Schemas["ConversationUsageDto"];

export type OrderActorType = "user" | "ai_agent";
export type PaymentStatus = OrderPaymentDTO["status"];

export type ListOrdersParams = {
  status?: OrderStatus;
  contact_id?: string;
  conversation_id?: string;
  created_by_type?: OrderActorType;
  created_from?: string;
  created_to?: string;
  search?: string;
  sort_by?: "created_at" | "updated_at" | "order_number" | "total_cents";
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export type CreateOrderDTO = Schemas["CreateOrderDto"];
export type UpdateOrderDTO = Schemas["UpdateOrderDto"];
export type ReportPaymentDTO = Schemas["RegisterPaymentDto"];
export type ReviewPaymentDTO = Schemas["VerifyPaymentDto"];
export type TransitionOptions = { notify_customer?: boolean };

/**
 * Forma que consumen tarjetas kanban y tabla. El mapeo DTO→Row vive en
 * `mapOrderToRow` (nunca disperso en componentes).
 */
export type OrderRow = {
  id: string;
  order_number: number | null;
  status: OrderStatus;
  contact_id: string;
  contact_name: string;
  conversation_id: string | null;
  total_cents: number;
  currency: string;
  created_by_type: OrderActorType;
  /** Algún pago con comprobante adjunto */
  has_payment_proof: boolean;
  /** Algún pago en `reported` pendiente de verificación humana */
  pending_payment: boolean;
  items_count: number;
  created_at: string;
  /** Row hidratada solo desde un evento WS: se completa con re-fetch */
  partial?: boolean;
};

export function mapOrderToRow(dto: OrderDTO): OrderRow {
  return {
    id: dto.id,
    order_number: dto.order_number,
    status: dto.status,
    contact_id: dto.contact_id,
    contact_name: dto.contact.full_name ?? "Cliente",
    conversation_id: dto.conversation_id,
    total_cents: dto.total_cents,
    currency: dto.currency,
    created_by_type: dto.created_by_type,
    has_payment_proof: dto.payments.some((payment) => payment.attachment_id !== null),
    pending_payment: dto.payments.some((payment) => payment.status === "reported"),
    items_count: dto.items.length,
    created_at: dto.created_at,
  };
}

/** Row provisional desde el resumen de un evento WS (sin items/payments). */
export function mapSummaryToRow(summary: OrderRealtimeSummary): OrderRow {
  return {
    id: summary.order_id,
    order_number: summary.order_number,
    status: summary.status,
    contact_id: summary.contact_id,
    contact_name: "Cliente",
    conversation_id: summary.conversation_id,
    total_cents: summary.total_cents,
    currency: summary.currency,
    created_by_type: summary.created_by_type,
    has_payment_proof: false,
    pending_payment: false,
    items_count: 0,
    created_at: new Date().toISOString(),
    partial: true,
  };
}

/** Formato de dinero del panel — util transversal en `core/lib/format`. */
export { formatMoney } from "@/core/lib/format";

/** Número visible del pedido (consecutivo por tenant; drafts aún no tienen). */
export function orderNumberLabel(orderNumber: number | null): string {
  return orderNumber !== null ? `#${String(orderNumber).padStart(4, "0")}` : "Borrador";
}
