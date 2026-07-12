/**
 * Contrato de tiempo real (Socket.IO) con el backend axi-server.
 *
 * Dos namespaces:
 * - `/inbox`    — operadores: eventos de conversación/uso/notificaciones + comandos con ack.
 * - `/channels` — administración de canales: QR de WhatsApp Web y estados (solo lectura).
 *
 * El token JWT viaja en `handshake.auth.token`. Rooms automáticos:
 * `company_{id}` (ambos ns) y `user_{id}` (`/inbox`); el room
 * `conversation_{id}` requiere `inbox.join_conversation`.
 *
 * Estos tipos son la única fuente de verdad del wire WS del frontend
 * (core no importa de modules; los slices importan de aquí).
 */
import type { Schemas } from "@/core/api/types";

// ---------------------------------------------------------------------------
// Payloads compartidos
// ---------------------------------------------------------------------------

export type ConversationStatus = Schemas["ConversationDto"]["status"];
export type ConversationMode = Schemas["ConversationDto"]["mode"];
export type ChannelStatus = Schemas["ChannelDto"]["status"];

/** Forma común de los eventos de handoff (escalated/claimed/taken_over/returned_to_ai/status_changed). */
export type ConversationHandoffEvent = {
  conversation_id: string;
  company_id: string;
  status: ConversationStatus;
  mode: ConversationMode;
  assigned_user_id: string | null;
  actor_user_id: string | null;
  note?: string;
  reason?: string;
  resolved?: boolean;
};

export type ConversationCreatedEvent = {
  conversation_id: string;
  company_id: string;
};

export type MessageReceivedEvent = {
  conversation_id: string;
  message_id: string;
  company_id: string;
  content_type: Schemas["EnqueuedMessageDto"]["content_type"];
};

/**
 * F9.1: mensaje OUTBOUND persistido (queued) con la vista COMPLETA — el inbox
 * pinta en vivo replies de IA, quick actions, system y otros operadores sin
 * round-trip. `message_sent` sigue siendo la confirmación de envío real.
 */
export type MessageCreatedEvent = {
  conversation_id: string;
  company_id: string;
  message: Schemas["ConversationMessagesDto"]["data"][number];
};

export type MessageSentEvent = {
  conversation_id: string;
  message_id: string;
  company_id: string;
  content_type: Schemas["EnqueuedMessageDto"]["content_type"];
};

/** F9.1: hoy el backend lo emite solo con `failed` (markFailed del outbound). */
export type MessageStatusEvent = {
  conversation_id: string;
  message_id: string;
  company_id: string;
  status: Schemas["EnqueuedMessageDto"]["status"];
  error_code?: string;
};

export type TypingEvent = {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
};

export type IntentDetectedEvent = {
  conversation_id: string;
  company_id: string;
  intention_id: string;
  code: string;
  confidence: number;
};

export type SlaBreachedEvent = {
  conversation_id: string;
  company_id: string;
  sla_seconds: number;
  queued_at: string;
};

export type FirewallBlockedEvent = {
  company_id: string;
  conversation_id: string | null;
  contact_id: string | null;
  channel_identity_id: string | null;
  risk_score: number;
};

export type UsageUpdatedEvent = {
  company_id: string;
  metric: string;
  quantity: number;
  period_start: string;
};

export type UsageAlertEvent = {
  alert_id: string;
  company_id: string;
  usage_limit_id: string;
  metric: string;
  period: string;
  action: string;
  threshold_pct: number;
  value_at_trigger: number;
  limit_value: number;
  period_start: string;
};

export type NotificationCreatedEvent = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Pedidos (F11) — payload resumen SIN items/payments: al recibir un evento,
// el panel re-consulta GET /orders/:id si necesita el detalle.
// ---------------------------------------------------------------------------

export type OrderStatus = Schemas["OrderDto"]["status"];

export type OrderRealtimeSummary = {
  company_id: string;
  order_id: string;
  order_number: number | null;
  /** null en pedidos manuales sin conversación */
  conversation_id: string | null;
  contact_id: string;
  status: OrderStatus;
  total_cents: number;
  currency: string;
  created_by_type: "user" | "ai_agent";
};

/** El pedido sale de draft (lo tomó la IA o lo creó el operador). */
export type OrderCreatedEvent = OrderRealtimeSummary;

/** confirm / cancel / fulfill / verify / reject de pago. */
export type OrderStatusChangedEvent = OrderRealtimeSummary & {
  previous_status: OrderStatus;
  notification_key?: "confirmed" | "paid" | "fulfilled" | "cancelled" | "payment_rejected";
  notify_customer?: boolean;
};

/** Comprobante/reporte de pago (IA o manual). */
export type OrderPaymentReportedEvent = OrderRealtimeSummary & { payment_id: string };

/** Edición de items/notas/descuento en draft|pending. */
export type OrderUpdatedEvent = OrderRealtimeSummary;

export type ChannelQrCodeEvent = {
  channel_id: string;
  company_id: string;
  qr: string | null;
  /** Data URL lista para `<img src>`; puede venir null si solo hay pairing code. */
  qr_image: string | null;
  pairing_code: string | null;
};

export type ChannelStatusChangedEvent = {
  channel_id: string;
  company_id: string;
  status: ChannelStatus;
  phone_number?: string | null;
};

export type ChannelSessionFailedEvent = {
  channel_id: string;
  company_id: string;
  reason: string;
};

// ---------------------------------------------------------------------------
// Eventos server → client
// ---------------------------------------------------------------------------

/** Namespace `/inbox`. Incluye usage.* y notification.* (base para módulos futuros). */
export type InboxServerEvents = {
  "conversation.created": (payload: ConversationCreatedEvent) => void;
  "conversation.message_received": (payload: MessageReceivedEvent) => void;
  "conversation.message_created": (payload: MessageCreatedEvent) => void;
  "conversation.message_sent": (payload: MessageSentEvent) => void;
  "conversation.message_status": (payload: MessageStatusEvent) => void;
  "conversation.typing": (payload: TypingEvent) => void;
  "conversation.intent_detected": (payload: IntentDetectedEvent) => void;
  "conversation.escalated": (payload: ConversationHandoffEvent) => void;
  "conversation.claimed": (payload: ConversationHandoffEvent) => void;
  "conversation.taken_over": (payload: ConversationHandoffEvent) => void;
  "conversation.returned_to_ai": (payload: ConversationHandoffEvent) => void;
  "conversation.status_changed": (payload: ConversationHandoffEvent) => void;
  "conversation.sla_breached": (payload: SlaBreachedEvent) => void;
  "firewall.blocked": (payload: FirewallBlockedEvent) => void;
  "order.created": (payload: OrderCreatedEvent) => void;
  "order.status_changed": (payload: OrderStatusChangedEvent) => void;
  "order.payment_reported": (payload: OrderPaymentReportedEvent) => void;
  "order.updated": (payload: OrderUpdatedEvent) => void;
  "usage.updated": (payload: UsageUpdatedEvent) => void;
  "usage.alert": (payload: UsageAlertEvent) => void;
  "notification.created": (payload: NotificationCreatedEvent) => void;
};

/** Namespace `/channels` — solo lectura (sin comandos). */
export type ChannelsServerEvents = {
  "channel.qr_code": (payload: ChannelQrCodeEvent) => void;
  "channel.status_changed": (payload: ChannelStatusChangedEvent) => void;
  "channel.session_failed": (payload: ChannelSessionFailedEvent) => void;
};

// ---------------------------------------------------------------------------
// Comandos client → server (namespace /inbox) con ack tipado
// ---------------------------------------------------------------------------

/** Ack estándar de todo comando. Un error de negocio jamás desconecta el socket. */
export type WsAck<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type JoinConversationPayload = { conversation_id: string };
export type ClaimPayload = { conversation_id: string };
export type ReturnToAiPayload = { conversation_id: string; note?: string };
export type CloseConversationPayload = {
  conversation_id: string;
  resolved?: boolean;
  reason?: string;
};
export type SendMessagePayload = { conversation_id: string } & Schemas["SendMessageDto"];
export type TypingPayload = { conversation_id: string; is_typing: boolean };

export type InboxCommands = {
  "inbox.join_conversation": (
    payload: JoinConversationPayload,
    ack: (res: WsAck) => void,
  ) => void;
  "inbox.leave_conversation": (
    payload: JoinConversationPayload,
    ack: (res: WsAck<null>) => void,
  ) => void;
  "inbox.claim": (
    payload: ClaimPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.takeover": (
    payload: ClaimPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.return_to_ai": (
    payload: ReturnToAiPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.close": (
    payload: CloseConversationPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.send_message": (
    payload: SendMessagePayload,
    ack: (res: WsAck<Schemas["EnqueuedMessageDto"]>) => void,
  ) => void;
  "inbox.mark_read": (
    payload: JoinConversationPayload,
    ack: (res: WsAck<null>) => void,
  ) => void;
  "inbox.typing": (payload: TypingPayload, ack: (res: WsAck<null>) => void) => void;
};

/** `/channels` no acepta comandos. */
export type ChannelsCommands = Record<string, never>;

// ---------------------------------------------------------------------------
// Mapa de namespaces
// ---------------------------------------------------------------------------

export const REALTIME_NAMESPACES = {
  inbox: "inbox",
  channels: "channels",
} as const;

export type RealtimeNamespace = (typeof REALTIME_NAMESPACES)[keyof typeof REALTIME_NAMESPACES];

export type ServerEventsOf<N extends RealtimeNamespace> = N extends "inbox"
  ? InboxServerEvents
  : ChannelsServerEvents;

export type ClientEventsOf<N extends RealtimeNamespace> = N extends "inbox"
  ? InboxCommands
  : ChannelsCommands;
